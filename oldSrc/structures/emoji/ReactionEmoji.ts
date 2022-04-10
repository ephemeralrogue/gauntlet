import Discord from 'discord.js'
import defaults from '../../defaults'
import {mergeDefault} from '../../util'
import {Emoji} from './Emoji'
import type {Client} from '../../client'
import type * as Data from '../../data'
import type {MessageReaction} from '..'

export class ReactionEmoji extends Emoji.applyToClass(Discord.ReactionEmoji) {
  client!: Client

  constructor(public reaction: MessageReaction, data?: Partial<Data.ReactionEmoji>) {
    super(reaction, mergeDefault(defaults.emoji, data))
  }
}
