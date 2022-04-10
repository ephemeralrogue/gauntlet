import Discord, {Collection, Constants} from 'discord.js'
import {TypeError} from '../../node_modules/discord.js/src/errors'
import {Presence} from './Presence'
import type {ActivityType, RichPresenceAssets, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Override} from '../util'
import type {Activity, Guild, GuildMember, User} from '.'

declare module 'discord.js' {
  class ClientPresence extends Presence {
    set(presence: _PresenceData): Promise<this>
    _parse({status, afk, activity}: _PresenceData): Promise<ParsedStatusUpdate>
  }
}

// Discord.js returns a different version of the status update data
type ParsedStatusUpdate = Override<Data.StatusUpdate, {
  game: Override<Omit<Data.Activity, 'created_at'>, {
    type: Data.ActivityType | ActivityType
    name?: string
    timestamps?: {
      start?: Data.Timestamp | Date | null
      end?: Data.Timestamp | Date | null
    } | null
    emoji?: Override<Data.ActivityEmoji, {id?: Snowflake | null}> | null
    party?: Override<Data.ActivityParty, {id?: string | null}> | null
    assets?: Data.ActivityAssets | RichPresenceAssets | null
  }> | null
}>

export interface PresenceData extends Discord.PresenceData {
  activity?: Discord.PresenceData['activity'] & {
    application?: {id?: string} | string
    assets?: {
      largeText?: string
      smallText?: string
      largeImage?: string
      smallImage?: string
    }
    details?: string
    state?: string
    timestamps?: Data.ActivityTimestamps
    party?: Data.ActivityParty
  }
  since?: number
}

type _PresenceData = PresenceData

// TODO: mock WebSocketManager#broadcast (in ClientPresence#set)
export class ClientPresence extends Presence.applyToClass(Discord.ClientPresence) {
  activities!: Activity[]
  client!: Client
  guild!: Guild | null
  readonly member!: GuildMember | null
  readonly user!: User | null

  // eslint-disable-next-line complexity -- what it is in Discord.js
  async _parse({status, since, afk, activity}: PresenceData): Promise<ParsedStatusUpdate> {
    const applicationID = (activity?.application as {id?: string} | undefined)?.id ??
      activity?.application as string | undefined ?? null
    const assets = new Collection<string, Snowflake>()
    if (activity) {
      if (typeof activity.name != 'string') throw new TypeError('INVALID_TYPE', 'name', 'string')
      if (activity.type === undefined) activity.type = 0
      if (activity.assets && applicationID) {
        try {
          const a = this.client._application._assets
          a.forEach(asset => assets.set(asset.name, asset.id))
        } catch {}
      }
    }

    const packet: ParsedStatusUpdate | null = {
      afk: afk === undefined ? false : afk,
      since: since ?? null,
      status: status ?? this.status,
      game: activity
        ? {
          type: activity.type!,
          name: activity.name,
          url: activity.url,
          details: activity.details ?? undefined,
          state: activity.state ?? undefined,
          assets: activity.assets
            ? {
              large_text: activity.assets.largeText ?? undefined,
              small_text: activity.assets.smallText ?? undefined,
              large_image: assets.get(activity.assets.largeImage!) ?? activity.assets.largeImage,
              small_image: assets.get(activity.assets.smallImage!) ?? activity.assets.smallImage
            }
            : undefined,
          timestamps: activity.timestamps ?? undefined,
          party: activity.party ?? undefined,
          application_id: applicationID ?? undefined
        }
        : null
    }

    if ((status || afk !== undefined || since !== undefined) && !activity) {
      packet.game = (this.activities[0] as Activity | undefined)
        ? {...this.activities[0], flags: this.activities[0].flags.bitfield}
        : null
    }

    if (packet.game) {
      packet.game.type = typeof packet.game.type == 'number'
        ? packet.game.type
        : Constants.ActivityTypes.indexOf(packet.game.type)
    }

    return packet
  }
}
