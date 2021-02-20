import * as defaults from './defaults'
import * as endpoints from './endpoints'
import {resolveCollection} from './resolve-collection'
import type {
  APIUser,
  GatewayDispatchEvents,
  GatewayDispatchPayload,
  Snowflake
} from 'discord-api-types/v8'
import type {Data, DataGuild, ResolvedClientData, ResolvedData} from './Data'
import type {Guilds, OAuth2, Voice} from './endpoints'
import {Collection} from 'discord.js'

interface API {
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
  constructor({guilds, users, voiceRegions}: Data = {}) {
    const resolvedGuilds = resolveCollection<Snowflake, DataGuild, 'id'>(
      guilds,
      'id',
      defaults.dataGuild
    )
    const resolvedUsers = resolveCollection<Snowflake, APIUser, 'id'>(
      users,
      'id',
      defaults.user
    )
    this.resolvedData = {
      guilds: resolvedGuilds,
      users: new Collection([
        ...resolvedUsers.entries(),
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
          .flat()
      ]),
      voice_regions: defaults.voiceRegions(voiceRegions)
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

export const api = (
  backend: Backend,
  clientData: ResolvedClientData,
  emitPacket: EmitPacket
): API => ({
  guilds: endpoints.guilds(backend['resolvedData'], clientData, emitPacket),
  oauth2: endpoints.oauth2(clientData),
  voice: endpoints.voice(backend['resolvedData'])
})
