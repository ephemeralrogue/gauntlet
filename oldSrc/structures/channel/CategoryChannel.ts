import Discord from 'discord.js'
import defaults from '../../defaults'
import {mergeDefault} from '../../util'
import {GuildChannelBase} from './GuildChannel'
import type {Collection, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type * as Data from '../../data'
import type {Guild, GuildChannel} from '..'
import type {CreateInvite, FetchInvites} from './GuildChannel'

export class CategoryChannel extends GuildChannelBase.applyToClass(Discord.CategoryChannel) {
  client!: Client
  guild!: Guild
  readonly children!: Collection<Snowflake, GuildChannel>

  createInvite!: CreateInvite
  fetchInvites!: FetchInvites

  constructor(guild: Guild, data?: Partial<Data.CategoryChannel>) {
    super(guild, mergeDefault(defaults.categoryChannel, data))
  }
}
