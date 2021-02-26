import type {
  APIApplication,
  APIChannel,
  APIGuildIntegration,
  APIGuildIntegrationApplication,
  APIGuildMember,
  APIRole,
  APITemplate,
  APIUser,
  APIVoiceRegion,
  GatewayVoiceState,
  Snowflake
} from 'discord-api-types/v8'
import type {Collection} from 'discord.js'
import type {AnyFunction, Override, RequireKeys} from '../utils'
import type {
  AuditLogChange,
  AuditLogEntry,
  Guild,
  GuildEmoji,
  Presence
} from './patches'

type ObjectDataPartialDeep<T extends object> = {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
  [K in keyof T]?: DataPartialDeep<T[K]>
}

/** Deep `Partial`, but `AuditLogChange` isn't partialised. */
// I'm not bothering to resolve partial changes
export type DataPartialDeep<T> = T extends AuditLogChange
  ? T
  : T extends readonly (infer U)[]
  ? number extends T['length']
    ? T extends unknown[]
      ? DataPartialDeep<U>[] // ordinary mutable array
      : readonly DataPartialDeep<U>[] // ordinary readonly array
    : ObjectDataPartialDeep<T> // tuple
  : T extends AnyFunction
  ? T
  : T extends object
  ? ObjectDataPartialDeep<T>
  : T

// #region Data

/* eslint-disable import/no-unused-modules -- eslint-plugin-import bug */

/** An altered `GuildEmoji`. This is ued in `Data`. */
export interface DataGuildEmoji extends Omit<GuildEmoji, 'user'> {
  user_id: Snowflake
}

/** An altered `APIChannel` for guilds. This is ued in `Data`. */
export type DataGuildChannel = Omit<
  RequireKeys<APIChannel, 'permission_overwrites' | 'position'>,
  'application_id' | 'guild_id' | 'icon' | 'owner_id' | 'recipients'
>

/** An altered `APIGuildMember`. This is ued in `Data`. */
export interface DataGuildMember
  extends Omit<
    RequireKeys<APIGuildMember, 'nick' | 'pending' | 'premium_since'>,
    'deaf' | 'mute' | 'user'
  > {
  id: Snowflake
}

export type DataGuildVoiceState = Omit<
  RequireKeys<GatewayVoiceState, 'self_stream'>,
  'guild_id' | 'member'
>

/* eslint-enable import/no-unused-modules */

export type DataGuildPresence = Omit<Presence, 'guild_id'>

export type DataGuildTemplate = Omit<APITemplate, 'creator' | 'source_guild_id'>

export type DataRole = Override<APIRole, {permissions: bigint}>

/** An altered `APIGuild`. This is ued in `Data`. */
export interface DataGuild
  extends Override<
    Omit<
      RequireKeys<
        Guild,
        'channels' | 'members' | 'voice_states' | 'widget_enabled'
      >,
      // Member counts will be computed
      | 'approximate_member_count'
      | 'approximate_presence_count'
      // icon_hash is the same as icon but used in the template object
      | 'icon_hash'
      // These will also be computed
      | 'joined_at'
      | 'member_count'
      | 'owner'
      | 'permissions'
    >,
    {
      audit_log_entries: AuditLogEntry[]
      channels: DataGuildChannel[]
      members: DataGuildMember[]
      template?: DataGuildTemplate
      presences: DataGuildPresence[]
      roles: DataRole[]
      voice_states: DataGuildVoiceState[]
    }
  > {
  emojis: DataGuildEmoji[]
  integrations: APIGuildIntegration[]
}

/** The resolved `Data` for the mocked Discord backend used by this library. */
// TODO: better name
export interface ResolvedData {
  // TODO: resolve stuff in DataGuild to a Collection
  guilds: Collection<Snowflake, DataGuild>
  integration_applications: Collection<
    Snowflake,
    APIGuildIntegrationApplication
  >
  users: Collection<Snowflake, APIUser>
  voice_regions: Collection<string, APIVoiceRegion>
}

/** The data for a `Backend`. */
export type Data = Override<
  Omit<DataPartialDeep<ResolvedData>, 'integration_applications'>,
  {
    applications?: DataPartialDeep<APIGuildIntegrationApplication>[]
    guilds?: DataPartialDeep<DataGuild>[]
    users?: DataPartialDeep<APIUser>[]
    voice_regions?: DataPartialDeep<APIVoiceRegion>[]
  }
>

// #endregion Data

export interface ClientDataApplication
  extends Pick<
    APIApplication,
    Exclude<keyof APIApplication, keyof APIGuildIntegrationApplication>
  > {
  id: Snowflake
}

export interface ResolvedClientData {
  application: ClientDataApplication
}

/** Data specific to a Discord.js client/bot application. */
export type ClientData = DataPartialDeep<ResolvedClientData>