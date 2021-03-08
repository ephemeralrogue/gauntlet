import {
  ChannelType,
  MessageActivityType,
  MessageType,
  OverwriteType,
  StickerFormatType
} from 'discord-api-types/v8'
import {attachmentURLs, randomString, snowflake, timestamp} from '../utils'
import {DEFAULT_CHANNEL_NAME} from './constants'
import {dataPartialEmoji} from './emoji'
import {createDefaults as d} from './utils'
import type {
  APIAttachment,
  APIEmbedFooter,
  APIMessageActivity,
  APIMessageReference,
  APIPartialChannel,
  APISticker,
  Snowflake
} from 'discord-api-types/v8'
import type {
  DataChannelMention,
  DataDMChannel,
  DataEmbed,
  DataEmbedField,
  DataGuildChannel,
  DataMessage,
  DataOverwrite,
  DataPartialDeep,
  DataReaction
} from '../types'
import type {RequireKeys} from '../utils'
import type {Defaults} from './utils'

export const sticker = d<APISticker>(_sticker => ({
  id: snowflake(),
  pack_id: snowflake(),
  name: 'sticker name',
  description: 'sticker description',
  asset: randomString(),
  preview_asset: null,
  format_type: StickerFormatType.PNG,
  ..._sticker
}))

export const dataChannelMention = d<DataChannelMention>(mention => ({
  id: snowflake(),
  guild_id: snowflake(),
  ...mention
}))

export const attachment = (
  channelID = snowflake(),
  messageID = snowflake()
): Defaults<APIAttachment> =>
  d<APIAttachment>(_attachment => {
    const base: Omit<APIAttachment, 'proxy_url' | 'url'> = {
      id: snowflake(),
      filename: 'unknown.png',
      size: 0,
      ..._attachment
    }
    return {
      ...attachmentURLs(channelID, messageID, base.filename),
      ...base
    }
  })

export const dataEmbedField = d<DataEmbedField>(field => ({
  name: 'field name',
  value: 'field value',
  inline: false,
  ...field
}))

export const embedFooter = d<APIEmbedFooter>(footer => ({
  text: 'footer text',
  ...footer
}))

export const dataEmbed = d<DataEmbed>(embed => ({
  ...embed,
  footer: embed?.footer ? embedFooter(embed.footer) : undefined,
  fields: embed?.fields?.map(dataEmbedField)
}))

export const dataReaction = d<DataReaction>(reaction => ({
  count: 1,
  me: false,
  ...reaction,
  emoji: dataPartialEmoji(reaction?.emoji)
}))

export const messageActivity = d<APIMessageActivity>(activity => ({
  type: MessageActivityType.JOIN,
  ...activity
}))

export const messageReference = d<APIMessageReference>(reference => ({
  channel_id: snowflake(),
  ...reference
}))

export const dataMessage = (channelID = snowflake()): Defaults<DataMessage> =>
  d<DataMessage>(message => {
    // TODO: do something like dataGuildChannel: do stuff based on message type
    const base: Omit<DataMessage, 'attachments'> = {
      id: snowflake(),
      author_id: snowflake(),
      content: '',
      timestamp: timestamp(),
      edited_timestamp: null,
      tts: false,
      mention_everyone: false,
      mentions: [],
      mention_roles: [],
      pinned: false,
      type: MessageType.DEFAULT,
      application_id: snowflake(),
      ...message,
      mention_channels: message?.mention_channels?.map(dataChannelMention),
      embeds: message?.embeds?.map(dataEmbed) ?? [],
      reactions: message?.reactions?.map(dataReaction) ?? [],
      activity: message?.activity
        ? messageActivity(message.activity)
        : undefined,
      message_reference: message?.message_reference
        ? messageReference(message.message_reference)
        : undefined,
      referenced_message: message?.referenced_message
        ? dataMessage()(message.referenced_message)
        : (message?.referenced_message as null | undefined)
    }
    return {
      attachments:
        message?.attachments?.map(attachment(channelID, base.id)) ?? [],
      ...base
    }
  })

export const partialOverwrite = (): Pick<DataOverwrite, 'id' | 'type'> => ({
  id: snowflake(),
  type: OverwriteType.Role
})

export const overwrite = d<DataOverwrite>(_overwrite => ({
  ...partialOverwrite(),
  allow: BigInt(0),
  deny: BigInt(0),
  ..._overwrite
}))

export const partialChannel = d<APIPartialChannel>(channel => ({
  id: channel?.id ?? snowflake(),
  type: channel?.type ?? ChannelType.GUILD_TEXT,
  name:
    // Every channel except for DMs can have names
    channel?.type === ChannelType.DM ? undefined : channel?.name ?? 'general'
}))

const textBasedChannel = (
  channel: DataPartialDeep<
    RequireKeys<
      Pick<DataGuildChannel, 'id' | 'last_message_id' | 'messages'>,
      'id'
    >
  >
): Required<Pick<DataGuildChannel, 'last_message_id' | 'messages'>> => ({
  last_message_id: null,
  messages: channel.messages?.map(dataMessage(channel.id)) ?? []
})

export const dataDMChannel = d<DataDMChannel>(channel => {
  const base = partialChannel(channel)
  return {
    ...textBasedChannel(base),
    recipient_id: snowflake(),
    ...base
  }
})

export const dataGuildChannel = d<DataGuildChannel>(channel => {
  const partial = partialChannel(channel)
  const base: DataGuildChannel = {
    ...(partial.type === ChannelType.GUILD_CATEGORY
      ? {}
      : {parent_id: channel?.parent_id}),
    position: 0,
    name: DEFAULT_CHANNEL_NAME,
    ...(partial.type === ChannelType.GUILD_VOICE ||
    partial.type === ChannelType.GUILD_CATEGORY
      ? {}
      : {nsfw: false}),
    ...partial,
    permission_overwrites: channel?.permission_overwrites
      ? channel.permission_overwrites.map(o => overwrite(o))
      : []
  }
  switch (base.type) {
    case ChannelType.GUILD_TEXT:
    case ChannelType.GUILD_NEWS:
      return {
        ...textBasedChannel(base),
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
