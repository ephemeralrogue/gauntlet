import {
  ButtonStyle,
  ChannelType,
  ComponentType,
  InteractionType,
  MessageActivityType,
  MessageType,
  OverwriteType,
  ThreadAutoArchiveDuration
} from 'discord-api-types/v9'
import {Collection} from 'discord.js'
import {attachmentURLs, snowflake, timestamp} from '../../utils'
import {DEFAULT_CHANNEL_NAME} from '../constants'
import {partialEmoji} from '../emoji'
import {user} from '../user'
import {createDefaults as d} from '../utils'
import {webhook} from '../webhook'
import {partialChannel} from './partial'
import type {CommonProperties, RequireKeys} from '../../utils'
import type {Defaults} from '../utils'
import type {
  ActionRowComponent,
  Attachment,
  ButtonComponent,
  CategoryChannel,
  ChannelMention,
  DMChannel,
  Embed,
  EmbedField,
  EmbedFooter,
  GuildChannel,
  Message,
  MessageActivity,
  MessageComponent,
  MessageInteraction,
  MessageReference,
  NewsChannel,
  Overwrite,
  PartialDeep,
  Reaction,
  SelectMenuComponent,
  SelectMenuOption,
  Snowflake,
  SnowflakeCollection,
  StageChannel,
  StoreChannel,
  TextBasedChannel,
  TextChannel,
  ThreadChannel,
  ThreadMember,
  ThreadMetadata,
  VoiceChannel,
  Webhook
} from '../../types'

export * from './partial'

export const channelMention = d<ChannelMention>(mention => ({
  id: snowflake(),
  guild_id: snowflake(),
  ...mention
}))

export const attachment = (
  channelId = snowflake(),
  messageId = snowflake()
): Defaults<Attachment> =>
  d<Attachment>(_attachment => {
    const base: Omit<Attachment, 'proxy_url' | 'url'> = {
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

export const embedField = d<EmbedField>(field => ({
  name: 'field name',
  value: 'field value',
  inline: false,
  ...field
}))

export const embedFooter = d<EmbedFooter>(footer => ({
  text: 'footer text',
  ...footer
}))

export const embed = d<Embed>(_embed => ({
  ..._embed,
  footer: _embed?.footer ? embedFooter(_embed.footer) : undefined,
  fields: _embed?.fields?.map(embedField)
}))

export const reaction = d<Reaction>(_reaction => ({
  count: 1,
  me: false,
  ..._reaction,
  emoji: partialEmoji(_reaction?.emoji)
}))

export const messageActivity = d<MessageActivity>(activity => ({
  type: MessageActivityType.Join,
  ...activity
}))

export const messageReference = d<MessageReference>(reference => ({
  channel_id: snowflake(),
  ...reference
}))

export const messageInteraction = d<MessageInteraction>(interaction => ({
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
    emoji: component?.emoji ? partialEmoji(component.emoji) : undefined
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
  emoji: option?.emoji ? partialEmoji(option.emoji) : undefined
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

export const message = (channelId = snowflake()): Defaults<Message> =>
  d<Message>(_message => {
    // TODO: do something like guildChannel: do stuff based on message type
    const base: Omit<Message, 'attachments'> = {
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
      ..._message,
      mention_channels: _message?.mention_channels?.map(channelMention),
      embeds: _message?.embeds?.map(embed) ?? [],
      reactions: _message?.reactions?.map(reaction) ?? [],
      activity: _message?.activity
        ? messageActivity(_message.activity)
        : undefined,
      message_reference: _message?.message_reference
        ? messageReference(_message.message_reference)
        : undefined,
      referenced_message: _message?.referenced_message
        ? message()(_message.referenced_message)
        : (_message?.referenced_message as null | undefined),
      interaction: _message?.interaction
        ? messageInteraction(_message.interaction)
        : undefined,
      components: _message?.components?.map(actionRowComponent),
      stickers:
        _message?.stickers?.map(([id, guildId]) => [
          id ?? snowflake(),
          guildId
        ]) ?? []
    }
    return {
      attachments:
        _message?.attachments?.map(attachment(channelId, base.id)) ?? [],
      ...base
    }
  })

export const partialOverwrite = (): Pick<Overwrite, 'id' | 'type'> => ({
  id: snowflake(),
  type: OverwriteType.Role
})

export const overwrite = d<Overwrite>(_overwrite => ({
  ...partialOverwrite(),
  allow: 0n,
  deny: 0n,
  ..._overwrite
}))

const messages = (
  channel?: PartialDeep<TextBasedChannel>
): TextBasedChannel['messages'] =>
  channel?.messages?.mapValues(message(channel.id)) ?? new Collection()

const textBasedChannel: Pick<
  TextBasedChannel,
  'last_message_id' | 'last_pin_timestamp'
> = {
  last_message_id: null,
  last_pin_timestamp: null
}

export const dmChannel = d<DMChannel>(channel => {
  const base = partialChannel<DMChannel>(channel)
  return {
    recipient_id: snowflake(),
    ...textBasedChannel,
    ...base,
    messages: messages(base)
  }
})

const threadMember = d<ThreadMember>(member => ({
  user_id: snowflake(),
  join_timestamp: timestamp(),
  flags: 0,
  ...member
}))

const threadMetadata = d<ThreadMetadata>(metadata => ({
  archived: false,
  auto_archive_duration: ThreadAutoArchiveDuration.OneDay,
  archive_timestamp: timestamp(),
  locked: false,
  ...metadata
}))

export const guildChannel = d<GuildChannel>(channel => {
  const partial = partialChannel(channel)

  const parentId = {parent_id: null}
  const position = {position: 0}
  const nsfw = {nsfw: false}
  const rtcRegion = {rtc_region: null}
  const textOrNewsChannel: Omit<
    CommonProperties<TextChannel, NewsChannel>,
    'id' | 'messages' | 'name' | 'permission_overwrites' | 'webhooks'
  > = {
    ...textBasedChannel,
    ...position,
    ...parentId,
    ...nsfw,
    topic: null,
    default_auto_archive_duration: ThreadAutoArchiveDuration.OneDay
  }
  const permissionOverwrites = (
    chan?: PartialDeep<Exclude<GuildChannel, ThreadChannel>>
  ): SnowflakeCollection<Overwrite> =>
    chan?.permission_overwrites
      ? chan.permission_overwrites.mapValues(o => overwrite(o))
      : new Collection()
  const webhooks = (
    chan?: PartialDeep<NewsChannel | TextChannel>
  ): SnowflakeCollection<Webhook> =>
    chan?.webhooks ? chan.webhooks.mapValues(h => webhook(h)) : new Collection()

  const base = {
    name: DEFAULT_CHANNEL_NAME,
    ...partial
  } as RequireKeys<PartialDeep<GuildChannel>, 'id' | 'name' | 'type'>
  switch (base.type) {
    case ChannelType.GuildText: {
      const chan = channel as PartialDeep<TextChannel> | undefined
      return {
        ...textOrNewsChannel,
        rate_limit_per_user: 0,
        ...base,
        permission_overwrites: permissionOverwrites(chan),
        messages: messages(chan),
        webhooks: webhooks(chan)
      }
    }
    case ChannelType.GuildNews: {
      const chan = channel as PartialDeep<NewsChannel> | undefined
      return {
        ...textOrNewsChannel,
        ...base,
        permission_overwrites: permissionOverwrites(chan),
        messages: messages(chan),
        webhooks: webhooks(chan)
      }
    }
    case ChannelType.GuildPublicThread:
    case ChannelType.GuildPrivateThread:
    case ChannelType.GuildNewsThread: {
      const chan = channel as PartialDeep<ThreadChannel> | undefined
      return {
        parent_id: snowflake(),
        ...textBasedChannel,
        ...base,
        messages: messages(chan),
        members: chan?.members?.mapValues(threadMember) ?? new Collection(),
        thread_metadata: threadMetadata(chan?.thread_metadata)
      }
    }
    case ChannelType.GuildVoice:
      return {
        ...position,
        ...parentId,
        ...rtcRegion,
        bitrate: 64_000,
        user_limit: 0,
        ...base,
        permission_overwrites: permissionOverwrites(
          channel as PartialDeep<VoiceChannel> | undefined
        )
      }
    case ChannelType.GuildStageVoice:
      return {
        ...position,
        ...parentId,
        ...rtcRegion,
        bitrate: 40_000,
        user_limit: 2000,
        ...base,
        permission_overwrites: permissionOverwrites(
          channel as PartialDeep<StageChannel> | undefined
        )
      }
    case ChannelType.GuildStore:
      return {
        ...position,
        ...parentId,
        ...nsfw,
        ...base,
        permission_overwrites: permissionOverwrites(
          channel as PartialDeep<CategoryChannel | StoreChannel> | undefined
        )
      }
    case ChannelType.GuildCategory:
      return {
        ...position,
        ...base,
        permission_overwrites: permissionOverwrites(
          channel as PartialDeep<CategoryChannel | StoreChannel> | undefined
        )
      }
  }
})

export const guildChannels = (): [
  channels: GuildChannel[],
  generalChannelId: Snowflake
] => {
  const textChannels = guildChannel({
    type: ChannelType.GuildCategory,
    name: 'Text Channels'
  })
  const voiceChannels = guildChannel({
    type: ChannelType.GuildCategory,
    name: 'Voice Channels'
  })
  const general = guildChannel({
    type: ChannelType.GuildText,
    name: 'general',
    parent_id: textChannels.id
  })
  return [
    [
      textChannels,
      voiceChannels,
      general,
      guildChannel({
        type: ChannelType.GuildVoice,
        name: 'General',
        parent_id: voiceChannels.id
      })
    ],
    general.id
  ]
}
