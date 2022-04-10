import type {Snowflake} from 'discord.js'
import type {ReactionEmoji} from './Emoji'
import type {GuildMember} from './Guild'
import type {User} from './User'
import type {PermissionOverwrite} from './permissions'
import type {Timestamp} from './utils'

// #region Channel
/** https://discord.com/developers/docs/resources/channel#channel-object-channel-types */
export const enum ChannelType {
  GUILD_TEXT,
  DM,
  GUILD_VOICE,
  GROUP_DM,
  GUILD_CATEGORY,
  GUILD_NEWS,
  GUILD_STORE
}

export interface ChannelBase {
  id: Snowflake
}

export interface GuildChannelBase extends ChannelBase {
  guild_id: Snowflake
  position: number
  permission_overwrites?: PermissionOverwrite[]
  name: string
  parent_id: Snowflake | null
}

export interface TextChannelBase extends ChannelBase {
  last_message_id: Snowflake | null
  last_pin_timestamp?: Timestamp
}

export interface GuildTextChannelBase
  extends GuildChannelBase,
    TextChannelBase {
  topic: string | null
  nsfw?: boolean
}

/** https://discord.com/developers/docs/resources/channel#channel-object-example-guild-text-channel */
export interface TextChannel extends GuildTextChannelBase {
  type: ChannelType.GUILD_TEXT
  rate_limit_per_user?: number
}

/** https://discord.com/developers/docs/resources/channel#channel-object-example-guild-news-channel */
export interface NewsChannel extends GuildTextChannelBase {
  type: ChannelType.GUILD_NEWS
}

/** https://discord.com/developers/docs/resources/channel#channel-object-example-dm-channel */
export interface DMChannel extends TextChannelBase {
  type: ChannelType.DM
  recipients: [User]
}

/** https://discord.com/developers/docs/resources/channel#channel-object-example-group-dm-channel */
export interface PartialGroupDMChannel extends ChannelBase {
  type: ChannelType.GROUP_DM
  name: string | null
  icon?: string | null
}

/** https://discord.com/developers/docs/resources/channel#channel-object-example-guild-voice-channel */
export interface VoiceChannel extends GuildChannelBase {
  type: ChannelType.GUILD_VOICE
  bitrate?: number
  user_limit?: number
}
/** https://discord.com/developers/docs/resources/channel#channel-object-example-channel-category */
export interface CategoryChannel extends Omit<GuildChannelBase, 'parent_id'> {
  type: ChannelType.GUILD_CATEGORY
}

/** https://discord.com/developers/docs/resources/channel#channel-object-example-store-channel */
export interface StoreChannel extends GuildChannelBase {
  type: ChannelType.GUILD_STORE
  nsfw?: boolean
}

export type GuildChannel =
  | TextChannel
  | VoiceChannel
  | CategoryChannel
  | NewsChannel
  | StoreChannel

/** https://discord.com/developers/docs/resources/channel#channel-object */
export type Channel = GuildChannel | DMChannel
// #endregion

// #region Message
/** https://discord.com/developers/docs/resources/channel#message-object-message-types */
export enum MessageType {
  DEFAULT,
  RECIPIENT_ADD,
  RECIPIENT_REMOVE,
  CALL,
  CHANNEL_NAME_CHANGE,
  CHANNEL_ICON_CHANGE,
  CHANNEL_PINNED_MESSAGE,
  GUILD_MEMBER_JOIN,
  USER_PREMIUM_GUILD_SUBSCRIPTION,
  USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1,
  USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2,
  USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3,
  CHANNEL_FOLLOW_ADD,
  GUILD_DISCOVERY_DISQUALIFIED = 14,
  GUILD_DISCOVERY_REQUALIFIED
}

/** https://discord.com/developers/docs/resources/channel#message-object-message-flags */
export const enum MessageFlags {
  NONE,
  CROSSPOSTED = 1 << 0,
  IS_CROSSPOST = 1 << 1,
  SUPPRESS_EMBEDS = 1 << 2,
  SOURCE_MESSAGE_DELETED = 1 << 3,
  URGENT = 1 << 4
}

/** https://discord.com/developers/docs/resources/channel#message-object-message-activity-types */
const enum MessageActivityType {
  JOIN = 1,
  SPECTATE,
  LISTEN,
  JOIN_REQUEST
}

/**
 * https://discord.com/developers/docs/resources/channel#embed-object-embed-types
 *
 * @deprecated
 */
export type EmbedType = 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link'

/** https://discord.com/developers/docs/resources/channel#channel-mention-object */
export interface ChannelMention {
  id: Snowflake
  guild_id: Snowflake
  type: ChannelType
  name: string
}

/** https://discord.com/developers/docs/resources/channel#attachment-object */
interface Attachment {
  id: Snowflake
  filename: string
  size: number
  url: string
  proxy_url: string
  height: number | null
  width: number | null
}

interface WithIcon {
  icon_url?: string
  proxy_icon_url?: string
}

interface EmbedFooter extends WithIcon {
  text: string
}

interface EmbedVideo {
  url?: string
  height?: number
  width?: number
}

interface EmbedImage extends EmbedVideo {
  proxy_url?: string
}

interface EmbedProvider {
  name?: string
  url?: string
}

interface EmbedAuthor extends EmbedProvider, WithIcon {}

/** https://discord.com/developers/docs/resources/channel#embed-object-embed-field-structure */
interface EmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface SendMessageEmbed {
  title?: string
  description?: string
  url?: string
  timestamp?: Timestamp
  color?: number
  footer?: Omit<EmbedFooter, 'proxy_icon_url'>
  /** https://discord.com/developers/docs/resources/channel#embed-object-embed-image-structure */
  image?: Pick<EmbedImage, 'url'>
  /** https://discord.com/developers/docs/resources/channel#embed-object-embed-thumbnail-structure */
  thumbnail?: Pick<EmbedImage, 'url'>
  /** https://discord.com/developers/docs/resources/channel#embed-object-embed-author-structure */
  author?: Omit<EmbedAuthor, 'proxy_icon_url'>
  fields?: EmbedField[]
}

/** https://discord.com/developers/docs/resources/channel#embed-object */
export interface Embed extends SendMessageEmbed {
  type?: EmbedType
  footer?: EmbedFooter
  image?: EmbedImage
  thumbnail?: EmbedImage
  /** https://discord.com/developers/docs/resources/channel#embed-object-embed-video-structure */
  video?: EmbedVideo
  /** https://discord.com/developers/docs/resources/channel#embed-object-embed-provider-structure */
  provider?: EmbedProvider
  author?: EmbedAuthor
}

/** https://discord.com/developers/docs/resources/channel#reaction-object */
export interface Reaction {
  count: number
  me: boolean
  emoji: ReactionEmoji
}

/** https://discord.com/developers/docs/resources/channel#message-object-message-activity-structure */
interface MessageActivity {
  type: MessageActivityType
  party_id?: string
}

/** https://discord.com/developers/docs/resources/channel#message-object-message-application-structure */
interface MessageApplication {
  id: Snowflake
  cover_image?: string
  description: string
  icon: string | null
  name: string
}

/** https://discord.com/developers/docs/resources/channel#message-object-message-reference-structure */
interface MessageReference {
  message_id?: Snowflake
  channel_id: Snowflake
  guild_id?: Snowflake
}

interface MessageBase {
  id: Snowflake
  channel_id: Snowflake
  // guild_id?: Snowflake
  content?: string
  timestamp: Timestamp
  edited_timestamp: Timestamp | null
  tts: boolean
  mention_everyone: boolean
  mentions: (User & {member?: Omit<GuildMember, 'user'>})[]
  mention_roles: Snowflake[]
  mention_channels?: ChannelMention[]
  attachments: Attachment[]
  embeds: Embed[]
  reactions?: Reaction[]
  nonce?: number | string
  pinned: boolean
  type: MessageType
  activity?: MessageActivity
  application?: MessageApplication
  message_reference?: MessageReference
  flags?: MessageFlags
}

export interface UserMessage extends MessageBase {
  author: User
  member?: Omit<GuildMember, 'user'>
}

export interface WebhookMessage extends MessageBase {
  author: Pick<User, 'id' | 'username' | 'avatar'>
  webhook_id: Snowflake
}

/** https://discord.com/developers/docs/resources/channel#message-object */
export type Message = UserMessage | WebhookMessage

export interface EditMessageParams {
  content?: string
  embed?: Embed
  flags?: MessageFlags
}
// #endregion
