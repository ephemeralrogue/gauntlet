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
import {
  attachmentURLs,
  removeUndefined,
  resolveCollectionId,
  resolveCollectionUserId,
  snowflake,
  timestamp
} from '../../utils.ts';
import {
  DEFAULT_CHANNEL_NAME,
  DEFAULT_THREAD_AUTO_ARCHIVE_DURATION
} from '../constants.ts';
import { partialEmoji } from '../emoji.ts';
import { user } from '../user.ts';
import { createDefaults as d } from '../utils.ts';
import { webhook } from '../webhook.ts';
import { partialChannel } from './partial.ts';
import type {
  CommonProperties,
  RemoveUndefined,
  RequireKeys
} from '../../utils.ts';
import type { Defaults } from '../utils.ts';
import type {
  ActionRowComponent,
  Attachment,
  ButtonComponent,
  CategoryChannel,
  ChannelMention,
  DMChannel,
  Embed,
  EmbedAuthor,
  EmbedField,
  EmbedFooter,
  EmbedImage,
  EmbedThumbnail,
  GuildChannel,
  Message,
  MessageActivity,
  MessageComponent,
  MessageInteraction,
  MessageReference,
  NewsChannel,
  Overwrite,
  SelectMenuComponent,
  SelectMenuOption,
  PartialDeep,
  Reaction,
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
} from '../../types/index.ts';

export * from './partial.ts';

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

export const embed = d<Embed>(
  ({ author, fields, footer, image, provider, thumbnail, video, ...rest }) => ({
    ...rest,
    ...(footer ? { footer: embedFooter(footer) } : {}),
    ...(fields ? { fields: fields.map(embedField) } : {}),
    ...(image?.url === undefined ? {} : { image: image as EmbedImage }),
    ...(thumbnail?.url === undefined
      ? {}
      : { thumbnail: thumbnail as EmbedThumbnail }),
    ...(author?.name === undefined ? {} : { author: author as EmbedAuthor })
  })
)

export const reaction = d<Reaction>(_reaction => ({
  count: 1,
  me: false,
  ..._reaction,
  emoji: partialEmoji(_reaction.emoji)
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
  user: user(interaction.user)
}))

export const buttonComponent = d<ButtonComponent>(component => {
  const base: Omit<ButtonComponent, 'custom_id' | 'url'> = {
    type: ComponentType.Button,
    style: ButtonStyle.Primary,
    ...component
  }
  return base.style === ButtonStyle.Link
    ? {
      url: 'https://discord.com',
      ...(base as typeof base & { style: ButtonStyle.Link })
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
  ...option
}))

export const selectMenuComponent = d<SelectMenuComponent>(component => ({
  type: ComponentType.SelectMenu,
  custom_id: 'select_one',
  ...component,
  options: component.options?.map(selectMenuOption) ?? []
}))

type NonActionRowComponent = Exclude<MessageComponent, ActionRowComponent>
const nonActionRowComponent = d<NonActionRowComponent>(component => {
  switch (component.type) {
    case undefined:
      return buttonComponent()
    case ComponentType.Button:
      return buttonComponent(component)
    case ComponentType.SelectMenu:
      return selectMenuComponent(component)
    default:
      throw new Error('unreachable')
  }
})

export const actionRowComponent = d<ActionRowComponent>(component => ({
  type: ComponentType.ActionRow,
  components: component.components?.map(nonActionRowComponent) ?? []
}))

export const messageComponent = d<MessageComponent>(component =>
  component.type === ComponentType.ActionRow
    ? actionRowComponent(component)
    : nonActionRowComponent(
      component as RemoveUndefined<PartialDeep<NonActionRowComponent>>
    )
)

export const message = (channelId = snowflake()): Defaults<Message> =>
  d<Message>(
    ({
      activity,
      components,
      interaction,
      mention_channels,
      message_reference,
      referenced_message,
      ...rest
    }) => {
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
        ...rest,
        ...(mention_channels
          ? { mention_channels: mention_channels.map(channelMention) }
          : {}),
        embeds: rest.embeds?.map(embed) ?? [],
        reactions: rest.reactions?.map(reaction) ?? [],
        ...(activity ? { activity: messageActivity(activity) } : {}),
        ...(message_reference
          ? { message_reference: messageReference(message_reference) }
          : {}),
        ...(referenced_message
          ? { referenced_message: message()(referenced_message) }
          : referenced_message === null
            ? { referenced_message: null }
            : {}),
        ...(interaction ? { interaction: messageInteraction(interaction) } : {}),
        ...(components ? { components: components.map(actionRowComponent) } : {}),
        stickers:
          rest.stickers?.map(([id, guildId]) => [id ?? snowflake(), guildId]) ??
          []
      }
      return {
        attachments:
          rest.attachments?.map(attachment(channelId, base.id)) ?? [],
        ...base
      }
    }
  )

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
  resolveCollectionId<Message>(channel?.messages, message(channel?.id))

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

export const guildChannel = d<GuildChannel>((channel): GuildChannel => {
  const partial = partialChannel(channel)

  const parentId = { parent_id: null }
  const position = { position: 0 }
  const nsfw = { nsfw: false }
  const rtcRegion = { rtc_region: null }
  const textOrNewsChannel: Omit<
    CommonProperties<TextChannel, NewsChannel>,
    'id' | 'messages' | 'name' | 'permission_overwrites' | 'webhooks'
  > = {
    ...textBasedChannel,
    ...position,
    ...parentId,
    ...nsfw,
    topic: null,
    default_auto_archive_duration: DEFAULT_THREAD_AUTO_ARCHIVE_DURATION
  }
  const permissionOverwrites = (
    chan?: PartialDeep<Exclude<GuildChannel, ThreadChannel>>
  ): SnowflakeCollection<Overwrite> =>
    resolveCollectionId<Overwrite>(chan?.permission_overwrites, overwrite)
  const webhooks = (
    chan?: PartialDeep<NewsChannel | TextChannel>
  ): SnowflakeCollection<Webhook> =>
    resolveCollectionId<Webhook>(chan?.webhooks, webhook)

  const base = {
    name: DEFAULT_CHANNEL_NAME,
    ...partial,
    ...removeUndefined(channel)
  } as RequireKeys<
    RemoveUndefined<PartialDeep<GuildChannel>>,
    'id' | 'name' | 'type'
  >
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
        members: resolveCollectionUserId(chan?.members, threadMember),
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
