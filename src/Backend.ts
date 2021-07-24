import {Collection} from 'discord.js'
import * as defaults from './defaults'
import * as endpoints from './endpoints'
import {toCollection} from './utils'
import type {
  DMChannel,
  FullApplication,
  GatewayDispatchEvents,
  GatewayDispatchPayload,
  Guild,
  GuildMember,
  IntentBits,
  PartialDeep,
  Snowflake,
  SnowflakeCollection,
  Sticker,
  User,
  VoiceRegion
} from './types'
import type {Channels, Guilds, OAuth2, Voice} from './endpoints'
import {defaultVoiceRegions} from './defaults'

interface API {
  readonly channels: Channels
  readonly guilds: Guilds
  readonly oauth2: OAuth2
  readonly voice: Voice
}

export class Backend {
  /** @internal */
  readonly applications: SnowflakeCollection<FullApplication> = new Collection()
  /** @internal */
  readonly dmChannels: SnowflakeCollection<DMChannel> = new Collection()
  /** @internal */
  readonly guilds: SnowflakeCollection<Guild> = new Collection()
  /** @internal */
  readonly standardStickers: SnowflakeCollection<Sticker> = new Collection()
  /** @internal */
  readonly users: SnowflakeCollection<User> = new Collection()
  /** @internal */
  readonly voiceRegions: Collection<string, VoiceRegion> =
    defaultVoiceRegions.clone()

  /** @internal */
  get allUsers(): SnowflakeCollection<User> {
    // eslint-disable-next-line unicorn/prefer-spread -- not array
    return this.users.concat(
      toCollection(this.applications.map(({bot}) => bot))
    )
  }

  addApplication(application?: PartialDeep<FullApplication>): FullApplication {
    const app = defaults.fullApplication(application)
    this.applications.set(app.id, app)
    if (app.owner && !this.users.has(app.owner.id))
      this.users.set(app.owner.id, app.owner)
    return app
  }

  addGuildWithBot(
    guild?: PartialDeep<Guild>,
    botGuildMember?: PartialDeep<Omit<GuildMember, 'id'>>,
    application: PartialDeep<FullApplication> = this.addApplication()
  ): this {
    let app: FullApplication
    if (application.id !== undefined && this.applications.has(application.id)) {
      app = defaults.fullApplication(application)
      this.applications.set(app.id, app)
    } else app = this.addApplication(application)

    const g = defaults.guild(guild)
    if (!g.members.has(app.bot.id)) {
      g.members.set(
        app.bot.id,
        defaults.guildMember({...botGuildMember, id: app.bot.id})
      )
    }
    this.guilds.set(g.id, g)

    return this
  }
}

// Extract<GatewayDispatchPayload, {t: T}>['d'] results in never for some reason
type ExtractGatewayPayload<
  E extends GatewayDispatchEvents,
  P extends GatewayDispatchPayload = GatewayDispatchPayload
> = P extends {t: infer T} ? (T extends E ? P['d'] : never) : never
export type EmitPacket = <T extends GatewayDispatchEvents>(
  t: T,
  d: ExtractGatewayPayload<T>
) => void

export type HasIntents = (intents: IntentBits) => boolean

// TODO: make endpoints a proxy https://github.com/discordjs/discord.js/pull/5256
export const api = (
  backend: Backend,
  applicationId: Snowflake,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
): API => ({
  channels: endpoints.channels(backend, applicationId, hasIntents, emitPacket),
  guilds: endpoints.guilds(backend, applicationId, hasIntents, emitPacket),
  oauth2: endpoints.oauth2(backend, applicationId),
  voice: endpoints.voice(backend)
})
