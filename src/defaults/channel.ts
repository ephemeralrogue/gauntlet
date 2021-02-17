import {ChannelType, OverwriteType} from 'discord-api-types/v8'
import {snowflake} from '../utils'
import {DEFAULT_CHANNEL_NAME} from './constants'
import {createDefaults as d} from './utils'
import type {
  APIGuildCreateOverwrite,
  APIOverwrite,
  APIPartialChannel,
  Snowflake
} from 'discord-api-types/v8'
import type {DataGuildChannel} from '../Data'
import type {DataPartialDeep} from '../resolve-collection'

// Used in guildCreatePartialChannel (./template.ts), where the only difference
// is overwrites' ids may be a number
export const overwrite = d<APIGuildCreateOverwrite | APIOverwrite>(
  _overwrite => ({
    id: snowflake(),
    type: OverwriteType.Role,
    allow: '0',
    deny: '0',
    ..._overwrite
  })
) as <T extends APIGuildCreateOverwrite | APIOverwrite>(
  partial?: DataPartialDeep<T>
) => T

export const partialChannel = d<APIPartialChannel>(channel => ({
  id: snowflake(),
  type: channel?.type ?? ChannelType.GUILD_TEXT,
  name:
    // Every channel except for DMs can have names
    channel?.type === ChannelType.DM ? undefined : channel?.name ?? 'general'
}))

export const dataGuildChannel = d<DataGuildChannel>(channel => {
  const partial = partialChannel(channel)
  const base: DataGuildChannel = {
    ...(partial.type === ChannelType.GUILD_CATEGORY ? {} : {parent_id: null}),
    position: 0,
    name: DEFAULT_CHANNEL_NAME,
    ...(partial.type === ChannelType.GUILD_VOICE ||
    partial.type === ChannelType.GUILD_CATEGORY
      ? {}
      : {nsfw: false}),
    ...partial,
    permission_overwrites: channel?.permission_overwrites
      ? channel.permission_overwrites.map(o => overwrite<APIOverwrite>(o))
      : []
  }
  switch (base.type) {
    case ChannelType.GUILD_TEXT:
    case ChannelType.GUILD_NEWS:
      return {
        last_message_id: null,
        ...(base.type === ChannelType.GUILD_TEXT
          ? {rate_limit_per_user: 0}
          : {}),
        ...base
      }
    case ChannelType.GUILD_VOICE:
      return {bitrate: 64_000, user_limit: 0, ...base}
    case ChannelType.GUILD_CATEGORY:
    case ChannelType.GUILD_STORE:
      return base
    default:
      throw new TypeError(`Invalid guild channel type: ${base.type}`)
  }
})

export const dataGuildChannels = (): [
  channels: DataGuildChannel[],
  generalChannelID: Snowflake
] => {
  const textChannels = dataGuildChannel({
    type: ChannelType.GUILD_CATEGORY,
    name: 'Text Channels'
  })
  const voiceChannels = dataGuildChannel({
    type: ChannelType.GUILD_CATEGORY,
    name: 'Voice Channels'
  })
  const general = dataGuildChannel({
    type: ChannelType.GUILD_TEXT,
    name: 'general',
    parent_id: textChannels.id
  })
  return [
    [
      textChannels,
      voiceChannels,
      general,
      dataGuildChannel({
        type: ChannelType.GUILD_VOICE,
        name: 'General',
        parent_id: voiceChannels.id
      })
    ],
    general.id
  ]
}
