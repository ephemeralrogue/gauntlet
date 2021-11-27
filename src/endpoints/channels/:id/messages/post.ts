import {
  GatewayDispatchEvents,
  GatewayIntentBits,
  PermissionFlagsBits
} from 'discord-api-types/v9'
import * as convert from '../../../../convert'
import * as defaults from '../../../../defaults'
import {clientUserId} from '../../../../utils'
import {getChannel, getPermissions, hasPermissions} from '../../../utils'
import {
  getFormErrors,
  isTextBasedChannel,
  parseMentions,
  resolveEmbed
} from './utils'
import {
  Method,
  error,
  errors,
  formBodyErrors,
  mkRequest
} from '../../../../errors'
import type {HTTPAttachmentData} from 'discord.js'
import type {
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageResult,
  Snowflake
} from 'discord-api-types/v9'
import type {Backend, EmitPacket, HasIntents} from '../../../../Backend'
import type {FormBodyError} from '../../../../errors'
import type {Guild, GuildChannel, Message} from '../../../../types'

export type MessagesPost = (options: {
  data: RESTPostAPIChannelMessageJSONBody
  files?: HTTPAttachmentData[]
}) => Promise<RESTPostAPIChannelMessageResult>

export default (
    backend: Backend,
    applicationId: Snowflake,
    hasIntents: HasIntents,
    emitPacket: EmitPacket
  ) =>
  (channelId: Snowflake): MessagesPost =>
  // eslint-disable-next-line complexity, max-statements
  async (options): Promise<RESTPostAPIChannelMessageResult> => {
    const {
      data: {
        content = '',
        nonce,
        tts,
        embeds,
        allowed_mentions,
        message_reference,
        components
        // TODO: stickers
        // 403 Cannot use this sticker 50081
        // sticker_ids
      },
      files
    } = options
    // Errors
    const request = mkRequest(
      `/channels/${channelId}/messages`,
      Method.POST,
      options
    )
    const userId = clientUserId(backend, applicationId)

    const checkPermissions = (guild: Guild, channel: GuildChannel): bigint => {
      const permissions = getPermissions(
        guild,
        guild.members.get(userId)!,
        channel
      )
      if (!hasPermissions(permissions, PermissionFlagsBits.ViewChannel))
        error(request, errors.MISSING_ACCESS)
      if (
        !hasPermissions(
          permissions,
          PermissionFlagsBits.SendMessages |
            (files?.length ?? 0 ? PermissionFlagsBits.AttachFiles : 0n) |
            (embeds?.length ?? 0 ? PermissionFlagsBits.EmbedLinks : 0n)
        )
      )
        error(request, errors.MISSING_PERMISSIONS)
      return permissions
    }

    // if hasn't connected to gateway: 400, {"message": "Unauthorized", "code": 40001}
    // Basic validation
    const formErrs = getFormErrors({
      allowed_mentions,
      components,
      content,
      nonce,
      embeds
    })
    if (Object.keys(formErrs).length)
      error(request, errors.INVALID_FORM_BODY, formErrs)

    // Unknown channel
    const [guild, channel] = getChannel(backend)(channelId)
    if (!channel) error(request, errors.UNKNOWN_CHANNEL)

    // Non-text channel
    if (!isTextBasedChannel(channel)) error(request, errors.NON_TEXT_CHANNEL)

    // Permissions
    const permissions = guild
      ? checkPermissions(guild, channel as GuildChannel)
      : undefined

    // Empty message
    if (!content && !(embeds?.length ?? 0) && !(files?.length ?? 0))
      error(request, errors.EMPTY_MESSAGE)

    // Replies
    if (message_reference) {
      let err: FormBodyError | undefined
      if (message_reference.channel_id !== channelId)
        err = formBodyErrors.REPLIES_CANNOT_REFERENCE_OTHER_CHANNEL
      if (message_reference.guild_id !== guild?.id)
        err = formBodyErrors.REPLIES_UNKNOWN_MESSAGE
      if (err) {
        error(request, errors.INVALID_FORM_BODY, {
          message_reference: {_errors: [err]}
        })
      }
    }

    const mentions = parseMentions(content, allowed_mentions)
    const canMentionEveryone =
      permissions !== undefined &&
      hasPermissions(permissions, PermissionFlagsBits.MentionEveryone)
    const base = defaults.message(channelId)({
      content,
      nonce,
      tts:
        (tts ?? false) &&
        permissions !== undefined &&
        hasPermissions(permissions, PermissionFlagsBits.SendTTSMessages),
      author_id: userId,
      message_reference,
      mention_everyone: mentions.everyone && guild && canMentionEveryone,
      mentions: mentions.users.filter(id => backend.allUsers.has(id)),
      mention_roles: guild
        ? mentions.roles.filter(id => {
            const role = guild.roles.get(id)
            return role && (role.mentionable || canMentionEveryone)
          })
        : []
    })

    const defaultAttachment = defaults.attachment(channelId, base.id)
    const message: Message = {
      ...base,
      embeds: embeds?.map(resolveEmbed(channelId, base.id, files)) ?? [],
      attachments:
        files?.map(({name}) => defaultAttachment({filename: name})) ?? []
    }

    channel.messages.set(message.id, message)
    channel.last_message_id = message.id

    const apiMessage = convert.message(backend, channelId)(message)
    if (
      hasIntents(
        guild
          ? GatewayIntentBits.GuildMessages
          : GatewayIntentBits.DirectMessages
      )
    )
      emitPacket(GatewayDispatchEvents.MessageCreate, apiMessage)
    return apiMessage
  }
