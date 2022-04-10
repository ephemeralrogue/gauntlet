import type {Collection, Snowflake} from 'discord.js'
import type * as Data from '../data'
import type {
  Channel, ClientUser, DMChannel, Guild, GuildEmoji, Message, MessageReaction,
  NewsChannel, Role, TextBasedChannelBase, TextChannel, User
} from '../structures'

interface ActionMultipleArgs<T extends any[], U extends Record<string, any>> {
  handle(...args: T): U
  getMessage(
    data: ({id: Snowflake} | {message_id: Snowflake}) & {guild_id?: Snowflake},
    channel: TextBasedChannelBase,
    cache?: boolean
  ): Message | undefined
}

type Action<T extends Record<string, any>, U extends Record<string, any>> = ActionMultipleArgs<[T], U>

export interface ActionsManager {
  /* eslint-disable @typescript-eslint/naming-convention -- names of properties are from Discord.js */
  ChannelCreate: Action<Data.Channel, {channel: Channel}>
  ChannelDelete: Action<Data.Channel, {channel: Channel}>
  GuildChannelsPositionUpdate: Action<{guild_id: Snowflake, channels: {id: Snowflake, position: number}[]}, {guild: Guild}>
  GuildEmojiCreate: ActionMultipleArgs<[Guild, Data.GuildEmoji], {emoji: GuildEmoji}>
  GuildDelete: Action<{id: Snowflake}, {guild: Guild | null}>
  GuildUpdate: Action<Data.Guild, {old: Guild, updated: Guild}>
  GuildRoleCreate: Action<{guild_id: Snowflake, role: Data.Role}, {role: Role}>
  GuildRoleDelete: Action<NonNullable<Data.GuildRoleDelete['d']>, {role: Role}>
  GuildRolesPositionUpdate: Action<{guild_id: Snowflake, roles: {id: Snowflake, position: number}[]}, {guild: Guild}>
  MessageCreate: Action<Data.Message, {message: Message}>
  MessageDelete: Action<{id: Snowflake, channel_id: Snowflake, guild_id?: Snowflake}, {message: Message}>
  MessageDeleteBulk: Action<Data.MessageDeleteBulk['d'], {messages?: Collection<Snowflake, Message>}>
  MessageReactionAdd: Action<{
    user: ClientUser
    channel: TextChannel | NewsChannel | DMChannel
    message: Message
    emoji: {
      animated: boolean
      name: string
      id: string | null
    } | null
  }, {message: Message, reaction: MessageReaction, user: User}>
  UserUpdate: Action<Data.User, {old: User, updated: User} | {old: null, updated: null}>
  /* eslint-enable @typescript-eslint/naming-convention -- see above */
}
