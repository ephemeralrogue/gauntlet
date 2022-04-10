import DiscordGuildPreviewEmoji from '../../../node_modules/discord.js/src/structures/GuildPreviewEmoji'
import defaults from '../../defaults'
import {mergeDefault} from '../../util'
import {BaseGuildEmoji} from './BaseGuildEmoji'
import type {Client} from '../../client'
import type * as Data from '../../data'
import type {GuildPreview} from '..'

export class GuildPreviewEmoji extends BaseGuildEmoji.applyToClass(DiscordGuildPreviewEmoji) {
  client!: Client
  guild!: GuildPreview

  constructor(client: Client, guild: GuildPreview, data?: Partial<Data.GuildPreviewEmoji>) {
    super(client, mergeDefault(defaults.guildEmoji, data), guild)
  }

  toData(): Data.GuildPreviewEmoji {
    return {...super.toData(), roles: [...this.roles]}
  }
}
