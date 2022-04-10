import Discord from 'discord.js'
import type {Snowflake} from 'discord.js'
import type * as Data from '../../data'
import defaults from '../../defaults'
import {mergeDefault} from '../../util'
import type {Guild} from '../Guild'
import type {CreateInvite, FetchInvites} from './GuildChannel'
import {GuildChannelBase} from './GuildChannel'

export type VoiceChannelResolvable = VoiceChannel | Snowflake

export class VoiceChannel extends GuildChannelBase.applyToClass(Discord.VoiceChannel) {
  guild!: Guild
  createInvite!: CreateInvite
  fetchInvites!: FetchInvites

  setBitrate!: (bitrate: number, reason?: string) => Promise<this>
  setUserLimit!: (userLimit: number, reason?: string) => Promise<this>

  constructor(guild: Guild, data?: Partial<Data.VoiceChannel>) {
    super(guild, mergeDefault(defaults.voiceChannel, data))
  }
}
