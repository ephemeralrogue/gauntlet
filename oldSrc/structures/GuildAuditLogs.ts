import Discord from 'discord.js'
import defaults from '../defaults'
import {mergeDefault} from '../util'
import type {Collection, Snowflake} from 'discord.js'
import type * as Data from '../data'
import type {ArrayType} from '../util'
import type {Guild, GuildMember, GuildEmoji, Integration, Invite, Role, User, Webhook, TextChannel, VoiceChannel} from '.'
// import type {GuildChannel} from '.'

export type GuildAuditLogsTarget = Exclude<Discord.GuildAuditLogsTarget, 'ALL' | 'UNKNOWN'>

type ChannelEntry =
| Data.ChannelCreateEntry
| Data.ChannelUpdateEntry
| Data.ChannelDeleteEntry
| Data.ChannelOverwriteCreateEntry
| Data.ChannelOverwriteUpdateEntry
| Data.ChannelOverwriteDeleteEntry
type UserEntry =
| Data.MemberKickBanEntry
| Data.MemberPruneEntry
| Data.MemberUpdateEntry
| Data.MemberRoleUpdateEntry
| Data.MemberMoveEntry
| Data.MemberDisconnectEntry
type RoleEntry = Data.RoleCreateEntry | Data.RoleUpdateEntry | Data.RoleDeleteEntry
type InviteEntry = Data.InviteCreateEntry | Data.InviteDeleteEntry
type WebhookEntry = Data.WebhookCreateEntry | Data.WebhookUpdateEntry | Data.WebhookDeleteEntry
type EmojiEntry = Data.EmojiCreateEntry | Data.EmojiUpdateEntry | Data.EmojiDeleteEntry
type MessageEntry = Data.MessageDeleteEntry | Data.MessageBulkDeleteEntry | Data.MessagePinEntry
type IntegrationEntry = Data.IntegrationCreateEntry | Data.IntegrationUpdateEntry | Data.IntegrationDeleteEntry

interface Creation<K, V> {
  key: K
  new_value: V
}
interface Deletion<K, V> {
  key: K
  old_value: V
}
type Change<K, V> = Creation<K, V> & Deletion<K, V>
type _<T extends Creation<string, any> | Deletion<string, any> | Change<string, any>> =
T extends Change<infer K, infer V> ? {key: K, old: V, new: V} :
T extends Creation<infer K, infer V> ? {key: K, new: V} :
T extends Deletion<infer K, infer V> ? {key: K, old: V} :
never

export class GuildAuditLogsEntry<T extends Data.AuditLogEntry = Data.AuditLogEntry> extends Discord.GuildAuditLogs.Entry {
  changes!: T extends {changes: any[]} ? _<ArrayType<T['changes']>>[] : null
  executor!: User

  extra!:
  T extends Data.MemberPruneEntry ? {removed: number, days: number} :
  T extends Data.MemberMoveEntry | Data.MessageDeleteEntry | Data.MessageBulkDeleteEntry ? {
    channel: (T extends Data.MemberMoveEntry ? VoiceChannel : TextChannel) | {id: Snowflake}
    count: number
  } :
  T extends Data.MessagePinEntry ? {channel: TextChannel | {id: Snowflake}, messageID: Snowflake} :
  T extends Data.MemberDisconnectEntry ? {count: number} :
  T extends Data.ChannelOverwriteCreateEntry | Data.ChannelOverwriteUpdateEntry | Data.ChannelOverwriteDeleteEntry
    ? T['options']['type'] extends 'member'
      ? GuildMember | {id: Snowflake, type: 'member'}
      : Role | {id: Snowflake, name: string, type: 'role'}
    : null

  // TODO: fix Discord.js' AuditLogsEntry#target
  target!:
  T extends Data.GuildUpdateEntry ? Guild :
  // T extends ChannelEntry ? GuildChannel :
  T extends Exclude<UserEntry, Data.MemberMoveEntry | Data.MemberDisconnectEntry> ? User :
  T extends RoleEntry ? Role :
  T extends InviteEntry ? Invite :
  T extends WebhookEntry ? Webhook :
  T extends EmojiEntry ? GuildEmoji :
  // T extends Data.MessageBulkDeleteEntry ? TextChannel :
  T extends MessageEntry ? User :
  T extends IntegrationEntry ? Integration
  : null

  targetType!:
  T extends Data.GuildUpdateEntry ? 'GUILD' :
  T extends ChannelEntry ? 'CHANNEL' :
  T extends UserEntry ? 'USER' :
  T extends RoleEntry ? 'ROLE' :
  T extends InviteEntry ? 'INVITE' :
  T extends WebhookEntry ? 'WEBHOOK' :
  T extends EmojiEntry ? 'EMOJI' :
  T extends MessageEntry ? 'MESSAGE' :
  T extends IntegrationEntry ? 'INTEGRATION'
  : never

  constructor(logs: GuildAuditLogs, guild: Guild, data?: Partial<T>) {
    // TODO: fix defaults for different audit log entries
    super(logs, guild, mergeDefault(defaults.guildAuditLogEntry, data))
  }
}

export class GuildAuditLogs extends Discord.GuildAuditLogs {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Entry is a class
  static Entry = GuildAuditLogsEntry
  entries!: Collection<Snowflake, GuildAuditLogsEntry>

  constructor(guild: Guild, data?: Partial<Data.AuditLog>) {
    super(guild, mergeDefault(defaults.guildAuditLog, data))
  }

  /** Handles possible promises for entry targets. */
  static async build(...args: ConstructorParameters<typeof GuildAuditLogs>): Promise<GuildAuditLogs> {
    const logs = new GuildAuditLogs(...args)
    await Promise.all(logs.entries.map(e => e.target))
    return logs
  }
}
