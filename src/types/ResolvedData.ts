import type {
  APIGuildIntegrationApplication,
  APIUser,
  APISticker,
  APIVoiceRegion,
  Snowflake,
  APIGuildIntegration
} from 'discord-api-types/v8'
import type {Collection} from 'discord.js'
import type {Override} from '../utils'
import type * as D from './Data'
import type {APIAuditLogEntry} from './patches'

export type DMChannel = Override<
  D.DMChannel,
  {
    messages: Collection<Snowflake, D.Message>
  }
>

export type GuildChannel = Override<
  D.GuildChannel,
  {
    permission_overwrites: Collection<Snowflake, D.Overwrite>
    messages?: Collection<Snowflake, D.Message>
  }
>

export type Guild = Override<
  D.Guild,
  {
    audit_log_entries: Collection<Snowflake, APIAuditLogEntry>
    channels: Collection<Snowflake, GuildChannel>
    emojis: Collection<Snowflake, D.GuildEmoji>
    integrations: Collection<Snowflake, APIGuildIntegration>
    members: Collection<Snowflake, D.GuildMember>
    presences: Collection<Snowflake, D.GuildPresence>
    roles: Collection<Snowflake, D.Role>
    voice_states: Collection<Snowflake, D.GuildVoiceState>
  }
>

export type Channel = DMChannel | GuildChannel

/** The resolved `Data` for the mocked Discord backend used by this library. */
export interface ResolvedData {
  dm_channels: Collection<Snowflake, DMChannel>
  guilds: Collection<Snowflake, Guild>
  integration_applications: Collection<
    Snowflake,
    APIGuildIntegrationApplication
  >
  stickers: Collection<Snowflake, APISticker>
  users: Collection<Snowflake, APIUser>
  voice_regions: Collection<string, APIVoiceRegion>
}
