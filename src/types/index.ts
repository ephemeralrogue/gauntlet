import type * as D from 'discord-api-types/v9'
import type {Collection} from 'discord.js'
import type {CollectionResolvable} from '..'
import type {
  AnyFunction,
  CollectionResolvableId,
  DOmit,
  Override,
  RequireKeys
} from '../utils'
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

export type ActionRowComponent = D.APIActionRowComponent
export type AuditLogChangeKeyId = D.APIAuditLogChangeKeyId
export type AuditLogOptions = D.APIAuditLogOptions
export type Attachment = D.APIAttachment
export type ButtonComponent = D.APIButtonComponent
export type EmbedAuthor = D.APIEmbedAuthor
export type EmbedImage = D.APIEmbedImage
export type EmbedFooter = D.APIEmbedFooter
export type EmbedThumbnail = D.APIEmbedThumbnail
export type GuildCreateOverwrite = D.APIGuildCreateOverwrite
export type GuildCreatePartialChannel = D.APIGuildCreatePartialChannel
export type GuildCreateRole = D.APIGuildCreateRole
export type GuildIntegration = D.APIGuildIntegration
export type GuildIntegrationApplication = D.APIGuildIntegrationApplication
export type GuildScheduledEventEntityMetadata =
  D.APIGuildScheduledEventEntityMetadata
export type GuildWelcomeScreen = D.APIGuildWelcomeScreen
export type GuildWelcomeScreenChannel = D.APIGuildWelcomeScreenChannel
export type IntegrationAccount = D.APIIntegrationAccount
export type MessageActivity = D.APIMessageActivity
export type MessageComponent = D.APIMessageComponent
export type MessageInteraction = D.APIMessageInteraction
export type MessageReference = D.APIMessageReference
export type PartialChannel = D.APIPartialChannel
export type PartialGuild = D.APIPartialGuild
export type SelectMenuOption = D.APISelectMenuOption
export type SelectMenuComponent = D.APISelectMenuComponent
export type StickerItem = D.APIStickerItem
export type Snowflake = D.Snowflake
export type Team = D.APITeam
export type TeamMember = D.APITeamMember
export type TemplateSerializedSourceGuild = D.APITemplateSerializedSourceGuild
export type User = D.APIUser
export type VoiceRegion = D.APIVoiceRegion

export type ActivityEmoji = D.GatewayActivityEmoji
export type ActivityParty = D.GatewayActivityParty
export type GatewayDispatchEvents = D.GatewayDispatchEvents
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
  [K in keyof T]?: PartialDeep<T[K]> | undefined
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
  ? // don't distribute
    [V] extends [{id: K}]
    ? CollectionResolvableId<V>
    : [V] extends [{user_id: K}]
    ? CollectionResolvable<V, 'user_id'>
    : Collection<K, PartialDeep<V>>
  : T extends AnyFunction
  ? T
  : T extends object
  ? ObjectPartialDeep<T>
  : T

// #endregion

// #region Changed Types

export interface Application extends Omit<D.APIApplication, 'owner'> {
  owner_id?: Snowflake
}

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

export type Message = Override<
  Omit<
    D.APIMessage,
    | 'application'
    | 'author'
    | 'channel_id'
    | 'guild_id'
    | 'member'
    | 'sticker_items'
    | 'thread'
  >,
  {
    author_id: Snowflake
    application_id?: Snowflake
    embeds: Embed[]
    mentions: Snowflake[]
    mention_channels?: ChannelMention[]
    referenced_message?: Message | null
    reactions: Reaction[]
    stickers: [id: Snowflake, guild_id?: Snowflake | undefined][]
    thread_id?: Snowflake
  }
>

export type Overwrite = Override<
  D.APIOverwrite,
  Record<'allow' | 'deny', bigint>
>

export type Webhook = Omit<D.APIWebhook, 'channel_id'>

interface ChannelBase<T extends D.ChannelType>
  extends Omit<D.APIPartialChannel, 'name'> {
  type: T
}

type RequiredPick<T, K extends keyof T> = Required<Pick<T, K>>

interface TextBasedChannelBase<T extends D.ChannelType>
  extends RequiredPick<D.APIChannel, 'last_message_id' | 'last_pin_timestamp'>,
    ChannelBase<T> {
  messages: SnowflakeCollection<Message>
}

export interface DMChannel extends TextBasedChannelBase<D.ChannelType.DM> {
  recipient_id: Snowflake
}

type Name = RequiredPick<D.APIChannel, 'name'>

type NormalGuildChannel<T extends D.ChannelType> = Override<
  ChannelBase<T> & Name & RequiredPick<D.APIChannel, 'position'>,
  {permission_overwrites: SnowflakeCollection<Overwrite>}
>

export type CategoryChannel = NormalGuildChannel<D.ChannelType.GuildCategory>

type ChildGuildChannel<T extends D.ChannelType> = NormalGuildChannel<T> &
  RequiredPick<D.APIChannel, 'parent_id'>

type NSFW = RequiredPick<D.APIChannel, 'nsfw'>

export type StoreChannel = ChildGuildChannel<D.ChannelType.GuildStore> & NSFW

type VoiceChannelBase = RequiredPick<
  D.APIChannel,
  'bitrate' | 'rtc_region' | 'user_limit'
>

export type VoiceChannel = ChildGuildChannel<D.ChannelType.GuildVoice> &
  Pick<
    D.APIChannel,
    'bitrate' | 'rtc_region' | 'user_limit' | 'video_quality_mode'
  > &
  VoiceChannelBase

export type StageChannel = ChildGuildChannel<D.ChannelType.GuildStageVoice> &
  VoiceChannelBase

interface GuildTextBasedChannelBase<T extends D.ChannelType>
  extends ChildGuildChannel<T>,
    RequiredPick<D.APIChannel, 'default_auto_archive_duration' | 'topic'>,
    TextBasedChannelBase<T> {
  webhooks: SnowflakeCollection<Webhook>
}

export type TextChannel = GuildTextBasedChannelBase<D.ChannelType.GuildText> &
  NSFW &
  RequiredPick<D.APIChannel, 'rate_limit_per_user'>

export type NewsChannel = GuildTextBasedChannelBase<D.ChannelType.GuildNews> &
  NSFW

export type ThreadMember = RequireKeys<Omit<D.APIThreadMember, 'id'>, 'user_id'>
export type ThreadMetadata = RequireKeys<D.APIThreadMetadata, 'locked'>

export interface ThreadChannel
  extends TextBasedChannelBase<
      | D.ChannelType.GuildNewsThread
      | D.ChannelType.GuildPrivateThread
      | D.ChannelType.GuildPublicThread
    >,
    Name {
  members: SnowflakeCollection<ThreadMember>
  parent_id: Snowflake
  thread_metadata: ThreadMetadata
}

type GuildTextBasedChannel = NewsChannel | TextChannel | ThreadChannel
export type TextBasedChannel = DMChannel | GuildTextBasedChannel
export type GuildChannel =
  | CategoryChannel
  | GuildTextBasedChannel
  | StageChannel
  | StoreChannel
  | VoiceChannel
export type Channel = DMChannel | GuildChannel

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

interface StickerBase<T extends D.StickerType>
  extends Omit<D.APISticker, 'guild_id'> {
  type: T
}
export type StandardSticker = RequireKeys<
  StickerBase<D.StickerType.Standard>,
  'pack_id'
>
export type GuildSticker = Omit<StickerBase<D.StickerType.Guild>, 'pack_id'>
export type Sticker = GuildSticker | StandardSticker

export type GuildScheduledEvent = DOmit<
  D.APIGuildScheduledEvent,
  'creator' | 'guild_id' | 'user_count'
> & {
  user_ids: Snowflake[]
}

export type Guild = Override<
  Omit<
    RequireKeys<APIGuild, 'widget_enabled'>,
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
    stickers: SnowflakeCollection<GuildSticker>
    template?: GuildTemplate
    voice_states: SnowflakeCollection<GuildVoiceState>
    guild_scheduled_events: SnowflakeCollection<GuildScheduledEvent>
  }
>

export {GatewayDispatchPayload} from './patches'

// #endregion
