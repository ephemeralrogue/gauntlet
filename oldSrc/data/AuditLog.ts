// TODO: clean up this entire file

import type {Snowflake} from 'discord.js'
import type {ValueOf} from '../util'
import type {ChannelType, GuildChannel} from './Channel'
import type {Guild, Integration} from './Guild'
import type {InviteWithMetadata} from './Invite'
import type {User} from './User'
import type {Webhook} from './Webhook'
import type {Role, PermissionOverwrite} from './permissions'

export const enum AuditLogEvent {
  GUILD_UPDATE = 1,
  CHANNEL_CREATE = 10,
  CHANNEL_UPDATE,
  CHANNEL_DELETE,
  CHANNEL_OVERWRITE_CREATE,
  CHANNEL_OVERWRITE_UPDATE,
  CHANNEL_OVERWRITE_DELETE,
  MEMBER_KICK = 20,
  MEMBER_PRUNE,
  MEMBER_BAN_ADD,
  MEMBER_BAN_REMOVE,
  MEMBER_UPDATE,
  MEMBER_ROLE_UPDATE,
  MEMBER_MOVE,
  MEMBER_DISCONNECT,
  BOT_ADD,
  ROLE_CREATE = 30,
  ROLE_UPDATE,
  ROLE_DELETE,
  INVITE_CREATE = 40,
  // I don't know how an invite can be updated
  // INVITE_UPDATE,
  INVITE_DELETE = 42,
  WEBHOOK_CREATE = 50,
  WEBHOOK_UPDATE,
  WEBHOOK_DELETE,
  EMOJI_CREATE = 60,
  EMOJI_UPDATE,
  EMOJI_DELETE,
  MESSAGE_DELETE = 72,
  MESSAGE_BULK_DELETE,
  MESSAGE_PIN,
  MESSAGE_UNPIN,
  INTEGRATION_CREATE = 80,
  INTEGRATION_UPDATE,
  INTEGRATION_DELETE
}

interface Creation<K extends string, V> {
  new_value: V
  key: K
}

interface Deletion<K extends string, V> {
  old_value: V
  key: K
}

type Change<K extends string, V> = Creation<K, V> & Deletion<K, V>
export type AnyChange<K extends string, V> = Creation<K, V> | Deletion<K, V> | Change<K, V>

type CreationToChange<T extends Creation<string, any>> = T extends Creation<infer K, infer V> ? Change<K, V> : never
type CreationToDeletion<T extends Creation<string, any>> = T extends Creation<infer K, infer V> ? Deletion<K, V> : never
type ExcludeFromCreation<
  T extends Creation<string, any>,
  K extends T extends Creation<infer K2, any> ? K2 : never
> = Exclude<T, Creation<K, any>>

export type PartialRole = Pick<Role, 'name' | 'id'>

// #region AuditLogEntry
type Entry<
  TActionType extends keyof typeof AuditLogEvent,
  TChanges extends AnyChange<string, any> | null = null,
  TTarget extends boolean = true,
  TOptions extends Record<string, any> | null = null
> = {
  target_id: TTarget extends true ? Snowflake : null
  action_type: typeof AuditLogEvent[TActionType]
  user_id: Snowflake
  id: Snowflake
  reason?: string
} & (
  (TChanges extends null ? never : TChanges)[] extends never[]
    ? unknown
    : {changes: TChanges[]}
) & (TOptions extends null ? unknown : {options: TOptions})

// #region AuditLogEntryInfo
interface ChannelInfo {
  channel_id: Snowflake
}

interface PinInfo extends ChannelInfo {
  message_id: Snowflake
}

interface CountInfo {
  count: string
}

type ChannelCountInfo = ChannelInfo & CountInfo

interface ChannelOverwriteAuditLogEntryInfoBase {
  id: Snowflake
}

interface MemberChannelOverwriteAuditLogEntryInfo extends ChannelOverwriteAuditLogEntryInfoBase {
  type: 'member'
}
interface RoleChannelOverwriteAuditLogEntryInfo extends ChannelOverwriteAuditLogEntryInfoBase {
  type: 'role'
  role_name: string
}

type ChannelOverwriteAuditLogEntryInfo = MemberChannelOverwriteAuditLogEntryInfo | RoleChannelOverwriteAuditLogEntryInfo
// #endregion

export type GuildUpdateEntry = Entry<'GUILD_UPDATE', ValueOf<{[K in
| 'name'
| 'owner_id'
| 'region'
| 'afk_timeout'
| 'mfa_level'
| 'verification_level'
| 'explicit_content_filter'
| 'default_message_notifications'
| 'widget_enabled'
  ]: Change<K, NonNullable<Guild[K]>>
}> | ValueOf<{[K in
| 'afk_channel_id'
| 'vanity_url_code'
| 'widget_channel_id'
| 'system_channel_id'
  ]: AnyChange<K, NonNullable<Guild[K]>>
}> | AnyChange<'icon_hash' | 'splash_hash', string>>

type ChannelCreateChange =
  | Creation<'name', string>
  | Creation<'type', GuildChannel['type']>
  | Creation<'position', number>
  | Creation<'permission_overwrites', PermissionOverwrite[]>
  | Creation<'topic', string | null>
  | Creation<'nsfw', boolean>
  | Creation<'rate_limit_per_user', number>
  | Creation<'bitrate', number>
export type ChannelCreateEntry = Entry<'CHANNEL_CREATE', ChannelCreateChange>
export type ChannelUpdateEntry =
  | Entry<'CHANNEL_UPDATE', CreationToChange<ExcludeFromCreation<ChannelCreateChange, 'type'>
  | {
    // channels can change from text to news and vice versa
    key: 'type'
    old_value: ChannelType.GUILD_TEXT
    new_value: ChannelType.GUILD_NEWS
  } | {
    key: 'type'
    old_value: ChannelType.GUILD_NEWS
    new_value: ChannelType.GUILD_TEXT
  }>>
export type ChannelDeleteEntry = Entry<'CHANNEL_DELETE', CreationToDeletion<ChannelCreateChange>>

type ChannelOverwriteCreateChange = ValueOf<{[K in keyof PermissionOverwrite]: Creation<K, PermissionOverwrite[K]>}>
type ChannelOverwriteEntry<
  TActionType extends keyof typeof AuditLogEvent,
  TChanges extends AnyChange<string, any>
> = Entry<TActionType, TChanges, true, ChannelOverwriteAuditLogEntryInfo>
export type ChannelOverwriteCreateEntry = ChannelOverwriteEntry<'CHANNEL_OVERWRITE_CREATE', ChannelOverwriteCreateChange>
export type ChannelOverwriteUpdateEntry = ChannelOverwriteEntry<
'CHANNEL_OVERWRITE_UPDATE', CreationToChange<ExcludeFromCreation<ChannelOverwriteCreateChange, 'id' | 'type'>>
>
export type ChannelOverwriteDeleteEntry = ChannelOverwriteEntry<
'CHANNEL_OVERWRITE_DELETE', CreationToDeletion<ChannelOverwriteCreateChange>
>

export type MemberKickBanEntry = Entry<'MEMBER_KICK' | 'MEMBER_BAN_ADD' | 'MEMBER_BAN_REMOVE'>
export type MemberPruneEntry = Entry<'MEMBER_PRUNE', null, false, {
  delete_member_days: string
  members_removed: string
}>
export type MemberUpdateEntry = Entry<
'MEMBER_UPDATE', Change<'deaf' | 'mute', boolean> | AnyChange<'nick' | 'avatar_hash', string>
>
export type MemberRoleUpdateEntry = Entry<'MEMBER_ROLE_UPDATE', Creation<'$add' | '$remove', PartialRole[]>>
export type MemberMoveEntry = Entry<'MEMBER_MOVE', null, false, ChannelCountInfo>
export type MemberDisconnectEntry = Entry<'MEMBER_DISCONNECT', null, false, CountInfo>
export type BotAddEntry = Entry<'BOT_ADD'>

type RoleCreateChange = ValueOf<{[K in Exclude<keyof Role, 'id' | 'position' | 'managed'>]: Creation<K, Role[K]>}>
export type RoleCreateEntry = Entry<'ROLE_CREATE', RoleCreateChange>
export type RoleUpdateEntry = Entry<'ROLE_UPDATE', CreationToChange<RoleCreateChange>>
export type RoleDeleteEntry = Entry<'ROLE_DELETE', CreationToDeletion<RoleCreateChange>>

type InviteCreateChange =
  | ValueOf<{[K in 'code' | 'max_uses' | 'uses' | 'max_age' | 'temporary']: Creation<K, InviteWithMetadata[K]>}>
  | Creation<'channel_id' | 'inviter_id', Snowflake>
export type InviteCreateEntry = Entry<'INVITE_CREATE', InviteCreateChange, false>
export type InviteDeleteEntry = Entry<'INVITE_DELETE', CreationToDeletion<InviteCreateChange>, false>

type WebhookCreateChange =
  | ValueOf<{[K in 'channel_id' | 'name' | 'type']: Creation<K, NonNullable<Webhook[K]>>}>
  | Creation<'avatar_hash', string>
export type WebhookCreateEntry = Entry<'WEBHOOK_CREATE', WebhookCreateChange>
export type WebhookUpdateEntry =
  | Entry<'WEBHOOK_UPDATE', CreationToChange<WebhookCreateChange>
  | AnyChange<'avatar_hash', string>>
export type WebhookDeleteEntry = Entry<'WEBHOOK_DELETE', CreationToDeletion<WebhookCreateChange>>

export type EmojiCreateEntry = Entry<'EMOJI_CREATE', Creation<'name', string>>
export type EmojiUpdateEntry = Entry<'EMOJI_UPDATE', Change<'name', string>>
export type EmojiDeleteEntry = Entry<'EMOJI_DELETE', Deletion<'name', string>>

export type MessageDeleteEntry = Entry<'MESSAGE_DELETE', null, true, ChannelCountInfo>
export type MessageBulkDeleteEntry = Entry<'MESSAGE_BULK_DELETE', null, true, CountInfo>
export type MessagePinEntry = Entry<'MESSAGE_PIN' | 'MESSAGE_UNPIN', null, true, PinInfo>

type IntegrationCreateChange = ValueOf<{[K in
| 'name'
| 'type'
// | 'enable_emoticons'
| 'expire_behavior'
| 'expire_grace_period']: Creation<K, NonNullable<Integration[K]>>}> | Creation<'account_id', Snowflake>
export type IntegrationCreateEntry = Entry<'INTEGRATION_CREATE', IntegrationCreateChange>
export type IntegrationUpdateEntry = Entry<'INTEGRATION_UPDATE', CreationToChange<IntegrationCreateChange>>
export type IntegrationDeleteEntry = Entry<'INTEGRATION_DELETE', CreationToDeletion<IntegrationCreateChange>>

export type AuditLogEntry =
  | GuildUpdateEntry
  | ChannelCreateEntry | ChannelUpdateEntry | ChannelDeleteEntry
  | ChannelOverwriteCreateEntry | ChannelOverwriteUpdateEntry | ChannelOverwriteDeleteEntry
  | MemberKickBanEntry | MemberPruneEntry | MemberUpdateEntry | MemberRoleUpdateEntry
  | MemberMoveEntry | MemberDisconnectEntry | BotAddEntry
  | RoleCreateEntry | RoleUpdateEntry | RoleDeleteEntry
  | InviteCreateEntry | InviteDeleteEntry
  | WebhookCreateEntry | WebhookUpdateEntry | WebhookDeleteEntry
  | EmojiCreateEntry | EmojiUpdateEntry | EmojiDeleteEntry
  | MessageDeleteEntry | MessageBulkDeleteEntry | MessagePinEntry
  | IntegrationCreateEntry | IntegrationUpdateEntry | IntegrationDeleteEntry
// #endregion

export interface AuditLog {
  webhooks: Webhook[]
  users: User[]
  audit_log_entries: AuditLogEntry[]
  integrations: Pick<Integration, 'id' | 'name' | 'type' | 'account'>[]
}
