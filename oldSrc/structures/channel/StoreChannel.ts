import Discord from 'discord.js'
import defaults from '../../defaults'
import {mergeDefault} from '../../util'
import {GuildChannelBase} from './GuildChannel'
import type * as Data from '../../data'
import type {Guild} from '../Guild'
import type {CreateInvite, FetchInvites} from './GuildChannel'

export class StoreChannel extends GuildChannelBase.applyToClass(Discord.StoreChannel) {
  guild!: Guild
  createInvite!: CreateInvite
  fetchInvites!: FetchInvites

  constructor(guild: Guild, data?: Partial<Data.StoreChannel>) {
    super(guild, mergeDefault(defaults.storeChannel, data))
  }
}
