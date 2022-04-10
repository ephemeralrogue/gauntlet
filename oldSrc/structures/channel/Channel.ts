import Discord, {Constants} from 'discord.js'
import * as Data from '../../data'
import defaults from '../../defaults'
import {applyToClass, mergeDefault} from '../../util'
import type {Client} from '../../client'
import type {
  Base, CategoryChannel, Guild, DMChannel, GuildChannel, NewsChannel, PartialGroupDMChannel, StoreChannel, TextChannel,
  VoiceChannel
} from '..'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {ChannelTypes} = Constants

export class ChannelBase extends Discord.Channel implements Base {
  static applyToClass = applyToClass(ChannelBase)
  client!: Client
  type!: Exclude<Discord.Channel['type'], 'unknown'>

  constructor(client: Client, data?: Partial<Data.ChannelBase>) {
    super(client, mergeDefault(defaults.channel, data))
  }

  static create(
    client: Client, data: Data.Channel | Data.PartialGroupDMChannel, guild?: Guild
  ): Channel | PartialGroupDMChannel | null {
    // This method can't be async
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/naming-convention -- classes */
    if (!('guild_id' in data) && !guild) {
      const class_ = data.type === ChannelTypes.DM ? 'DMChannel' : 'PartialGroupDMChannel'
      return new (require(`./${class_}`) as {
        [K in typeof class_]: new (
          client: Client, data: Partial<Data.DMChannel | Data.PartialGroupDMChannel>
        ) => DMChannel | PartialGroupDMChannel
      })[class_](client, data)
    }
    guild = guild ?? ('guild_id' in data ? client.guilds.cache.get(data.guild_id) : undefined)
    if (guild) {
      let channel!: GuildChannel
      switch (data.type) {
        // Have to use the ChannelType enum so that type narrowing works
        case Data.ChannelType.GUILD_TEXT: {
          channel = new (require('./TextChannel') as {TextChannel: typeof TextChannel}).TextChannel(guild, data)
          break
        }
        case Data.ChannelType.GUILD_VOICE: {
          channel = new (require('./VoiceChannel') as {VoiceChannel: typeof VoiceChannel}).VoiceChannel(guild, data)
          break
        }
        case Data.ChannelType.GUILD_CATEGORY: {
          channel = new (require('./CategoryChannel') as {CategoryChannel: typeof CategoryChannel}).CategoryChannel(
            guild, data
          )
          break
        }
        case Data.ChannelType.GUILD_NEWS: {
          channel = new (require('./NewsChannel') as {NewsChannel: typeof NewsChannel}).NewsChannel(guild, data)
          break
        }
        case Data.ChannelType.GUILD_STORE:
          channel = new (require('./StoreChannel') as {StoreChannel: typeof StoreChannel}).StoreChannel(guild, data)
        /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/naming-convention -- see above */
      }
      guild.channels.cache.set(channel.id, channel)
      return channel
    }
    return null
  }

  /**
   * Deletes this channel.
   *
   * @example
   * // Delete the channel
   * channel.delete()
   *   .then(console.log)
   */
  async delete(): Promise<this> {
    if (this.client._hasIntent('DIRECT_MESSAGES'))
      this.client.ws._handlePacket({t: 'CHANNEL_DELETE', d: this.toData() as Data.Channel})
    return this
  }

  toData(): Data.ChannelBase {
    return {
      id: this.id,
      type: ChannelTypes[this.type.toUpperCase() as keyof typeof Constants.ChannelTypes]
    }
  }
}

export type Channel = DMChannel | GuildChannel
