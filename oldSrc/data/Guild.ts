import type {GuildFeatures, Snowflake} from 'discord.js'
import type {Override} from '../util'
import type {ChannelType, GuildChannel} from './Channel'
import type {GuildEmoji, GuildPreviewEmoji} from './Emoji'
import type {User} from './User'
import type {PermissionOverwrite, Role} from './permissions'
import type {Presence} from './gateway'
import type {Timestamp} from './utils'

export enum VerificationLevel {
  NONE,
  LOW,
  MEDIUM,
  HIGH,
  VERY_HIGH
}

export enum DefaultMessageNotificationLevel {
  ALL_MESSAGES, ONLY_MENTIONS
}

export enum ExplicitContentFilterLevel {
  DISABLED,
  MEMBERS_WITHOUT_ROLES,
  ALL_MEMBERS
}

export const enum MFALevel {
  NONE, ELEVATED
}

export const enum PremiumTier {
  NONE,
  TIER_1,
  TIER_2,
  TIER_3
}

export const enum SystemChannelFlags {
  SUPPRESS_JOIN_NOTIFICATIONS = 1,
  SUPPRESS_PREMIUM_SUBSCRIPTIONS
}

export interface VoiceState {
  guild_id?: Snowflake
  channel_id: Snowflake | null
  user_id: Snowflake
  member?: GuildMember
  session_id: string
  deaf: boolean
  mute: boolean
  self_deaf: boolean
  self_mute: boolean
  self_stream?: boolean
  suppress: boolean
}

export interface GuildMember {
  user: User
  nick?: string
  roles: Snowflake[]
  joined_at: Timestamp
  premium_since?: Timestamp | null
  deaf: boolean
  mute: boolean
}

interface GuildBase {
  id: Snowflake
  name: string
  icon: string | null
  // discovery_splash: string | null
  splash: string | null
  features: GuildFeatures[]
  description: string | null
}

export interface Guild extends GuildBase {
  owner?: boolean
  owner_id: Snowflake
  // permissions: PermissionsFlags
  region: string
  afk_channel_id: Snowflake | null
  afk_timeout: number
  embed_enabled?: boolean
  embed_channel_id?: Snowflake | null
  verification_level: VerificationLevel
  default_message_notifications: DefaultMessageNotificationLevel
  explicit_content_filter: ExplicitContentFilterLevel
  roles: Role[]
  emojis: GuildEmoji[]
  mfa_level: MFALevel
  application_id: Snowflake | null
  widget_enabled?: boolean
  widget_channel_id?: Snowflake | null
  system_channel_id: Snowflake | null
  system_channel_flags: SystemChannelFlags
  rules_channel_id: Snowflake | null
  joined_at?: Timestamp
  large?: boolean
  unavailable?: boolean
  member_count?: number
  voice_states?: Omit<VoiceState, 'guild_id'>[]
  members?: GuildMember[]
  channels?: GuildChannel[]
  presences?: Presence[]
  max_presences?: number | null
  max_members?: number
  vanity_url_code: string | null
  banner: string | null
  premium_tier: PremiumTier
  premium_subscription_count?: number
  // preferred_locale: string
  public_updates_channel_id: Snowflake | null
}

export interface GuildPreview extends GuildBase {
  emojis: GuildPreviewEmoji[]
  discovery_splash: string | null
  approximate_member_count: number
  approximate_presence_count: number
}

export interface Ban {
  reason: string | null
  user: User
}

export const enum IntegrationExpireBehavior {
  REMOVE_ROLE, KICK
}

interface IntegrationAccount {
  id: string
  name: string
}

export interface Integration {
  id: Snowflake
  name: string
  type: string
  enabled: boolean
  syncing: boolean
  role_id: Snowflake
  // enable_emoticons?: boolean
  expire_behavior: IntegrationExpireBehavior
  expire_grace_period: number
  user: User
  account: IntegrationAccount
  synced_at: Timestamp
}

export interface CreateGuildParams {
  name: string
  region?: string
  icon?: string
  verification_level?: VerificationLevel
  default_message_notifications?: DefaultMessageNotificationLevel
  explicit_content_filter?: ExplicitContentFilterLevel
  roles?: Override<Omit<Role, 'managed'>, {id: number, position?: number}>[]
  channels?: {
    name: string
    type?: ChannelType.GUILD_TEXT | ChannelType.GUILD_VOICE | ChannelType.GUILD_CATEGORY
    id?: number
    parent_id?: number
    permission_overwrites?: Override<Omit<PermissionOverwrite, 'type'>, {id: number}>[]
  }[]
  afk_channel_id?: Snowflake
  afk_timeout?: number
  system_channel_id?: Snowflake
}
