import Discord, {Constants} from 'discord.js'
import defaults from '../defaults'
import {applyToClass, mergeDefault, timestamp} from '../util'
import type {ActivityFlags} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Emoji, Guild, User} from '.'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {ActivityTypes} = Constants

export class Presence extends Discord.Presence {
  static applyToClass = applyToClass(Presence)
  activities!: Activity[]
  guild!: Guild | null
  readonly user!: User | null
  equals!: (presence: Presence) => boolean

  constructor(client: Client, data?: Partial<Data.Presence>) {
    super(client, mergeDefault(defaults.presence, data))
  }

  toData(): Data.Presence {
    return {
      user: this.user!.toData(),
      game: null,
      status: this.status,
      activities: this.activities.map(activity => activity.toData()),
      client_status: this.clientStatus ?? {},
      premium_since: this.member?.premiumSinceTimestamp == null ? undefined : timestamp(this.member.premiumSinceTimestamp),
      nick: this.member?.nickname
    }
  }
}

export class Activity extends Discord.Activity {
  emoji!: Emoji | null
  // Discord.js' types are wrong
  flags!: Readonly<ActivityFlags>
  equals!: (activity: Activity) => boolean

  constructor(presence: Presence, data?: Partial<Data.Activity>) {
    super(presence, mergeDefault(defaults.activity, data))
  }

  toData(): Data.Activity {
    return {
      name: this.name,
      type: ActivityTypes.indexOf(this.type),
      url: this.url,
      created_at: this.createdTimestamp,
      timestamps: this.timestamps ? {
        start: this.timestamps.start ? timestamp(this.timestamps.start) : undefined,
        end: this.timestamps.end ? timestamp(this.timestamps.end) : undefined
      } : {},
      application_id: this.applicationID ?? undefined,
      details: this.details,
      state: this.state,
      emoji: this.emoji?.toData() as Data.ActivityEmoji,
      party: this.party ? {...this.party, id: this.party.id ?? undefined} : undefined,
      assets: this.assets ? {
        large_image: this.assets.largeImage ?? undefined,
        large_text: this.assets.largeText ?? undefined,
        small_image: this.assets.smallImage ?? undefined,
        small_text: this.assets.smallText ?? undefined
      } : undefined,
      flags: this.flags.bitfield
    }
  }
}
