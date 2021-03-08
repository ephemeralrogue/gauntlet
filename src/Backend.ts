import {Collection} from 'discord.js'
import * as defaults from './defaults'
import * as endpoints from './endpoints'
import {resolveCollection} from './utils'
import type {
  APIUser,
  GatewayDispatchEvents,
  GatewayDispatchPayload,
  GatewayIntentBits,
  Snowflake
} from 'discord-api-types/v8'
import type {Data, DataGuild, ResolvedClientData, ResolvedData} from './types'
import type {RequireKeys} from './utils'
import type {Channels, Guilds, OAuth2, Voice} from './endpoints'

interface API {
  readonly channels: Channels
  readonly guilds: Guilds
  readonly oauth2: OAuth2
  readonly voice: Voice
}

const userEntry = (id: Snowflake): [Snowflake, APIUser] => [
  id,
  defaults.user({id})
]

export class Backend {
  /*
    This is more of an internal property rather than a private one as it is
    accessed outside of this class. However, if I use @internal and
    --stripInternal, any object will be assignable to Backend due to structural
    typing. At least this way the emitted typings are accurate and users won't
    be able to access this field (without using bracket notation).
  */
  private readonly resolvedData: ResolvedData

  /**
   * Constructs a `Backend` instance.
   *
   * @param data The data for the backend. Defaults to `{}`.
   */
  constructor({
    applications,
    dm_channels,
    guilds,
    stickers,
    users,
    voice_regions
  }: Data = {}) {
    const resolvedDMChannels = resolveCollection(
      dm_channels,
      'id',
      defaults.dataDMChannel
    )
    const resolvedGuilds = resolveCollection(guilds, 'id', defaults.dataGuild)
    const resolvedApps = resolveCollection(
      applications,
      'id',
      defaults.integrationApplication
    )
    const resolvedUsers = resolveCollection(users, 'id', defaults.user)

    // eslint-disable-next-line unicorn/prefer-array-flat-map -- Collection, not array
    const messages = resolvedGuilds
      .map(({channels}) => channels.flatMap(channel => channel.messages ?? []))
      .flat()
    this.resolvedData = {
      dm_channels: resolvedDMChannels,
      guilds: new Collection([
        ...resolvedGuilds.entries(),
        // Add all channels from channel mentions in messages
        ...messages.flatMap(
          ({mention_channels}) =>
            mention_channels
              ?.filter(
                ({id, guild_id}) =>
                  !resolvedGuilds.has(guild_id) ||
                  !resolvedGuilds
                    .get(guild_id)!
                    .channels.some(channel => channel.id === id)
              )
              .map<[Snowflake, DataGuild]>(({id, guild_id}) => {
                const guild =
                  resolvedGuilds.get(guild_id) ??
                  defaults.dataGuild({id: guild_id})
                return [
                  guild_id,
                  {
                    ...guild,
                    channels: guild.channels.some(chan => chan.id === id)
                      ? guild.channels
                      : [
                          ...guild.channels.filter(chan => chan.id !== id),
                          defaults.dataGuildChannel({id})
                        ]
                  }
                ]
              }) ?? []
        )
      ]),
      integration_applications: new Collection([
        ...resolvedApps.entries(),
        // Add all applications from application_id in messages
        ...messages
          .filter(
            (
              message
            ): message is RequireKeys<typeof message, 'application_id'> =>
              message.application_id !== undefined &&
              !resolvedApps.has(message.application_id)
          )
          .map(
            ({application_id}) =>
              [
                application_id,
                defaults.integrationApplication({id: application_id})
              ] as const
          )
      ]),
      stickers: resolveCollection(stickers, 'id', defaults.sticker),
      users: new Collection([
        ...resolvedUsers.entries(),
        // Add message authors
        ...messages
          .filter(({author_id}) => !resolvedUsers.has(author_id))
          .map(({author_id}) => userEntry(author_id)),
        // Add users from guild members and guild template creators
        // eslint-disable-next-line unicorn/prefer-array-flat-map -- Collection, not array
        ...resolvedGuilds
          .map(({members, template}) => [
            ...members
              .filter(({id}) => !resolvedUsers.has(id))
              .map(({id}) => userEntry(id)),
            ...(template && !resolvedUsers.has(template.creator_id)
              ? [userEntry(template.creator_id)]
              : [])
          ])
          .flat(),
        // Add DM channel recipients
        ...resolvedDMChannels
          .filter(({recipient_id}) => !resolvedUsers.has(recipient_id))
          .map(({recipient_id}) => userEntry(recipient_id))
      ]),
      voice_regions: defaults.voiceRegions(voice_regions)
    }
  }
}

// Extract<GatewayDispatchPayload, {t: T}>['d'] results in never for some reason
type ExtractGatewayPayload<
  E extends GatewayDispatchEvents,
  P extends GatewayDispatchPayload = GatewayDispatchPayload
> = P extends {t: infer T} ? (T extends E ? P['d'] : never) : never
// TODO: remove these eslint-disable import/no-unused-modules when
// https://github.com/benmosher/eslint-plugin-import/pull/1974 is merged
// eslint-disable-next-line import/no-unused-modules -- eslint-plugin-import bug
export type EmitPacket = <T extends GatewayDispatchEvents>(
  t: T,
  d: ExtractGatewayPayload<T>
) => void

export type HasIntents = (intents: GatewayIntentBits) => boolean

export const api = (
  backend: Backend,
  clientData: ResolvedClientData,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
): API => {
  const data = backend['resolvedData']
  return {
    channels: endpoints.channels(data, clientData, hasIntents, emitPacket),
    guilds: endpoints.guilds(data, clientData, hasIntents, emitPacket),
    oauth2: endpoints.oauth2(data, clientData),
    voice: endpoints.voice(data)
  }
}
