import type * as D from 'discord-api-types/v9'
import type {Collection} from 'discord.js'
import type {AnyFunction, Override, RequireKeys} from '../utils'
import type {
  APIAuditLogChange,
  APIAuditLogChangeKeyOverwriteType,
  APIAuditLogEntry,
  APIGuild,
  APIGuildEmoji,
  GatewayActivity,
  GatewayPresenceUpdate
} from './patches'

// #region Type aliases

export type Application = D.APIApplication
export type AuditLogChangeKeyId = D.APIAuditLogChangeKeyId
export type AuditLogOptions = D.APIAuditLogOptions
export type Attachment = D.APIAttachment
export type EmbedFooter = D.APIEmbedFooter
export type GuildCreateOverwrite = D.APIGuildCreateOverwrite
export type GuildCreatePartialChannel = D.APIGuildCreatePartialChannel
export type GuildCreateRole = D.APIGuildCreateRole
export type GuildIntegration = D.APIGuildIntegration
export type GuildIntegrationApplication = D.APIGuildIntegrationApplication
export type GuildWelcomeScreen = D.APIGuildWelcomeScreen
export type GuildWelcomeScreenChannel = D.APIGuildWelcomeScreenChannel
export type IntegrationAccount = D.APIIntegrationAccount
export type MessageActivity = D.APIMessageActivity
export type MessageInteraction = D.APIMessageInteraction
export type MessageReference = D.APIMessageReference
export type PartialChannel = D.APIPartialChannel
export type PartialGuild = D.APIPartialGuild
export type Sticker = D.APISticker
export type StickerItem = D.APIStickerItem
export type Snowflake = D.Snowflake
export type Team = D.APITeam
export type TeamMember = D.APITeamMember
export type TemplateSerializedSourceGuild = D.APITemplateSerializedSourceGuild
export type User = D.APIUser
export type VoiceRegion = D.APIVoiceRegion
export type Webhook = D.APIWebhook

export type ActivityEmoji = D.GatewayActivityEmoji
export type ActivityParty = D.GatewayActivityParty
export type GatewayDispatchEvents = D.GatewayDispatchEvents
export type GatewayDispatchPayload = D.GatewayDispatchPayload
export type IntentBits = D.GatewayIntentBits

export type AuditLogChange = APIAuditLogChange
export type AuditLogChangeKeyOverwriteType = APIAuditLogChangeKeyOverwriteType
export type AuditLogEntry = APIAuditLogEntry

export type Activity = GatewayActivity
export type PresenceUpdate = GatewayPresenceUpdate

// #endregion

// #region Utils

export type SnowflakeCollection<T> = Collection<Snowflake, T>

type ObjectPartialDeep<T extends object> = {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
  [K in keyof T]?: PartialDeep<T[K]>
}

/** Deep `Partial`, but `AuditLogChange` isn't partialised. */
// I'm not bothering to resolve partial changes
export type PartialDeep<T> = T extends AuditLogChange
  ? T
  : T extends readonly (infer U)[]
  ? number extends T['length']
    ? T extends unknown[]
      ? PartialDeep<U>[] // ordinary mutable array
      : readonly PartialDeep<U>[] // ordinary readonly array
    : ObjectPartialDeep<T> // tuple
  : T extends Collection<infer K, infer V>
  ? Collection<K, PartialDeep<V>>
  : T extends AnyFunction
  ? T
  : T extends object
  ? ObjectPartialDeep<T>
  : T

// #endregion

// #region Changed Types

export type FullApplication = RequireKeys<
  Application & GuildIntegrationApplication,
  'bot'
>

export interface GuildEmoji extends Omit<APIGuildEmoji, 'user'> {
  user_id: Snowflake
}

export type PartialEmoji =
  // Normal emoji
  | {id: null; name: string}
  // Custom emoji
  | {id: Snowflake; name: string | null}

export type ChannelMention = Omit<D.APIChannelMention, 'name' | 'type'>

export interface Reaction extends D.APIReaction {
  emoji: PartialEmoji
}

export type EmbedField = RequireKeys<D.APIEmbedField, 'inline'>

export interface Embed extends D.APIEmbed {
  fields?: EmbedField[]
}

type _ButtonComponent<T extends D.APIButtonComponent> = Override<
  T,
  {emoji?: PartialEmoji}
>
export type ButtonComponentWithCustomId =
  _ButtonComponent<D.APIButtonComponentWithCustomId>
export type ButtonComponentWithURL =
  _ButtonComponent<D.APIButtonComponentWithURL>
export type ButtonComponent =
  | ButtonComponentWithCustomId
  | ButtonComponentWithURL

export type SelectMenuOption = Override<
  D.APISelectMenuOption,
  {emoji?: PartialEmoji}
>

export type SelectMenuComponent = Override<
  D.APISelectMenuComponent,
  {options: SelectMenuOption[]}
>

export type ActionRowComponent = Override<
  D.APIActionRowComponent,
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
  {components: Exclude<MessageComponent, ActionRowComponent>[]}
>

export type MessageComponent =
  | ActionRowComponent
  | ButtonComponent
  | SelectMenuComponent

export interface Message
  extends Override<
    Omit<
      D.APIMessage,
      | 'application'
      | 'author'
      | 'channel_id'
      | 'guild_id'
      | 'member'
      | 'sticker_items'
      | 'stickers'
      | 'thread'
    >,
    {
      mentions: Snowflake[]
      mention_channels?: ChannelMention[]
      referenced_message?: Message | null
      components?: ActionRowComponent[]
    }
  > {
  application_id?: Snowflake
  author_id: Snowflake
  embeds: Embed[]
  reactions: Reaction[]
  thread_id?: Snowflake
  sticker_ids?: Snowflake[]
}

export type Overwrite = Override<
  D.APIOverwrite,
  Record<'allow' | 'deny', bigint>
>

// TODO: better types for each channel

export type DMChannel = Override<
  RequireKeys<
    Omit<
      D.APIChannel,
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
  >,
  {
    messages: SnowflakeCollection<Message>
    recipient_id: Snowflake
  }
>

/** An altered `D.APIChannel` for guilds. This is ued in `Data`. */
export type GuildChannel = Override<
  Omit<
    RequireKeys<D.APIChannel, 'name' | 'position'>,
    'application_id' | 'guild_id' | 'icon' | 'owner_id' | 'recipients'
  >,
  {
    messages?: SnowflakeCollection<Message>
    permission_overwrites: SnowflakeCollection<Overwrite>
  }
>

export type Channel = DMChannel | GuildChannel

/** An altered `D.APIGuildMember`. This is ued in `Data`. */
export interface GuildMember
  extends Omit<
    RequireKeys<D.APIGuildMember, 'nick' | 'pending' | 'premium_since'>,
    'deaf' | 'mute' | 'user'
  > {
  id: Snowflake
}

type VoiceState = Omit<
  RequireKeys<D.GatewayVoiceState, 'self_stream'>,
  'member'
>
export type GuildVoiceState = Omit<VoiceState, 'guild_id'>

interface Presence extends Omit<GatewayPresenceUpdate, 'user'> {
  user_id: Snowflake
}

export type GuildPresence = Omit<Presence, 'guild_id'>
export type GuildTemplate = Omit<D.APITemplate, 'creator' | 'source_guild_id'>
export type Role = Override<D.APIRole, {permissions: bigint}>

/** An altered `D.APIGuild`. This is ued in `Data`. */
export type Guild = Override<
  Omit<
    RequireKeys<
      APIGuild,
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
    audit_log_entries: SnowflakeCollection<AuditLogEntry>
    channels: SnowflakeCollection<GuildChannel>
    emojis: SnowflakeCollection<GuildEmoji>
    integration_ids: Snowflake[]
    members: SnowflakeCollection<GuildMember>
    presences: SnowflakeCollection<GuildPresence>
    roles: SnowflakeCollection<Role>
    stickers: SnowflakeCollection<D.APISticker>
    template?: GuildTemplate
    voice_states: SnowflakeCollection<GuildVoiceState>
  }
>

// #endregion
