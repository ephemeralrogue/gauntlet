import type {Snowflake} from 'discord.js'
import type {Override} from '../util'
import type {ReactionEmoji} from './Emoji'
import type {GuildMember} from './Guild'
import type {User} from './User'
import type {PermissionOverwrite} from './permissions'
import type {Timestamp} from './utils'

// #region Channel
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
  type: ChannelType
}

export interface GuildChannelBase extends ChannelBase {
  type: typeof ChannelType[Exclude<keyof typeof ChannelType, 'DM'>]
  guild_id: Snowflake
  position: number
  permission_overwrites?: PermissionOverwrite[]
  name: string
  parent_id: Snowflake | null
}

interface TextChannelBase extends ChannelBase {
  type: typeof ChannelType['GUILD_TEXT' | 'GUILD_NEWS' | 'DM' | 'GROUP_DM']
  last_message_id: Snowflake | null
  last_pin_timestamp?: Timestamp
}

export interface TextChannel extends GuildChannelBase, TextChannelBase {
  type: ChannelType.GUILD_TEXT
  topic: string | null
  nsfw?: boolean
  rate_limit_per_user?: number
}

export interface DMChannel extends TextChannelBase {
  type: ChannelType.DM
  recipients: [User]
}

export interface PartialGroupDMChannel extends ChannelBase {
  type: ChannelType.GROUP_DM
  name: string | null
  icon?: string | null
}

export interface VoiceChannel extends GuildChannelBase {
  type: ChannelType.GUILD_VOICE
  bitrate?: number
  user_limit?: number
}

export interface CategoryChannel extends GuildChannelBase {
  type: ChannelType.GUILD_CATEGORY
}
export type NewsChannel = Override<TextChannel, {type: ChannelType.GUILD_NEWS}>

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

export type Channel = GuildChannel | DMChannel
// #endregion

// #region Message
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

export const enum MessageFlags {
  NONE,
  CROSSPOSTED = 1 << 0,
  IS_CROSSPOST = 1 << 1,
  SUPPRESS_EMBEDS = 1 << 2,
  SOURCE_MESSAGE_DELETED = 1 << 3,
  URGENT = 1 << 4
}

const enum MessageActivityType {
  JOIN = 1,
  SPECTATE,
  LISTEN,
  JOIN_REQUEST
}

/** @deprecated */
export type EmbedType = 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link'

export interface ChannelMention {
  id: Snowflake
  guild_id: Snowflake
  type: ChannelType
  name: string
}

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

interface EmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface SendMessageEmbed {
  title?: string
  type?: 'rich'
  description?: string
  url?: string
  timestamp?: Timestamp
  color?: number
  footer?: Omit<EmbedFooter, 'proxy_icon_url'>
  image?: Pick<EmbedImage, 'url'>
  thumbnail?: Pick<EmbedImage, 'url'>
  author?: Omit<EmbedAuthor, 'proxy_icon_url'>
  fields?: EmbedField[]
}

export interface Embed extends Omit<SendMessageEmbed, 'type'> {
  type?: EmbedType
  footer?: EmbedFooter
  image?: EmbedImage
  thumbnail?: EmbedImage
  video?: EmbedVideo
  provider?: EmbedProvider
  author?: EmbedAuthor
}

export interface Reaction {
  count: number
  me: boolean
  emoji: ReactionEmoji
}

interface MessageActivity {
  type: MessageActivityType
  party_id?: string
}

interface MessageApplication {
  id: Snowflake
  cover_image?: string
  description: string
  icon: string | null
  name: string
}

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

export type Message = UserMessage | WebhookMessage

export interface EditMessageParams {
  content?: string
  embed?: Embed
  flags?: MessageFlags
}
// #endregion
