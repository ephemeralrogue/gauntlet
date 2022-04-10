import Discord from 'discord.js'
import defaults from '../../defaults'
import {mergeDefault} from '../../util'
import {TextChannel} from './TextChannel'
import type {Client} from '../../client'
import type * as Data from '../../data'
import type {Guild} from '../Guild'
import type {CreateInvite, FetchInvites} from './GuildChannel'
import type {BulkDelete, Send} from './TextBasedChannel'

export class NewsChannel extends TextChannel.applyToClass(Discord.NewsChannel) {
  client!: Client
  guild!: Guild
  type!: 'news'

  bulkDelete!: BulkDelete
  send!: Send
  createInvite!: CreateInvite
  fetchInvites!: FetchInvites

  constructor(guild: Guild, data?: Partial<Data.NewsChannel>) {
    super(guild, mergeDefault(defaults.newsChannel, data))
  }
}
