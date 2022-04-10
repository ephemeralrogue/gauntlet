import DiscordReactionManager from '../../node_modules/discord.js/src/managers/ReactionManager'
import {MessageReaction} from '../structures/MessageReaction'
import {apiError, channelThrowPermissionsError} from '../util'
import manager from './BaseManager'
import type {Collection, MessageReactionResolvable, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Message} from '../structures'

export class ReactionManager extends manager<
DiscordReactionManager, typeof MessageReaction, MessageReactionResolvable
>(DiscordReactionManager) {
  readonly client!: Client
  cache!: Collection<Snowflake, MessageReaction>
  holds!: typeof MessageReaction
  message!: Message
  add!: (data?: Partial<Data.Reaction>, cache?: boolean) => MessageReaction
  resolve!: (resolvable: MessageReactionResolvable) => MessageReaction | null

  constructor(message: Message, iterable?: Iterable<Data.Reaction>) {
    super(message.client, iterable, MessageReaction)
  }

  /** Removes all reactions from a message. */
  async removeAll(): Promise<Message> {
    const path = `/channels/${this.message.channel.id}/messages/${this.message.id}/reactions`
    const method = 'delete'
    if (this.message.deleted) apiError('UNKNOWN_MESSAGE', path, method)
    channelThrowPermissionsError(this.message.channel, 'MANAGE_MESSAGES', path, method, true)
    this.client.ws._handlePacket({
      t: 'MESSAGE_REACTION_REMOVE_ALL',
      d: {
        channel_id: this.message.channel.id,
        message_id: this.message.id,
        guild_id: this.message.guild?.id
      }
    })
    return this.message
  }
}
