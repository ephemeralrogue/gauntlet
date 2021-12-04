import {
  GatewayDispatchEvents,
  MessageFlags,
  PermissionFlagsBits
} from 'discord-api-types/v9'
import * as convert from '../../../../../convert'
import * as defaults from '../../../../../defaults'
import {clientUserId, timestamp} from '../../../../../utils'
import {hasPermissions} from '../../../../utils'
import {
  getAndCheckChannel,
  getAndCheckPermissions,
  getFormErrors,
  isEmpty
} from '../errors'
import {messagesIntent, messageMentionsDetails, resolveEmbed} from '../utils'
import {Method, error, errors, mkRequest} from '../../../../../errors'
import type {HTTPAttachmentData} from 'discord.js'
import type {
  RESTPatchAPIChannelMessageJSONBody,
  RESTPatchAPIChannelMessageResult,
  Snowflake
} from 'discord-api-types/v9'
import type {Backend, EmitPacket, HasIntents} from '../../../../../Backend'
import type {GuildChannel} from '../../../../../types'

interface MessagesPatchOptions {
  data: RESTPatchAPIChannelMessageJSONBody
  files?: HTTPAttachmentData[]
}

export type MessagesPatch = (
  options: MessagesPatchOptions
) => Promise<RESTPatchAPIChannelMessageResult>

// https://discord.com/developers/docs/resources/channel#edit-message
export default (
    backend: Backend,
    applicationId: Snowflake,
    hasIntents: HasIntents,
    emitPacket: EmitPacket
  ) =>
  (channelId: Snowflake, messageId: Snowflake): MessagesPatch =>
  // eslint-disable-next-line complexity, max-statements
  async (options): Promise<RESTPatchAPIChannelMessageResult> => {
    const {data, files} = options
    const {content, embeds, flags, allowed_mentions, attachments, components} =
      data

    // Errors
    const request = mkRequest(
      `/channels/${channelId}/messages`,
      Method.POST,
      options
    )
    const userId = clientUserId(backend, applicationId)

    const [guild, channel] = getAndCheckChannel(backend, channelId, request)
    const message = channel.messages.get(messageId)
    if (!message) error(request, errors.UNKNOWN_MESSAGE)

    const formErrs = getFormErrors(backend, data)
    if (Object.keys(formErrs).length)
      error(request, errors.INVALID_FORM_BODY, formErrs)

    const isAuthor = userId === message.author_id
    if (
      !isAuthor &&
      (content !== undefined ||
        embeds !== undefined ||
        allowed_mentions !== undefined ||
        attachments !== undefined ||
        components !== undefined)
    )
      error(request, errors.EDIT_MESSAGE_NOT_AUTHOR)

    let permissions: bigint | undefined
    if (guild) {
      permissions = getAndCheckPermissions(
        request,
        userId,
        guild,
        channel as GuildChannel
      )
      if (
        !isAuthor &&
        flags !== undefined &&
        !hasPermissions(permissions, PermissionFlagsBits.ManageMessages)
      )
        error(request, errors.MISSING_PERMISSIONS)
    }

    const newContent = content === undefined ? message.content : content ?? ''
    // no embed links permission: `embeds` ignored
    const newEmbeds =
      embeds !== undefined &&
      (!guild || hasPermissions(permissions!, PermissionFlagsBits.EmbedLinks))
        ? embeds?.map(resolveEmbed(channelId, message.id, files)) ?? []
        : message.embeds
    if (
      isEmpty(newContent, newEmbeds) &&
      ((files?.length ?? 0) || message.attachments.length)
    )
      error(request, errors.EMPTY_MESSAGE)

    // Update message
    message.content = newContent
    message.embeds = newEmbeds
    if (
      embeds !== undefined &&
      (!guild || hasPermissions(permissions!, PermissionFlagsBits.EmbedLinks))
    ) {
      message.embeds =
        embeds?.map(resolveEmbed(channelId, message.id, files)) ?? []
    }
    if (flags !== undefined) {
      message.flags ??= 0
      if (flags && flags | MessageFlags.SuppressEmbeds)
        message.flags |= MessageFlags.SuppressEmbeds
      else message.flags &= ~MessageFlags.SuppressEmbeds
    }
    // can change files even without upload files permission
    if (attachments !== undefined) {
      const defaultAttachment = defaults.attachment(channelId, message.id)
      message.attachments =
        files?.map(({name}) => defaultAttachment({filename: name})) ?? []
    }
    if (components !== undefined) message.components = components ?? []

    const {mention_everyone, mention_roles, mentions} = messageMentionsDetails(
      backend,
      guild,
      permissions,
      message.content,
      allowed_mentions ?? undefined
    )
    message.mention_everyone = mention_everyone
    message.mention_roles = mention_roles
    message.mentions = mentions

    message.tts = false
    message.edited_timestamp = timestamp()

    const apiMessage = convert.message(backend, channelId)(message)
    if (hasIntents(messagesIntent(guild)))
      emitPacket(GatewayDispatchEvents.MessageUpdate, apiMessage)
    return apiMessage
  }
