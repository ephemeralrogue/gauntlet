import Discord from 'discord.js'
import {Error} from '../../node_modules/discord.js/src/errors'
import defaults from '../defaults'
import {applyToClass, mergeDefault} from '../util'
import {TextBasedChannelBase} from './channel'
import type {ChannelResolvable} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Base, DMChannel, Presence} from '.'
import type {BulkDelete, Send} from './channel/TextBasedChannel'

export class User extends TextBasedChannelBase.applyToClass(Discord.User) implements Base {
  static applyToClass = applyToClass(User)

  client!: Client
  readonly dmChannel!: DMChannel
  readonly presence!: Presence
  bulkDelete!: BulkDelete
  send!: Send
  equals!: (user: User) => boolean
  fetch!: () => Promise<User>
  typingDurationIn!: (channel: ChannelResolvable) => number
  typingIn!: (channel: ChannelResolvable) => boolean
  typingSinceIn!: (channel: ChannelResolvable) => Date

  constructor(client: Client, data?: Partial<Data.User>) {
    super(client, mergeDefault(defaults.user, data))
  }

  async createDM(): Promise<DMChannel> {
    const {dmChannel} = this
    // eslint-disable-next-line max-len -- can't include description for comment
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions -- types don't include partial users
    if (dmChannel && !dmChannel.partial) return dmChannel

    const data: Data.DMChannel = mergeDefault(defaults.dmChannel, {recipients: [this.toData()]})
    if (this.client._hasIntent('DIRECT_MESSAGES')) this.client.ws._handlePacket({t: 'CHANNEL_CREATE', d: data})

    return this.client._actions.ChannelCreate.handle(data).channel as DMChannel
  }

  async deleteDM(): Promise<DMChannel> {
    const {dmChannel} = this
    // eslint-disable-next-line max-len -- can't include description for comment
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions -- types don't include partial users
    if (!dmChannel) throw new Error('USER_NO_DMCHANNEL')

    return this.client._actions.ChannelDelete.handle(this.dmChannel.toData()).channel as DMChannel
  }

  toData(): Data.User {
    return {
      id: this.id,
      username: this.username,
      discriminator: this.discriminator,
      avatar: this.avatar,
      bot: this.bot,
      system: this.system,
      locale: this.locale
    }
  }
}
