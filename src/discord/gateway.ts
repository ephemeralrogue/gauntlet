import type {Snowflake} from 'discord.js'
import type {Channel, Message} from './Channel'
import type {GuildEmoji, ReactionEmoji} from './Emoji'
import type {FullGuild, GuildMember} from './Guild'
import type {InviteWithMetadata} from './Invite'
import type {User} from './User'
import type {VoiceState} from './Voice'
import type {Role} from './permissions'
import type {Timestamp} from './utils'

/** https://discord.com/developers/docs/topics/gateway#update-status-status-types */
type ActivityStatus = 'online' | 'dnd' | 'idle' | 'invisible' | 'offline'
type ActiveActivityStatus = Exclude<ActivityStatus, 'invisible' | 'offline'>

/** https://discord.com/developers/docs/topics/gateway#activity-object-activity-types */
export const enum ActivityType {
  GAME,
  STREAMING,
  LISTENING,
  CUSTOM = 4
}

/** https://discord.com/developers/docs/topics/gateway#activity-object-activity-flags */
const enum ActivityFlags {
  INSTANCE = 1 << 0,
  JOIN = 1 << 1,
  SPECTATE = 1 << 2,
  JOIN_REQUEST = 1 << 3,
  SYNC = 1 << 4,
  PLAY = 1 << 5
}

/** https://discord.com/developers/docs/topics/gateway#activity-object-activity-timestamps */
export interface ActivityTimestamps {
  start?: Timestamp
  end?: Timestamp
}

/** https://discord.com/developers/docs/topics/gateway#activity-object-activity-emoji */
export interface ActivityEmoji {
  name: string
  id?: Snowflake
  animated?: boolean
}

/** https://discord.com/developers/docs/topics/gateway#activity-object-activity-party */
export interface ActivityParty {
  id?: string
  size?: [number, number]
}

/** https://discord.com/developers/docs/topics/gateway#activity-object-activity-assets */
export interface ActivityAssets {
  large_image?: string
  large_text?: string
  small_image?: string
  small_text?: string
}

/** https://discord.com/developers/docs/topics/gateway#activity-object-activity-secrets */
/* export interface ActivitySecrets {
  join?: string
  spectate?: string
  match?: string
} */

/** https://discord.com/developers/docs/topics/gateway#client-status-object */
interface ClientStatus {
  desktop?: ActiveActivityStatus
  mobile?: ActiveActivityStatus
  web?: ActiveActivityStatus
}

/** https://discord.com/developers/docs/topics/gateway#activity-object */
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

/** https://discord.com/developers/docs/topics/gateway#update-status-gateway-status-update-structure */
export interface StatusUpdate {
  since: number | null
  game: Activity | null
  status: ActivityStatus
  afk: boolean
}

/** https://discord.com/developers/docs/topics/gateway#presence-update-presence-update-event-fields */
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

/** https://discord.com/developers/docs/topics/gateway#get-gateway-bot-json-response */
export interface GatewayData {
  url: string
  shards: number
  session_start_limit: {
    total: number
    remaining: number
    reset_after: number
  }
}

/** https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure */
interface PacketBase<T extends string, U extends Record<string, any>> {
  t: T
  d: U
}

/** https://discord.com/developers/docs/topics/gateway#channel-create */
export type ChannelCreate = PacketBase<'CHANNEL_CREATE', Channel>
/** https://discord.com/developers/docs/topics/gateway#channel-update */
export type ChannelUpdate = PacketBase<'CHANNEL_UPDATE', Channel>
/** https://discord.com/developers/docs/topics/gateway#channel-delete */
export type ChannelDelete = PacketBase<'CHANNEL_DELETE', Channel>

/** https://discord.com/developers/docs/topics/gateway#guild-create */
export type GuildCreate = PacketBase<'GUILD_CREATE', FullGuild>

/** https://discord.com/developers/docs/topics/gateway#guild-ban-add */
export type GuildBanAdd = PacketBase<
  'GUILD_BAN_ADD',
  {
    guild_id: Snowflake
    user: User
  }
>

/** https://discord.com/developers/docs/topics/gateway#guild-ban-remove */
export type GuildBanRemove = PacketBase<
  'GUILD_BAN_REMOVE',
  {
    guild_id: Snowflake
    user: User
  }
>

/** https://discord.com/developers/docs/topics/gateway#guild-emojis-update */
export type GuildEmojisUpdate = PacketBase<
  'GUILD_EMOJIS_UPDATE',
  {
    guild_id: Snowflake
    emojis: GuildEmoji[]
  }
>

/** https://discord.com/developers/docs/topics/gateway#guild-integrations-update */
export type GuildIntegrationsUpdate = PacketBase<
  'GUILD_INTEGRATIONS_UPDATE',
  {guild_id: Snowflake}
>

/** https://discord.com/developers/docs/topics/gateway#guild-member-add */
export type GuildMemberAdd = PacketBase<
  'GUILD_MEMBER_ADD',
  GuildMember & {guild_id: Snowflake}
>

/** https://discord.com/developers/docs/topics/gateway#guild-member-remove */
export type GuildMemberRemove = PacketBase<
  'GUILD_MEMBER_REMOVE',
  {
    guild_id: Snowflake
    user: User
  }
>

/** https://discord.com/developers/docs/topics/gateway#guild-member-update */
export type GuildMemberUpdate = PacketBase<
  'GUILD_MEMBER_UPDATE',
  {
    guild_id: Snowflake
    roles: Snowflake[]
    user: User
    nick?: string | null
    premium_since?: Timestamp | null
  }
>

/** https://discord.com/developers/docs/topics/gateway#guild-members-chunk */
export type GuildMembersChunk = PacketBase<
  'GUILD_MEMBERS_CHUNK',
  {
    guild_id: Snowflake
    members: GuildMember[]
    // chunk_index: number
    // chunk_count: number
    // not_found?: Snowflake[]
    presences?: Presence[]
    // nonce?: string
  }
>

/** https://discord.com/developers/docs/topics/gateway#guild-role-delete */
export type GuildRoleDelete = PacketBase<
  'GUILD_ROLE_DELETE',
  {
    guild_id: Snowflake
    role_id: Snowflake
  }
>

/** https://discord.com/developers/docs/topics/gateway#guild-role-update */
export type GuildRoleUpdate = PacketBase<
  'GUILD_ROLE_UPDATE',
  {
    guild_id: Snowflake
    role: Role
  }
>

/** https://discord.com/developers/docs/topics/gateway#invite-create */
export type InviteCreate = PacketBase<
  'INVITE_CREATE',
  Pick<
    InviteWithMetadata,
    | 'code'
    | 'max_age'
    | 'max_uses'
    | 'target_user'
    | 'target_user_type'
    | 'temporary'
  > & {
    channel_id: Snowflake
    created_at: Timestamp
    guild_id?: Snowflake
    inviter?: User
    uses: 0
  }
>

/** https://discord.com/developers/docs/topics/gateway#message-create */
export type MessageCreate = PacketBase<'MESSAGE_CREATE', Message>

/** https://discord.com/developers/docs/topics/gateway#message-delete */
export type MessageDelete = PacketBase<
  'MESSAGE_DELETE',
  {
    id: Snowflake
    channel_id: Snowflake
    guild_id?: Snowflake
  }
>

/** https://discord.com/developers/docs/topics/gateway#message-delete-bulk */
export type MessageDeleteBulk = PacketBase<
  'MESSAGE_DELETE_BULK',
  {
    ids: Snowflake[]
    channel_id: Snowflake
    guild_id?: Snowflake
  }
>

/* export type MessageUpdate = PacketBase<
  'MESSAGE_UPDATE',
  Partial<Message> & Pick<Message, 'id' | 'channel_id'>
> */
/** https://discord.com/developers/docs/topics/gateway#message-update */
export type MessageUpdate = PacketBase<
  'MESSAGE_UPDATE',
  Partial<Message> & Pick<Message, 'id'>
>

/** https://discord.com/developers/docs/topics/gateway#message-reaction-remove-all-message-reaction-remove-all-event-fields */
interface ReactionRemoveAllData {
  channel_id: Snowflake
  message_id: Snowflake
  guild_id?: Snowflake
}

/** https://discord.com/developers/docs/topics/gateway#message-reaction-remove-message-reaction-remove-event-fields */
interface ReactionRemoveData extends ReactionRemoveAllData {
  user_id: Snowflake
  emoji: ReactionEmoji
}

/** https://discord.com/developers/docs/topics/gateway#message-reaction-add */
export type MessageReactionAdd = PacketBase<
  'MESSAGE_REACTION_ADD',
  ReactionRemoveData & {
    member?: GuildMember
  }
>

/** https://discord.com/developers/docs/topics/gateway#message-reaction-remove */
export type MessageReactionRemove = PacketBase<
  'MESSAGE_REACTION_REMOVE',
  ReactionRemoveData
>

/** https://discord.com/developers/docs/topics/gateway#message-reaction-remove-all */
export type MessageReactionRemoveAll = PacketBase<
  'MESSAGE_REACTION_REMOVE_ALL',
  ReactionRemoveAllData
>

/** https://discord.com/developers/docs/topics/gateway#message-reaction-remove-emoji */
export type MessageReactionRemoveEmoji = PacketBase<
  'MESSAGE_REACTION_REMOVE_EMOJI',
  ReactionRemoveAllData & {
    emoji: ReactionEmoji
  }
>

/** https://discord.com/developers/docs/topics/gateway#typing-start */
export type TypingStart = PacketBase<
  'TYPING_START',
  {
    channel_id: Snowflake
    guild_id?: Snowflake
    user_id: Snowflake
    timestamp: Timestamp
    member?: GuildMember
  }
>

/** https://discord.com/developers/docs/topics/gateway#voice-state-update */
export type VoiceStateUpdate = PacketBase<'VOICE_STATE_UPDATE', VoiceState>

/** https://discord.com/developers/docs/topics/gateway#webhooks-update */
export type WebhooksUpdate = PacketBase<
  'WEBHOOKS_UPDATE',
  {
    guild_id: Snowflake
    channel_id: Snowflake
  }
>

export type Packet =
  | ChannelCreate
  | ChannelUpdate
  | ChannelDelete
  | GuildCreate
  | GuildBanAdd
  | GuildBanRemove
  | GuildEmojisUpdate
  | GuildIntegrationsUpdate
  | GuildMemberAdd
  | GuildMemberRemove
  | GuildMemberUpdate
  | GuildMembersChunk
  | GuildRoleDelete
  | GuildRoleUpdate
  | InviteCreate
  | MessageCreate
  | MessageDelete
  | MessageDeleteBulk
  | MessageUpdate
  | MessageReactionAdd
  | MessageReactionRemove
  | MessageReactionRemoveAll
  | MessageReactionRemoveEmoji
  | TypingStart
  | VoiceStateUpdate
  | WebhooksUpdate
