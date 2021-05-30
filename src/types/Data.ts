import type {
  APIChannel,
  APIChannelMention,
  APIEmbed,
  APIEmbedField,
  APIGuildIntegration,
  APIGuildIntegrationApplication,
  APIGuildMember,
  APIMessage,
  APIOverwrite,
  APIReaction,
  APIRole,
  APISticker,
  APITemplate,
  APIUser,
  APIVoiceRegion,
  GatewayVoiceState,
  Snowflake
} from 'discord-api-types/v8'
import type {AnyFunction, Override, RequireKeys} from '../utils'
import type {
  APIAuditLogChange,
  APIAuditLogEntry,
  APiGuild,
  APIGuildEmoji,
  GatewayPresenceUpdate
} from './patches'

type ObjectPartialDeep<T extends object> = {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
  [K in keyof T]?: PartialDeep<T[K]>
}

/** Deep `Partial`, but `AuditLogChange` isn't partialised. */
// I'm not bothering to resolve partial changes
export type PartialDeep<T> = T extends APIAuditLogChange
  ? T
  : T extends readonly (infer U)[]
  ? number extends T['length']
    ? T extends unknown[]
      ? PartialDeep<U>[] // ordinary mutable array
      : readonly PartialDeep<U>[] // ordinary readonly array
    : ObjectPartialDeep<T> // tuple
  : T extends AnyFunction
  ? T
  : T extends object
  ? ObjectPartialDeep<T>
  : T

/** An altered `GuildEmoji`. This is ued in `Data`. */
export interface GuildEmoji extends Omit<APIGuildEmoji, 'user'> {
  user_id: Snowflake
}

export type PartialEmoji =
  // Normal emoji
  | {id: null; name: string}
  // Custom emoji
  | {id: Snowflake; name: string | null}

export type ChannelMention = Omit<APIChannelMention, 'name' | 'type'>

export interface Reaction extends APIReaction {
  emoji: PartialEmoji
}

export type EmbedField = RequireKeys<APIEmbedField, 'inline'>

export interface Embed extends APIEmbed {
  fields?: EmbedField[]
}

export interface Message
  extends Override<
    Omit<
      APIMessage,
      'application' | 'author' | 'channel_id' | 'guild_id' | 'member'
    >,
    {
      mentions: Snowflake[]
      mention_channels?: ChannelMention[]
      referenced_message?: Message | null
      stickers?: Snowflake[]
    }
  > {
  application_id?: Snowflake
  author_id: Snowflake
  embeds: Embed[]
  reactions: Reaction[]
}

export type Overwrite = Override<APIOverwrite, Record<'allow' | 'deny', bigint>>

// TODO: better types for each channel

export interface DMChannel
  extends RequireKeys<
    Omit<
      APIChannel,
      | 'application_id'
      | 'bitrate'
      | 'guild_id'
      | 'nsfw'
      | 'parent_id'
      | 'permission_overwrites'
      | 'position'
      | 'rate_limit_per_user'
      | 'recipients'
      | 'user_limit'
    >,
    'last_message_id'
  > {
  messages: Message[]
  recipient_id: Snowflake
}

/** An altered `APIChannel` for guilds. This is ued in `Data`. */
export interface GuildChannel
  extends Override<
    Omit<
      RequireKeys<APIChannel, 'name' | 'position'>,
      'application_id' | 'guild_id' | 'icon' | 'owner_id' | 'recipients'
    >,
    {permission_overwrites: Overwrite[]}
  > {
  messages?: Message[]
}

export type Channel = DMChannel | GuildChannel

/** An altered `APIGuildMember`. This is ued in `Data`. */
export interface GuildMember
  extends Omit<
    RequireKeys<APIGuildMember, 'nick' | 'pending' | 'premium_since'>,
    'deaf' | 'mute' | 'user'
  > {
  id: Snowflake
}

type VoiceState = Omit<RequireKeys<GatewayVoiceState, 'self_stream'>, 'member'>
export type GuildVoiceState = Omit<VoiceState, 'guild_id'>

interface Presence extends Omit<GatewayPresenceUpdate, 'user'> {
  user_id: Snowflake
}

export type GuildPresence = Omit<Presence, 'guild_id'>
export type GuildTemplate = Omit<APITemplate, 'creator' | 'source_guild_id'>
export type Role = Override<APIRole, {permissions: bigint}>

/** An altered `APIGuild`. This is ued in `Data`. */
export interface Guild
  extends Override<
    Omit<
      RequireKeys<
        APiGuild,
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
      audit_log_entries: APIAuditLogEntry[]
      channels: GuildChannel[]
      members: GuildMember[]
      template?: GuildTemplate
      presences: GuildPresence[]
      roles: Role[]
      voice_states: GuildVoiceState[]
    }
  > {
  emojis: GuildEmoji[]
  integrations: APIGuildIntegration[]
}

// TODO: better name
/** The data for a `Backend`. */
export interface Data {
  applications?: PartialDeep<APIGuildIntegrationApplication>[]
  dm_channels?: PartialDeep<DMChannel>[]
  guilds?: PartialDeep<Guild>[]
  stickers?: PartialDeep<APISticker>[]
  users?: PartialDeep<APIUser>[]
  voice_regions?: PartialDeep<APIVoiceRegion>[]
}
