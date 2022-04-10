import type {Snowflake} from 'discord.js'
import type {Channel, GuildChannel, Message} from './Channel'
import type {GuildEmoji, ReactionEmoji} from './Emoji'
import type {Guild, GuildMember, VoiceState} from './Guild'
import type {InviteWithMetadata} from './Invite'
import type {User} from './User'
import type {Role} from './permissions'
import type {Timestamp} from './utils'

export const enum ActivityStatusEnum {
  ONLINE = 'online',
  DO_NOT_DISTURB = 'dnd',
  IDLE = 'idle',
  INVISIBLE = 'invisible',
  OFFLINE = 'offline'
}

type ActivityStatusString = 'online' | 'dnd' | 'idle' | 'invisible' | 'offline'

type ActivityStatus = ActivityStatusEnum | ActivityStatusString

type ActiveActivityStatus = Exclude<
ActivityStatusEnum | ActivityStatusString,
ActivityStatusEnum.INVISIBLE | ActivityStatusEnum.OFFLINE | 'invisible' | 'offline'
>

export const enum ActivityType {
  GAME,
  STREAMING,
  LISTENING,
  CUSTOM = 4
}

const enum ActivityFlags {
  INSTANCE = 1 << 0,
  JOIN = 1 << 1,
  SPECTATE = 1 << 2,
  JOIN_REQUEST = 1 << 3,
  SYNC = 1 << 4,
  PLAY = 1 << 5
}

export interface ActivityTimestamps {
  start?: Timestamp
  end?: Timestamp
}

export interface ActivityEmoji {
  name: string
  id?: Snowflake
  animated?: boolean
}

export interface ActivityParty {
  id?: string
  size?: [number, number]
}

export interface ActivityAssets {
  large_image?: string
  large_text?: string
  small_image?: string
  small_text?: string
}

export interface ActivitySecrets {
  join?: string
  spectate?: string
  match?: string
}

interface ClientStatus {
  desktop?: ActiveActivityStatus
  mobile?: ActiveActivityStatus
  web?: ActiveActivityStatus
}

export interface Activity {
  name: string
  type: ActivityType
  url?: string | null
  created_at: number
  timestamps: ActivityTimestamps
  application_id?: Snowflake
  details?: string | null
  state?: string | null
  emoji?: ActivityEmoji | null
  party?: ActivityParty
  assets?: ActivityAssets
  // secrets?: ActivitySecrets
  // instance?: boolean
  flags?: ActivityFlags
}

export interface StatusUpdate {
  since: number | null
  game: Activity | null
  status: ActivityStatus
  afk: boolean
}

export interface Presence {
  user: User
  // roles: Snowflake[]
  game: Activity | null
  // game_id: Snowflake
  status: ActivityStatus
  activities: Activity[]
  client_status: ClientStatus
  premium_since?: Timestamp | null
  nick?: string | null
}

export interface GatewayData {
  url: string
  shards: number
  session_start_limit: {
    total: number
    remaining: number
    reset_after: number
  }
}

interface PacketBase<T extends string, U extends Record<string, any>> {
  t: T
  d: U
}

export type ChannelCreate = PacketBase<'CHANNEL_CREATE', Channel>
export type ChannelUpdate = PacketBase<'CHANNEL_UPDATE', Channel>
export type ChannelDelete = PacketBase<'CHANNEL_DELETE', Channel>

export type GuildCreate = PacketBase<'GUILD_CREATE', Guild & {
  joined_at: Timestamp
  large?: boolean
  unavailable?: boolean
  member_count?: number
  voice_states?: Omit<VoiceState, 'guild_id'>[]
  members?: GuildMember[]
  channels?: GuildChannel[]
  presences?: Presence[]
}>

export type GuildEmojiUpdate = PacketBase<'GUILD_EMOJIS_UPDATE', {
  guild_id: Snowflake
  emojis: GuildEmoji[]
}>

export type GuildBanAdd = PacketBase<'GUILD_BAN_ADD', {
  guild_id: Snowflake
  user: User
}>

export type GuildBanRemove = PacketBase<'GUILD_BAN_REMOVE', {
  guild_id: Snowflake
  user: User
}>

export type GuildIntegrationsUpdate = PacketBase<'GUILD_INTEGRATIONS_UPDATE', {guild_id: Snowflake}>

export type GuildMemberAdd = PacketBase<'GUILD_MEMBER_ADD', GuildMember & {guild_id: Snowflake}>

export type GuildMemberRemove = PacketBase<'GUILD_MEMBER_REMOVE', {
  guild_id: Snowflake
  user: User
}>

export type GuildMemberUpdate = PacketBase<'GUILD_MEMBER_UPDATE', {
  guild_id: Snowflake
  roles: Snowflake[]
  user: User
  nick?: string | null
  premium_since?: Timestamp | null
}>

export type GuildMembersChunk = PacketBase<'GUILD_MEMBERS_CHUNK', {
  guild_id: Snowflake
  members: GuildMember[]
  // chunk_index: number
  // chunk_count: number
  // not_found?: Snowflake[]
  presences?: Presence[]
  // nonce?: string
}>

export type GuildRoleDelete = PacketBase<'GUILD_ROLE_DELETE', {
  guild_id: Snowflake
  role_id: Snowflake
}>

export type GuildRoleUpdate = PacketBase<'GUILD_ROLE_UPDATE', {
  guild_id: Snowflake
  role: Role
}>

export type InviteCreate = PacketBase<
'INVITE_CREATE',
& Pick<InviteWithMetadata, 'code' | 'max_age' | 'max_uses' | 'target_user' | 'target_user_type' | 'temporary'>
& {
  channel_id: Snowflake
  created_at: Timestamp
  guild_id?: Snowflake
  inviter?: User
  uses: 0
}>

export type MessageCreate = PacketBase<'MESSAGE_CREATE', Message>

export type MessageDelete = PacketBase<'MESSAGE_DELETE', {
  id: Snowflake
  channel_id: Snowflake
  guild_id?: Snowflake
}>

// export type MessageUpdate = PacketBase<'MESSAGE_UPDATE', Partial<Message> & Pick<Message, 'id' | 'channel_id'>>
export type MessageUpdate = PacketBase<'MESSAGE_UPDATE', Partial<Message> & Pick<Message, 'id'>>

export type MessageDeleteBulk = PacketBase<'MESSAGE_DELETE_BULK', {
  ids: Snowflake[]
  channel_id: Snowflake
  guild_id?: Snowflake
}>

interface ReactionRemoveAllData {
  channel_id: Snowflake
  message_id: Snowflake
  guild_id?: Snowflake
}

interface ReactionRemoveData extends ReactionRemoveAllData {
  user_id: Snowflake
  emoji: ReactionEmoji
}

export type MessageReactionAdd = PacketBase<'MESSAGE_REACTION_ADD', ReactionRemoveData & {
  member?: GuildMember
}>

export type MessageReactionRemove = PacketBase<'MESSAGE_REACTION_REMOVE', ReactionRemoveData>

export type MessageReactionRemoveEmoji = PacketBase<'MESSAGE_REACTION_REMOVE_EMOJI', ReactionRemoveAllData & {
  emoji: ReactionEmoji
}>

export type MessageReactionRemoveAll = PacketBase<'MESSAGE_REACTION_REMOVE_ALL', ReactionRemoveAllData>

export type TypingStart = PacketBase<'TYPING_START', {
  channel_id: Snowflake
  guild_id?: Snowflake
  user_id: Snowflake
  timestamp: Timestamp
  member?: GuildMember
}>

export type VoiceStateUpdate = PacketBase<'VOICE_STATE_UPDATE', VoiceState>

export type WebhooksUpdate = PacketBase<'WEBHOOKS_UPDATE', {
  guild_id: Snowflake
  channel_id: Snowflake
}>

export type Packet =
| ChannelCreate | ChannelUpdate | ChannelDelete
| GuildCreate
| GuildEmojiUpdate
| GuildBanAdd | GuildBanRemove
| GuildIntegrationsUpdate
| GuildMemberAdd | GuildMemberRemove | GuildMemberUpdate
| GuildMembersChunk
| GuildRoleDelete | GuildRoleUpdate
| InviteCreate
| MessageCreate | MessageDelete | MessageDeleteBulk | MessageUpdate
| MessageReactionAdd | MessageReactionRemove | MessageReactionRemoveEmoji | MessageReactionRemoveAll
| TypingStart
| VoiceStateUpdate
| WebhooksUpdate
