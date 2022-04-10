import APIMessage from './structures/APIMessage'
import {User} from './structures'
import {send} from './structures/channel/TextBasedChannel'
import type {MessageAdditions, MessageOptions, StringResolvable} from 'discord.js'
import type {
  MessageOptionsWithoutSplit, MessageOptionsWithSplit
} from '../node_modules/discord.js/src/structures/interfaces/TextBasedChannel'
import type {Message} from './structures'
import type {Sendable} from './structures/channel/TextBasedChannel'

export default class TestUser extends User {
  sendTo = this.sendIn.bind(this)

  async sendIn(
    channel: Sendable, options: MessageOptionsWithoutSplit | MessageAdditions | APIMessage
  ): Promise<Message>
  async sendIn(
    channel: Sendable, options: MessageOptionsWithSplit & {content: StringResolvable} | APIMessage
  ): Promise<Message[]>
  async sendIn(
    channel: Sendable, options: MessageOptions & {content: StringResolvable} | APIMessage
  ): Promise<Message | Message[]>
  async sendIn(
    channel: Sendable, content: StringResolvable, options?: MessageOptionsWithoutSplit | MessageAdditions
  ): Promise<Message>
  async sendIn(
    channel: Sendable, content: StringResolvable, options?: MessageOptionsWithSplit
  ): Promise<Message[]>
  async sendIn(
    channel: Sendable, content: StringResolvable, options?: MessageOptions | MessageAdditions
  ): Promise<Message | Message[]>
  async sendIn(
    channel: Sendable, ...content: [StringResolvable, (MessageOptions | MessageAdditions)?]
  ): Promise<Message | Message[]> {
    return send(
      {
        channel,
        author: this,
        member: 'guild' in channel ? channel.guild.member(this) : undefined,
        sendFunction: async (c, m) => this.sendIn(c, m)
      },
      ...content
    )
  }
}
