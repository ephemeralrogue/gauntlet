import {Collection} from 'discord.js'
import * as defaults from './defaults'
import * as endpoints from './endpoints'
import {clone, filterMap, resolveCollectionId, toCollection} from './utils'
import type {Channels, Guilds, OAuth2, Voice} from './endpoints'
import type {
  DMChannel,
  FullApplication,
  GatewayDispatchEvents,
  GatewayDispatchPayload,
  Guild,
  GuildMember,
  IntentBits,
  Message,
  PartialDeep,
  Snowflake,
  SnowflakeCollection,
  StandardSticker,
  User,
  VoiceRegion
} from './types'
import type {CollectionResolvableId} from './utils'

interface API {
  readonly channels: Channels
  readonly guilds: Guilds
  readonly oauth2: OAuth2
  readonly voice: Voice
}

const userEntry = (id: Snowflake): [Snowflake, User] => [
  id,
  defaults.user({id})
]

export class Backend {
  /** @internal */
  readonly applications: SnowflakeCollection<FullApplication> = new Collection()
  /** @internal */
  readonly dmChannels: SnowflakeCollection<DMChannel> = new Collection()
  /** @internal */
  readonly guilds: SnowflakeCollection<Guild> = new Collection()
  /** @internal */
  readonly standardStickers: SnowflakeCollection<StandardSticker> =
    new Collection()

  /** @internal */
  readonly users: SnowflakeCollection<User> = new Collection()
  /** @internal */
  readonly voiceRegions: Collection<string, VoiceRegion> =
    defaults.defaultVoiceRegions.clone()

  constructor({
    applications,
    dmChannels,
    guilds,
    standardStickers,
    users,
    voiceRegions
  }: {
    applications?: CollectionResolvableId<FullApplication>
    dmChannels?: CollectionResolvableId<DMChannel>
    guilds?: CollectionResolvableId<Guild>
    standardStickers?: CollectionResolvableId<StandardSticker>
    users?: CollectionResolvableId<User>
    voiceRegions?: CollectionResolvableId<VoiceRegion>
  } = {}) {
    this.dmChannels = resolveCollectionId<DMChannel>(
      dmChannels,
      defaults.dmChannel
    )
    this.guilds = resolveCollectionId<Guild>(guilds, defaults.guild)
    this.standardStickers = resolveCollectionId<StandardSticker>(
      standardStickers,
      defaults.standardSticker
    )
    this.voiceRegions =
      voiceRegions instanceof Collection
        ? voiceRegions.mapValues(defaults.voiceRegion)
        : defaults.voiceRegions(voiceRegions)

    const resolvedApps = resolveCollectionId<FullApplication>(
      applications,
      defaults.fullApplication
    )
    this.applications = resolvedApps

    const resolvedUsers = resolveCollectionId<User>(users, defaults.user)
    this.users = resolvedUsers.concat(
      new Collection([
        // DM channel recipients
        ...this.dmChannels
          .filter(({recipient_id}) => !resolvedUsers.has(recipient_id))
          .map(({recipient_id}) => userEntry(recipient_id)),
        // Application owners
        ...resolvedApps
          .filter(
            ({owner_id}) =>
              owner_id !== undefined && !resolvedUsers.has(owner_id)
          )
          .map(({owner_id}) => userEntry(owner_id!))
      ])
    )

    for (const [, message] of this.dmChannels.flatMap(({messages}) => messages))
      this.#addMissingFromMessage(message)
    for (const [, guild] of this.guilds) this.#addMissingFromGuild(guild)
  }

  /** @internal */
  get allUsers(): SnowflakeCollection<User> {
    return this.users.concat(
      toCollection(this.applications.map(({bot}) => bot))
    )
  }

  addApplication(application?: PartialDeep<FullApplication>): FullApplication {
    const app = defaults.fullApplication(application)
    this.applications.set(app.id, app)
    if (app.owner_id !== undefined && !this.users.has(app.owner_id))
      this.users.set(app.owner_id, defaults.user({id: app.owner_id}))
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

    const g = defaults.guild({...guild, owner_id: app.bot.id})
    if (!g.members.has(app.bot.id)) {
      g.members.set(
        app.bot.id,
        defaults.guildMember({...botGuildMember, id: app.bot.id})
      )
    }
    this.guilds.set(g.id, g)
    this.#addMissingFromGuild(g)

    return this
  }

  clone(): Backend {
    return new Backend({
      applications: clone(this.applications),
      dmChannels: clone(this.dmChannels),
      guilds: clone(this.guilds),
      standardStickers: clone(this.standardStickers),
      users: clone(this.users),
      voiceRegions: clone(this.voiceRegions)
    })
  }

  #addMissingFromMessage({
    author_id,
    application_id,
    mention_channels = [],
    stickers
  }: Message): void {
    if (!this.allUsers.has(author_id))
      this.users.set(author_id, defaults.user({id: author_id}))

    // Applications
    if (
      application_id !== undefined &&
      !this.applications.has(application_id)
    ) {
      this.applications.set(
        application_id,
        defaults.fullApplication({id: application_id})
      )
    }

    // Channels in channel mentions
    for (const {id, guild_id} of mention_channels) {
      const existing = this.guilds.get(guild_id)
      if (!existing || !existing.channels.has(id)) {
        const guild = existing ?? defaults.guild({id: guild_id})
        this.guilds.set(guild_id, {
          ...guild,
          channels: guild.channels.has(id)
            ? guild.channels
            : guild.channels.set(id, defaults.guildChannel({id}))
        })
      }
    }

    // Stickers from messages
    for (const [id, guildId] of stickers) {
      if (guildId === undefined && !this.standardStickers.has(id))
        this.standardStickers.set(id, defaults.standardSticker({id}))
    }
  }

  #addMissingFromGuild({
    application_id,
    channels,
    emojis,
    integration_ids,
    members,
    owner_id,
    presences,
    template
  }: Guild): void {
    for (const [, message] of channels.flatMap<Message>(channel =>
      'messages' in channel ? channel.messages : new Collection()
    ))
      this.#addMissingFromMessage(message)

    // Users from guild owner, emojis, members, presences, template creators, voice states
    for (const id of [
      owner_id,
      ...emojis.map(({user_id}) => user_id),
      ...members.map(m => m.id),
      ...presences.map(({user_id}) => user_id),
      ...(template ? [template.creator_id] : [])
    ])
      if (!this.users.has(id)) this.users.set(id, defaults.user({id}))

    // Applications from application_ids, integrations, webhooks
    for (const id of [
      ...(application_id === null ? [] : [application_id]),
      ...[...channels.values()].flatMap(channel =>
        'webhooks' in channel
          ? filterMap(
              channel.webhooks,
              hook => hook.application_id ?? undefined
            )
          : []
      ),
      ...integration_ids
    ]) {
      if (!this.applications.has(id))
        this.applications.set(id, defaults.fullApplication({id}))
    }
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
