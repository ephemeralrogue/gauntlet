import {
  ButtonStyle,
  ChannelType,
  ComponentType,
  InteractionType,
  MessageActivityType,
  MessageType,
  OverwriteType
} from 'discord-api-types/v9'
import {attachmentURLs, snowflake, timestamp} from '../utils'
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
  Snowflake
} from 'discord-api-types/v9'
import type {D} from '../types'
import type {RequireKeys} from '../utils'
import type {Defaults} from './utils'
import type {
  ActionRowComponent,
  ButtonComponent,
  MessageComponent,
  PartialDeep,
  SelectMenuComponent,
  SelectMenuOption
} from '../types/Data'

export const dataChannelMention = d<D.ChannelMention>(mention => ({
  id: snowflake(),
  guild_id: snowflake(),
  ...mention
}))

export const attachment = (
  channelId = snowflake(),
  messageId = snowflake()
): Defaults<APIAttachment> =>
  d<APIAttachment>(_attachment => {
    const base: Omit<APIAttachment, 'proxy_url' | 'url'> = {
      id: snowflake(),
      filename: 'unknown.png',
      size: 0,
      ..._attachment
    }
    return {
      ...attachmentURLs(channelId, messageId, base.filename),
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
  type: MessageActivityType.Join,
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

export const buttonComponent = d<ButtonComponent>(component => {
  const base: Omit<ButtonComponent, 'custom_id' | 'url'> = {
    type: ComponentType.Button,
    style: ButtonStyle.Primary,
    ...component,
    emoji: component?.emoji ? dataPartialEmoji(component.emoji) : undefined
  }
  return base.style === ButtonStyle.Link
    ? {
        url: 'https://discord.com',
        ...(base as typeof base & {style: ButtonStyle.Link})
      }
    : {
        custom_id: 'click_one',
        ...(base as typeof base & {
          style: Exclude<ButtonStyle, ButtonStyle.Link>
        })
      }
})

export const selectMenuOption = d<SelectMenuOption>(option => ({
  label: '',
  value: '',
  ...option,
  emoji: option?.emoji ? dataPartialEmoji(option.emoji) : undefined
}))

export const selectMenuComponent = d<SelectMenuComponent>(component => ({
  type: ComponentType.SelectMenu,
  custom_id: 'select_one',
  ...component,
  options: component?.options?.map(selectMenuOption) ?? []
}))

type NonActionRowComponent = Exclude<MessageComponent, ActionRowComponent>
const nonActionRowComponent = d<NonActionRowComponent>(component => {
  switch (component?.type) {
    case undefined:
      return buttonComponent({disabled: component?.disabled})
    case ComponentType.Button:
      return buttonComponent(component)
    case ComponentType.SelectMenu:
      return selectMenuComponent(component)
  }
})

export const actionRowComponent = d<ActionRowComponent>(component => ({
  type: ComponentType.ActionRow,
  components: component?.components?.map(nonActionRowComponent) ?? []
}))

export const messageComponent = d<MessageComponent>(component =>
  component?.type === ComponentType.ActionRow
    ? actionRowComponent(component)
    : nonActionRowComponent(component as PartialDeep<NonActionRowComponent>)
)

export const dataMessage = (channelId = snowflake()): Defaults<D.Message> =>
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
      type: MessageType.Default,
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
        : undefined,
      components: message?.components?.map(actionRowComponent)
    }
    return {
      attachments:
        message?.attachments?.map(attachment(channelId, base.id)) ?? [],
      ...base
    }
  })

export const partialOverwrite = (): Pick<D.Overwrite, 'id' | 'type'> => ({
  id: snowflake(),
  type: OverwriteType.Role
})

export const overwrite = d<D.Overwrite>(_overwrite => ({
  ...partialOverwrite(),
  allow: 0n,
  deny: 0n,
  ..._overwrite
}))

export const partialChannel = d<APIPartialChannel>(channel => ({
  id: channel?.id ?? snowflake(),
  type: channel?.type ?? ChannelType.GuildText,
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
    ...(partial.type === ChannelType.GuildCategory
      ? {}
      : {parent_id: channel?.parent_id}),
    position: 0,
    name: DEFAULT_CHANNEL_NAME,
    ...(partial.type === ChannelType.GuildVoice ||
    partial.type === ChannelType.GuildCategory
      ? {}
      : {nsfw: false}),
    ...partial,
    permission_overwrites: channel?.permission_overwrites
      ? channel.permission_overwrites.map(o => overwrite(o))
      : []
  }
  switch (base.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildNews:
      return {
        ...textBasedChannel(base),
        ...(base.type === ChannelType.GuildText
          ? {rate_limit_per_user: 0}
          : {}),
        ...base
      }
    case ChannelType.GuildVoice:
      return {bitrate: 64_000, user_limit: 0, ...base}
    case ChannelType.GuildCategory:
    case ChannelType.GuildStore:
      return base
    case ChannelType.GuildStageVoice:
      return {birate: 40_000, user_limit: 2000, ...base}
    default:
      throw new TypeError(`Invalid guild channel type: ${base.type}`)
  }
})

export const dataGuildChannels = (): [
  channels: D.GuildChannel[],
  generalChannelId: Snowflake
] => {
  const textChannels = dataGuildChannel({
    type: ChannelType.GuildCategory,
    name: 'Text Channels'
  })
  const voiceChannels = dataGuildChannel({
    type: ChannelType.GuildCategory,
    name: 'Voice Channels'
  })
  const general = dataGuildChannel({
    type: ChannelType.GuildText,
    name: 'general',
    parent_id: textChannels.id
  })
  return [
    [
      textChannels,
      voiceChannels,
      general,
      dataGuildChannel({
        type: ChannelType.GuildVoice,
        name: 'General',
        parent_id: voiceChannels.id
      })
    ],
    general.id
  ]
}
