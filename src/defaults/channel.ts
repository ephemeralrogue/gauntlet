import {
  ChannelType,
  InteractionType,
  MessageActivityType,
  MessageType,
  OverwriteType,
  StickerFormatType
} from 'discord-api-types/v8'
import {attachmentURLs, randomString, snowflake, timestamp} from '../utils'
import {DEFAULT_CHANNEL_NAME} from './constants'
import {dataPartialEmoji} from './emoji'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {
  APIAttachment,
  APIEmbedFooter,
  APIMessageActivity,
  APIMessageInteraction,
  APIMessageReference,
  APIPartialChannel,
  APISticker,
  Snowflake
} from 'discord-api-types/v8'
import type {D} from '../types'
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

export const dataChannelMention = d<D.ChannelMention>(mention => ({
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

export const dataEmbedField = d<D.EmbedField>(field => ({
  name: 'field name',
  value: 'field value',
  inline: false,
  ...field
}))

export const embedFooter = d<APIEmbedFooter>(footer => ({
  text: 'footer text',
  ...footer
}))

export const dataEmbed = d<D.Embed>(embed => ({
  ...embed,
  footer: embed?.footer ? embedFooter(embed.footer) : undefined,
  fields: embed?.fields?.map(dataEmbedField)
}))

export const dataReaction = d<D.Reaction>(reaction => ({
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

export const messageInteraction = d<APIMessageInteraction>(interaction => ({
  id: snowflake(),
  type: InteractionType.ApplicationCommand,
  name: 'blep',
  ...interaction,
  user: user(interaction?.user)
}))

export const dataMessage = (channelID = snowflake()): Defaults<D.Message> =>
  d<D.Message>(message => {
    // TODO: do something like dataGuildChannel: do stuff based on message type
    const base: Omit<D.Message, 'attachments'> = {
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
        : (message?.referenced_message as null | undefined),
      interaction: message?.interaction
        ? messageInteraction(message.interaction)
        : undefined
    }
    return {
      attachments:
        message?.attachments?.map(attachment(channelID, base.id)) ?? [],
      ...base
    }
  })

export const partialOverwrite = (): Pick<D.Overwrite, 'id' | 'type'> => ({
  id: snowflake(),
  type: OverwriteType.Role
})

export const overwrite = d<D.Overwrite>(_overwrite => ({
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
  channel: D.PartialDeep<
    RequireKeys<
      Pick<D.GuildChannel, 'id' | 'last_message_id' | 'messages'>,
      'id'
    >
  >
): Required<Pick<D.GuildChannel, 'last_message_id' | 'messages'>> => ({
  last_message_id: null,
  messages: channel.messages?.map(dataMessage(channel.id)) ?? []
})

export const dataDMChannel = d<D.DMChannel>(channel => {
  const base = partialChannel(channel)
  return {
    ...textBasedChannel(base),
    recipient_id: snowflake(),
    ...base
  }
})

export const dataGuildChannel = d<D.GuildChannel>(channel => {
  const partial = partialChannel(channel)
  const base: D.GuildChannel = {
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
    case ChannelType.GUILD_STAGE_VOICE:
      return {birate: 40_000, user_limit: 2000, ...base}
    default:
      throw new TypeError(`Invalid guild channel type: ${base.type}`)
  }
})

export const dataGuildChannels = (): [
  channels: D.GuildChannel[],
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
