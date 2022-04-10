import type {GuildFeatures, Snowflake} from 'discord.js'
import type {DOmit, Override, PartialExcluding} from '../utils'
import type {
  CategoryChannel,
  ChannelType,
  GuildChannel,
  TextChannel,
  VoiceChannel
} from './Channel'
import type {GuildEmoji, GuildPreviewEmoji} from './Emoji'
import type {User} from './User'
import type {VoiceState} from './Voice'
import type {PermissionOverwrite, Role} from './permissions'
import type {Presence} from './gateway'
import type {Timestamp} from './utils'

/** https://discord.com/developers/docs/resources/guild#guild-object-verification-level */
export enum VerificationLevel {
  NONE,
  LOW,
  MEDIUM,
  HIGH,
  VERY_HIGH
}

/** https://discord.com/developers/docs/resources/guild#guild-object-default-message-notification-level */
export enum DefaultMessageNotificationLevel {
  ALL_MESSAGES,
  ONLY_MENTIONS
}

/** https://discord.com/developers/docs/resources/guild#guild-object-explicit-content-filter-level */
export enum ExplicitContentFilterLevel {
  DISABLED,
  MEMBERS_WITHOUT_ROLES,
  ALL_MEMBERS
}

/** https://discord.com/developers/docs/resources/guild#guild-object-mfa-level */
export const enum MFALevel {
  NONE,
  ELEVATED
}

/** https://discord.com/developers/docs/resources/guild#guild-object-premium-tier */
export const enum PremiumTier {
  NONE,
  TIER_1,
  TIER_2,
  TIER_3
}

/** https://discord.com/developers/docs/resources/guild#guild-object-system-channel-flags */
export const enum SystemChannelFlags {
  SUPPRESS_JOIN_NOTIFICATIONS = 1,
  SUPPRESS_PREMIUM_SUBSCRIPTIONS
}

/** https://discord.com/developers/docs/resources/guild#guild-member-object */
export interface GuildMember {
  user: User
  nick?: string
  roles: Snowflake[]
  joined_at: Timestamp
  premium_since?: Timestamp | null
  deaf: boolean
  mute: boolean
}

export interface GuildBase {
  id: Snowflake
  name: string
  icon: string | null
  // discovery_splash: string | null
  splash: string | null
  features: GuildFeatures[]
  description: string | null
}

/** https://discord.com/developers/docs/resources/guild#guild-object */
export interface Guild extends GuildBase {
  owner?: boolean
  owner_id: Snowflake
  // permissions: PermissionsFlags
  region: string
  afk_channel_id: Snowflake | null
  afk_timeout: number
  /** @deprecated */
  embed_enabled?: boolean
  /** @deprecated */
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
  max_presences?: number | null
  max_members?: number
  vanity_url_code: string | null
  banner: string | null
  premium_tier: PremiumTier
  premium_subscription_count?: number
  preferred_locale: string
  public_updates_channel_id: Snowflake | null
  max_video_channel_users?: number
}

/** A guild sent in the GUILD_CREATE gateway event.  */
export interface FullGuild extends Guild {
  joined_at: Timestamp
  large: boolean
  unavailable: boolean
  member_count: number
  voice_states: Omit<VoiceState, 'guild_id'>[]
  members: GuildMember[]
  channels: GuildChannel[]
  presences: Presence[]
}

/** https://discord.com/developers/docs/resources/guild#guild-preview-object */
export interface GuildPreview extends GuildBase {
  emojis: GuildPreviewEmoji[]
  discovery_splash: string | null
  approximate_member_count: number
  approximate_presence_count: number
}

/** https://discord.com/developers/docs/resources/guild#ban-object */
export interface Ban {
  reason: string | null
  user: User
}

/** https://discord.com/developers/docs/resources/guild#integration-object-integration-expire-behaviors */
export const enum IntegrationExpireBehavior {
  REMOVE_ROLE,
  KICK
}

/** https://discord.com/developers/docs/resources/guild#integration-account-object */
interface IntegrationAccount {
  id: string
  name: string
}

/** https://discord.com/developers/docs/resources/guild#integration-object */
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

/** https://discord.com/developers/docs/resources/guild#create-guild */
export interface CreateGuildParams {
  name: string
  region?: string
  icon?: string
  verification_level?: VerificationLevel
  default_message_notifications?: DefaultMessageNotificationLevel
  explicit_content_filter?: ExplicitContentFilterLevel
  roles?: Partial<Override<Omit<Role, 'managed'>, {id: number}>>[]
  channels?: PartialExcluding<
    Override<
      DOmit<
        TextChannel | VoiceChannel | CategoryChannel,
        'position' | 'guild_id' | 'last_message_id' | 'last_pin_timestamp'
      >,
      {
        id: number
        parent_id: number | null
        permission_overwrites: Partial<
          Override<PermissionOverwrite, {id: number}>
        >[]
      }
    >,
    'name'
  >[]
  afk_channel_id?: number
  afk_timeout?: number
  system_channel_id?: number
}

/** https://discord.com/developers/docs/resources/guild#create-guild-channel */
export interface CreateGuildChannelParams {
  name: string
  topic?: string
  type?: Exclude<GuildChannel['type'], ChannelType.GUILD_NEWS>
  nsfw?: boolean
  bitrate?: number
  user_limit?: number
  parent_id?: Snowflake
  position?: number
  permission_overwrites?: PermissionOverwrite[]
  rate_limit_per_user?: number
}
