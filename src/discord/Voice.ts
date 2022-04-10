import type {Snowflake} from 'discord.js'
import type {GuildMember} from './Guild'

/** https://discord.com/developers/docs/resources/voice#voice-state-object */
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
  // suppress: boolean
}

/** https://discord.com/developers/docs/resources/voice#voice-region-object */
export interface VoiceRegion {
  id: string
  name: string
  vip: boolean
  optimal: boolean
  deprecated: boolean
  custom: boolean
}
