import Discord from 'discord.js'
import defaults from '../../defaults'
import {applyToClass, mergeDefault} from '../../util'
import {Emoji} from './Emoji'
import type {Client} from '../../client'
import type * as Data from '../../data'
import type {Guild, GuildPreview} from '..'

export class BaseGuildEmoji extends Emoji.applyToClass(Discord.BaseGuildEmoji) {
  static applyToClass = applyToClass(BaseGuildEmoji)
  client!: Client
  guild!: Guild | GuildPreview

  constructor(client: Client, guild: Guild | GuildPreview, data?: Partial<Data.BaseGuildEmoji>) {
    super(client, mergeDefault(defaults.guildEmoji, data), guild as Guild)
  }

  toData(): Omit<Data.BaseGuildEmoji, 'roles' | 'user'> {
    return {
      ...super.toData(),
      id: this.id,
      require_colons: this.requiresColons,
      managed: this.managed,
      animated: this.animated
    }
  }
}
