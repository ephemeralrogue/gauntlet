import Discord, {Constants} from 'discord.js'
import * as Data from '../../data'
import defaults from '../../defaults'
import {ChannelBase} from '../../structures/channel'
import {mergeDefault} from '../../util'
import manager from '../BaseManager'
import type {ChannelResolvable, Collection, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type {Channel, Guild, GuildChannel} from '../../structures'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {Events} = Constants

export class ChannelManager extends manager<Discord.ChannelManager, typeof ChannelBase, ChannelResolvable>(
  Discord.ChannelManager
) {
  readonly client!: Client
  cache!: Collection<Snowflake, Channel>
  // Discord.js' typings are wrong again
  // cacheType!: typeof Collection
  holds!: typeof ChannelBase
  resolve!: (resolvable: ChannelResolvable) => Channel | null

  constructor(client: Client, iterable?: Iterable<Data.Channel>) {
    super(client, iterable, ChannelBase)
  }

  // @ts-ignore -- Discord.js' types are wrong
  add(data: Data.Channel, cache?: boolean): Channel
  add(data: Data.Channel, guild?: Guild, cache = true): Channel | null {
    const existing = this.cache.get(data.id)
    if (existing) {
      if (cache) (existing as unknown as {_patch(data: Data.Channel): void})._patch(data)
      if (guild) guild.channels.add(existing as GuildChannel)
      return existing
    }

    const channel = ChannelBase.create(this.client, data, guild) as Channel | null

    if (!channel) {
      this.client.emit(Events.DEBUG, `Failed to find guild, or unknown type for channel ${data.id} ${data.type}`)
      return null
    }

    if (cache) this.cache.set(channel.id, channel)
    return channel
  }

  /**
   * Obtains a channel.
   *
   * @param id ID of the channel.
   * @param cache Whether to cache the new channel object if it isn't already.
   * @param data The data of the channel to fetch.
   * @example
   * // Fetch a channel by its id
   * client.channels.fetch('222109930545610754')
   *   .then(channel => console.log(channel.name))
   *   .catch(console.error)
   */
  async fetch(id: Snowflake, cache = true, data?: Partial<Data.Channel>): Promise<Channel> {
    return this.cache.get(id) ??
      (this.add as unknown as (data: Data.Channel, guild: Guild | null, cache?: boolean) => Channel)(
        mergeDefault(
          defaults[
            /* eslint-disable operator-linebreak -- ternary expressions look clearer here */
            data?.type === Data.ChannelType.DM ? 'dmChannel' :
            data?.type === Data.ChannelType.GUILD_VOICE ? 'voiceChannel' :
            data?.type === Data.ChannelType.GUILD_CATEGORY ? 'categoryChannel' :
            data?.type === Data.ChannelType.GUILD_NEWS ? 'newsChannel' :
            data?.type === Data.ChannelType.GUILD_STORE ? 'storeChannel' :
            /* eslint-enable operator-linebreak -- see above */
            'textChannel'
          ],
          {...data, id}
        ) as Data.Channel,
        null,
        cache
      )
  }
}
