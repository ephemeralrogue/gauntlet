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

export class Backend {
  /** Internal use only. */
  readonly resolvedData: ResolvedData

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
        // eslint-disable-next-line unicorn/prefer-array-flat-map -- Collection, not array
        ...resolvedGuilds
          .map(({members}) =>
            members
              .filter(({id}) => !resolvedUsers.has(id))
              .map(({id}) => [id, defaults.user({id})] as const)
          )
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
  guilds: endpoints.guilds(backend.resolvedData, clientData, emitPacket),
  oauth2: endpoints.oauth2(clientData),
  voice: endpoints.voice(backend.resolvedData)
})
