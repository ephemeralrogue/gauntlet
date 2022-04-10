import {Collection} from 'discord.js'
import DiscordPartialGroupDMChannel from '../../../node_modules/discord.js/src/structures/PartialGroupDMChannel'
import * as Data from '../../data'
import defaults from '../../defaults'
import {mergeDefault} from '../../util'
import {ChannelBase} from './Channel'
import type {Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type {Invite} from '..'

export class PartialGroupDMChannel extends ChannelBase.applyToClass(DiscordPartialGroupDMChannel) {
  client!: Client
  type!: 'group'
  _invites = new Collection<string, Invite>()

  constructor(client: Client, data?: Partial<Data.PartialGroupDMChannel>) {
    super(client, mergeDefault(defaults.dmChannel, data))
  }

  toData(): Data.PartialGroupDMChannel {
    return {
      ...super.toData() as {id: Snowflake, type: Data.ChannelType.GROUP_DM},
      name: this.name,
      icon: this.icon
    }
  }
}
