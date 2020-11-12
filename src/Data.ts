import type {
  APIApplication,
  APIChannel,
  APIGuildIntegration,
  APIGuildMember,
  APIUser,
  APIVoiceRegion,
  Snowflake
} from 'discord-api-types/v8'
import type {Collection} from 'discord.js'
import type {AuditLogEntry, Guild, GuildEmoji, GuildVoiceState} from './types'
import type {CollectionResolvable, DataPartialDeep} from './resolve-collection'
import type {Override, RequireKeys} from './utils'

// #region Data

/** An altered `GuildEmoji`. This is ued in `Data`. */
export interface DataGuildEmoji extends Omit<GuildEmoji, 'user'> {
  user_id: Snowflake
}

/** An altered `APIChannel` for guilds. This is ued in `Data`. */
export type DataGuildChannel = Omit<
  RequireKeys<APIChannel, 'permission_overwrites' | 'position'>,
  'guild_id'
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
  RequireKeys<GuildVoiceState, 'self_stream'>,
  'member'
>

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
      voice_states: DataGuildVoiceState[]
    }
  > {
  emojis: DataGuildEmoji[]
  integrations: APIGuildIntegration[]
}

/** The resolved `Data` for the mocked Discord backend used by this library. */
// TODO: better name
export interface ResolvedData {
  guilds: Collection<Snowflake, DataGuild>
  users: Collection<Snowflake, APIUser>
  voice_regions: Collection<string, APIVoiceRegion>
}

/** The data for a `Backend`. */
export type Data = Override<
  DataPartialDeep<ResolvedData>,
  {
    guilds?: CollectionResolvable<Snowflake, DataGuild, 'id'>
    users?: CollectionResolvable<Snowflake, APIUser, 'id'>
    voiceRegions?: CollectionResolvable<string, APIVoiceRegion, 'id'>
  }
>

// #endregion Data

export interface ResolvedClientData {
  application: APIApplication
  userID: Snowflake
}

/** Data specific to a Discord.js client/bot application. */
export type ClientData = DataPartialDeep<ResolvedClientData>
