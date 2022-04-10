import type {Guild} from 'discord.js'

type Messages = {
  [K in
    | 'CLIENT_INVALID_PROVIDED_SHARDS'
    | 'TOKEN_INVALID'
    | 'TOKEN_MISSING'
    | 'WS_CLOSE_REQUESTED'
    | 'WS_CONNECTION_EXISTS'
    | 'BITFIELD_INVALID'
    | 'SHARDING_INVALID'
    | 'SHARDING_REQUIRED'
    | 'INVALID_INTENTS'
    | 'DISALLOWED_INTENTS'
    | 'SHARDING_NO_SHARDS'
    | 'SHARDING_IN_PROCESS'
    | 'COLOR_RANGE'
    | 'COLOR_CONVERT'
    | 'EMBED_FIELD_NAME'
    | 'EMBED_FIELD_VALUE'
    | 'USER_NO_DMCHANNEL'
    | 'VOICE_INVALID_HEARTBEAT'
    | 'VOICE_USER_MISSING'
    | 'VOICE_CONNECTION_TIMEOUT'
    | 'VOICE_TOKEN_ABSENT'
    | 'VOICE_SESSION_ABSENT'
    | 'VOICE_INVALID_ENDPOINT'
    | 'VOICE_NO_BROWSER'
    | 'VOICE_JOIN_SOCKET_CLOSED'
    | 'VOICE_PLAY_INTERFACE_NO_BROADCAST'
    | 'VOICE_PLAY_INTERFACE_BAD_TYPE'
    | 'VOICE_PRISM_DEMUXERS_NEED_STREAM'
    | 'VOICE_STATE_UNCACHED_MEMBER'
    | 'VOICE_STATE_NOT_OWN'
    | 'UDP_SEND_FAIL'
    | 'UDP_ADDRESS_MALFORMED'
    | 'UDP_CONNECTION_EXISTS'
    | 'REQ_RESOURCE_TYPE'
    | 'MESSAGE_BULK_DELETE_TYPE'
    | 'MESSAGE_NONCE_TYPE'
    | 'TYPING_COUNT'
    | 'SPLIT_MAX_LEN'
    | 'FETCH_BAN_RESOLVE_ID'
    | 'PRUNE_DAYS_TYPE'
    | 'GUILD_CHANNEL_RESOLVE'
    | 'GUILD_VOICE_CHANNEL_RESOLVE'
    | 'GUILD_CHANNEL_ORPHAN'
    | 'GUILD_OWNED'
    | 'GUILD_MEMBERS_TIMEOUT'
    | 'GUILD_UNCACHED_ME'
    | 'WEBHOOK_MESSAGE'
    | 'EMOJI_TYPE'
    | 'EMOJI_MANAGED'
    | 'REACTION_RESOLVE_USER'
    | 'VANITY_URL'
    | 'DELETE_GROUP_DM_CHANNEL'
    | 'FETCH_GROUP_DM_CHANNEL']: string
} & {
  CLIENT_INVALID_OPTION: (prop: string, must: string) => string

  WS_NOT_OPEN: (data?: string) => string

  SHARDING_ALREADY_SPAWNED: (count: number) => string
  SHARDING_PROCESS_EXISTS: (id: number) => string
  SHARDING_READY_TIMEOUT: (id: number) => string
  SHARDING_READY_DISCONNECTED: (id: number) => string
  SHARDING_READY_DIED: (id: number) => string

  FILE_NOT_FOUND: (file: string) => string

  VOICE_JOIN_CHANNEL: (full?: boolean) => string
  VOICE_CONNECTION_ATTEMPTS_EXCEEDED: (attempts: number) => string

  VOICE_STATE_INVALID_TYPE: (name: string) => string

  IMAGE_FORMAT: (format: string) => string
  IMAGE_SIZE: (size: number) => number

  BAN_RESOLVE_ID: (ban?: boolean) => string

  INVALID_TYPE: (name: string, expected: string, an?: boolean) => string

  MISSING_MANAGE_EMOJIS_PERMISSION: (guild: Guild) => string
}
export default Messages
