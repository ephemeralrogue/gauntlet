import Discord from 'discord.js'
import defaults from '../defaults'
import {mergeDefault} from '../util'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Base, Guild, GuildMember, VoiceChannel, VoiceChannelResolvable} from '.'

export class VoiceState extends Discord.VoiceState implements Base {
  channel!: VoiceChannel | null
  client!: Client
  guild!: Guild
  readonly member!: GuildMember | null
  setDeaf!: (deaf: boolean, reason?: string) => Promise<GuildMember>
  setMute!: (mute: boolean, reason?: string) => Promise<GuildMember>
  setChannel!: (channel: VoiceChannelResolvable | null, reason?: string) => Promise<GuildMember>

  constructor(guild: Guild, data?: Partial<Data.VoiceState>) {
    super(guild, mergeDefault({...defaults.voiceState, guild_id: guild.id}, data))
  }

  toData(): Data.VoiceState {
    return {
      guild_id: this.guild.id,
      // TODO: FIx Discord.js because channel_id is nullable and can't be undefined
      // channel_id: this.channelID,
      channel_id: this.channelID ?? null,
      user_id: this.id,
      // Discord.js says session_id, serverDeaf, serverMute, selfDeaf, selfMute are nullable but in the API it isn't
      session_id: this.sessionID!,
      deaf: this.serverDeaf!,
      mute: this.serverMute!,
      self_deaf: this.selfDeaf!,
      self_mute: this.selfMute!,
      self_stream: this.streaming,
      // Discord.js doesn't store the suppress key
      suppress: false
    }
  }
}
