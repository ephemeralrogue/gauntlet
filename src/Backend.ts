import {Collection} from 'discord.js'
import * as defaults from './defaults'
import * as endpoints from './endpoints'
import {
  resolveCollection as arrayResolveCollection,
  toCollection
} from './utils'
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

const userEntry = (id: Snowflake): [Snowflake, User] => [
  id,
  defaults.user({id})
]

type CollectionResolvable<T extends {id: unknown}> =
  | Collection<T['id'], PartialDeep<Omit<T, 'id'>>>
  | readonly PartialDeep<T>[]
  | undefined

const resolveCollection = <T extends {id: unknown}>(
  obj: CollectionResolvable<T>,
  mapper: (value: PartialDeep<T>) => T
): Collection<T['id'], T> =>
  obj instanceof Collection
    ? // PartialDeep<Omit<T, 'id'>> is assignable to PartialDeep<T>
      obj.mapValues(
        mapper as unknown as (value: PartialDeep<Omit<T, 'id'>>) => T
      )
    : arrayResolveCollection<PartialDeep<T>, Extract<T, PartialDeep<T>>, 'id'>(
        obj,
        'id',
        mapper as (value: PartialDeep<T>) => Extract<T, PartialDeep<T>>
      )

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

  constructor({
    applications,
    dmChannels,
    guilds,
    standardStickers,
    users,
    voiceRegions
  }: {
    applications?: CollectionResolvable<FullApplication>
    dmChannels?: CollectionResolvable<DMChannel>
    guilds?: CollectionResolvable<Guild>
    standardStickers?: CollectionResolvable<Sticker>
    users?: CollectionResolvable<User>
    voiceRegions?: CollectionResolvable<VoiceRegion>
  } = {}) {
    this.dmChannels = resolveCollection<DMChannel>(
      dmChannels,
      defaults.dmChannel
    )
    const resolvedGuilds = resolveCollection<Guild>(guilds, defaults.guild)
    const resolvedApps = resolveCollection<FullApplication>(
      applications,
      defaults.fullApplication
    )
    const resolvedStickers = resolveCollection<Sticker>(
      standardStickers,
      defaults.sticker
    )
    const resolvedUsers = resolveCollection<User>(users, defaults.user)

    const messages = this.guilds.flatMap(({channels}) =>
      channels.flatMap<Message>(
        channel =>
          ('messages' in channel ? channel.messages : undefined) ??
          new Collection()
      )
    )

    // eslint-disable-next-line unicorn/prefer-spread -- not array
    this.guilds = resolvedGuilds.concat(
      new Collection([
        // Channels from channel mentions in messages
        ...messages
          .array()
          .flatMap(({mention_channels}) => mention_channels ?? [])
          .filter(
            ({id, guild_id}) =>
              !resolvedGuilds.has(guild_id) ||
              !resolvedGuilds
                .get(guild_id)!
                .channels.some(channel => channel.id === id)
          )
          .map<[Snowflake, Guild]>(({id, guild_id}) => {
            const guild =
              resolvedGuilds.get(guild_id) ?? defaults.guild({id: guild_id})
            return [
              guild_id,
              {
                ...guild,
                channels: guild.channels.some(chan => chan.id === id)
                  ? guild.channels
                  : guild.channels.set(id, defaults.guildChannel({id}))
              }
            ]
          })
      ])
    )

    // eslint-disable-next-line unicorn/prefer-spread -- not array
    this.applications = resolvedApps.concat(
      new Collection([
        // Applications from application_id in messages
        ...messages
          .filter(
            (
              message
              // TODO: add refinement types for Discord.js' Collection
            ) /* : message is RequireKeys<typeof message, 'application_id'> */ =>
              message.application_id !== undefined &&
              !resolvedApps.has(message.application_id)
          )
          .map(
            ({application_id}) =>
              [
                application_id!,
                defaults.fullApplication({id: application_id})
              ] as const
          ),
        // Guild integrations, application_ids, webhooks
        ...resolvedGuilds
          .array()
          .flatMap(({application_id, channels, integration_ids}) => [
            ...(application_id === null ? [] : [application_id]),
            ...channels
              .array()
              .flatMap(chan =>
                'webhooks' in chan
                  ? chan.webhooks.map(hook => hook.application_id)
                  : []
              ),
            ...integration_ids
          ])
          .filter((id): id is Snowflake => id !== null && !resolvedApps.has(id))
          .map(id => [id, defaults.fullApplication({id})] as const)
      ])
    )

    // eslint-disable-next-line unicorn/prefer-spread -- not array
    this.standardStickers = resolvedStickers.concat(
      new Collection(
        messages
          .array()
          .flatMap(({stickers}) => stickers)
          .filter(
            ([id, guildId]) =>
              guildId === undefined && !resolvedStickers.has(id)
          )
          .map(([id]) => [id, defaults.sticker({id})] as const)
      )
    )

    // eslint-disable-next-line unicorn/prefer-spread -- not array
    this.users = resolvedUsers.concat(
      new Collection([
        // Message authors
        ...messages
          .filter(({author_id}) => !resolvedUsers.has(author_id))
          .map(({author_id}) => userEntry(author_id)),
        // Users from guild emojis, members, presences, template creators, voice states
        ...resolvedGuilds
          .array()
          .flatMap(({emojis, members, presences, template}) => [
            ...emojis
              .filter(({user_id}) => !resolvedUsers.has(user_id))
              .map(({user_id}) => userEntry(user_id)),
            ...members
              .filter(({id}) => !resolvedUsers.has(id))
              .map(({id}) => userEntry(id)),
            ...presences
              .filter(({user_id}) => !resolvedUsers.has(user_id))
              .map(({user_id}) => userEntry(user_id)),
            ...(template && !resolvedUsers.has(template.creator_id)
              ? [userEntry(template.creator_id)]
              : [])
          ]),
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

    this.voiceRegions =
      voiceRegions instanceof Collection
        ? voiceRegions.mapValues(defaults.voiceRegion)
        : defaults.voiceRegions(voiceRegions)
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

  clone(): Backend {
    return new Backend({
      applications: this.applications.clone(),
      dmChannels: this.dmChannels.clone(),
      guilds: this.guilds.clone(),
      standardStickers: this.standardStickers.clone(),
      users: this.users.clone(),
      voiceRegions: this.voiceRegions.clone()
    })
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
