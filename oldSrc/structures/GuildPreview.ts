import Discord from 'discord.js'
import defaults from '../defaults'
import {mergeDefault} from '../util'
import type {Collection, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Base, GuildPreviewEmoji} from '.'

export class GuildPreview extends Discord.GuildPreview implements Base {
  client!: Client
  emojis!: Collection<Snowflake, GuildPreviewEmoji>

  private readonly _patch!: (data: Data.GuildPreview) => void

  constructor(client: Client, data: Partial<Data.GuildPreview> = {}) {
    super(client, mergeDefault(defaults.guildPreview, data))
  }

  async fetch(data?: Partial<Data.GuildPreview>): Promise<this> {
    this._patch(mergeDefault(this.toData(), data))
    return this
  }

  toData(): Data.GuildPreview {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      splash: this.splash,
      discovery_splash: this.discoverySplash,
      emojis: this.emojis.map(emoji => emoji.toData()),
      features: this.features,
      approximate_member_count: this.approximateMemberCount,
      approximate_presence_count: this.approximatePresenceCount,
      description: this.description ?? null
    }
  }
}
