import Discord from 'discord.js'
import * as Data from '../../data'
import defaults from '../../defaults'
import {mergeDefault} from '../../util'
import {TextBasedChannelBase} from './TextBasedChannel'
import type {Client} from '../../client'
import type {MessageManager} from '../../managers'
import type {User} from '../User'
import type {Send} from './TextBasedChannel'

export class DMChannel extends TextBasedChannelBase.applyToClass(
  // Discord.js' types are incorrect and incorrectly have bulkDelete on DMChannel
  Discord.DMChannel,
  true,
  ['bulkDelete']
) {
  client!: Client
  messages!: MessageManager
  recipient!: User
  send!: Send

  constructor(client: Client, data?: Partial<Data.DMChannel>) {
    super(client, mergeDefault(defaults.dmChannel, data))
  }

  toData(): Data.DMChannel {
    return {
      id: this.id,
      type: Data.ChannelType.DM,
      last_message_id: this.lastMessageID,
      recipients: [this.recipient.toData()]
    }
  }
}
