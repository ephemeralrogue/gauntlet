import Discord from 'discord.js'
import defaults from '../defaults'
import {apiError, mergeDefault, throwPermissionsError} from '../util'
import type {Client} from '../client'
import type * as Data from '../data'
import type {ReactionUserManager} from '../managers'
import type {ErrorCode} from '../util'
import type {Message, ReactionEmoji} from '.'

export class MessageReaction extends Discord.MessageReaction {
  readonly emoji!: ReactionEmoji
  message!: Message
  users!: ReactionUserManager
  fetch!: () => Promise<this>

  constructor(client: Client, data: Partial<Data.Reaction> | undefined, message: Message) {
    super(client, mergeDefault(defaults.messageReaction, data), message)
  }

  async remove(): Promise<this> {
    const path = `/channels/${this.message.channel.id}/messages/${this.message.id}/reactions/${this.emoji.identifier}`
    const method = 'delete'
    const throwError: (error: ErrorCode) => never = (error: ErrorCode): never => apiError(error, path, method)
    if (!this.message.guild) throwError('DM_CHANNEL')
    if (this.message.deleted) throwError('UNKNOWN_MESSAGE')
    throwPermissionsError(this.message.guild.me, 'MANAGE_MESSAGES', path, method)

    if (this.message.client._hasIntent('GUILD_MESSAGE_REACTIONS')) {
      this.message.client.ws._handlePacket({
        t: 'MESSAGE_REACTION_REMOVE_EMOJI',
        d: {
          channel_id: this.message.channel.id,
          guild_id: this.message.guild.id,
          message_id: this.message.id,
          emoji: this.emoji.toData()
        }
      })
    }
    return this
  }
}
