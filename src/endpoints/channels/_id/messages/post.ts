import {
  GatewayDispatchEvents,
  PermissionFlagsBits
} from 'discord-api-types/v9'
import * as convert from '../../../../convert.ts';
import * as defaults from '../../../../defaults/index.ts';
import {
  Method,
  error,
  errors,
  formBodyErrors,
  mkRequest
} from '../../../../errors/index.ts';
import { clientUserId } from '../../../../utils.ts';
import { hasPermissions } from '../../../utils.ts';
import {
  getChannel,
  getAndCheckPermissions,
  isTextBasedChannel,
  getFormErrors,
  isEmpty
} from './errors.ts';
import {
  messagesIntent,
  messageMentionsDetails,
  resolveEmbed
} from './utils.ts';
import type { HTTPAttachmentData } from 'discord.js';
import type {
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageResult,
  Snowflake
} from 'discord-api-types/v9'
import type {
  Backend,
  EmitPacket,
  HasIntents
} from '../../../../Backend.ts';
import type { FormBodyError } from '../../../../errors/index.ts';
import type {
  GuildChannel,
  Message
} from '../../../../types/index.ts';

export type MessagesPost = (options: {
  data: RESTPostAPIChannelMessageJSONBody
  files?: HTTPAttachmentData[]
}) => Promise<RESTPostAPIChannelMessageResult>

// https://discord.com/developers/docs/resources/channel#create-message
export default (
  backend: Backend,
  applicationId: Snowflake,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
) =>
  (channelId: Snowflake): MessagesPost =>
    // eslint-disable-next-line complexity, max-statements
    async (options): Promise<RESTPostAPIChannelMessageResult> => {
      const { data, files } = options
      const {
        content = '',
        nonce,
        tts,
        embeds,
        allowed_mentions,
        message_reference,
        components,
        sticker_ids,
        attachments
      } = data

      // Errors
      const request = mkRequest(
        `/channels/${channelId}/messages`,
        Method.POST,
        options
      )
      const userId = clientUserId(backend, applicationId)

      const [guild, channel] = getChannel(backend, channelId, request)

      // if hasn't connected to gateway: 400, {"message": "Unauthorized", "code": 40001}
      // Basic validation
      const nonceError =
        typeof nonce == 'string' && nonce.length > 25
          ? formBodyErrors.NONCE_TYPE_TOO_LONG
          : typeof nonce == 'number'
            ? Number.isInteger(nonce)
              ? undefined
              : formBodyErrors.NONCE_TYPE_INVALID_TYPE
            : undefined
      const formErrs = {
        ...getFormErrors(backend, data),
        ...(nonceError ? { nonce: { _errors: [nonceError] } } : {})
      }
      if (Object.keys(formErrs).length)
        error(request, errors.INVALID_FORM_BODY, formErrs)

      let permissions: bigint | undefined
      if (guild) {
        permissions = getAndCheckPermissions(
          request,
          userId,
          guild,
          channel as GuildChannel
        )
        if (
          !hasPermissions(
            permissions,
            PermissionFlagsBits.SendMessages |
            (files?.length ?? 0 ? PermissionFlagsBits.AttachFiles : 0n) |
            (embeds?.length ?? 0 ? PermissionFlagsBits.EmbedLinks : 0n)
          )
        )
          error(request, errors.MISSING_PERMISSIONS)
      }
      if (!isTextBasedChannel(channel)) error(request, errors.NON_TEXT_CHANNEL)

      // Attachments
      const attachmentsErrors =
        attachments?.reduce((acc, attachment) => {
          const index = Number(attachment.id)
          return files && index >= 0 && index < files.length
            ? acc
            : { ...acc, [index]: { _errors: [formBodyErrors.ATTACHMENT_NOT_FOUND] } }
        }, {}) ?? {}
      if (Object.keys(attachmentsErrors).length)
        error(request, errors.INVALID_FORM_BODY, { attachments: attachmentsErrors })

      // Replies
      if (message_reference) {
        let err: FormBodyError | undefined
        if (message_reference.channel_id !== channelId)
          err = formBodyErrors.REPLIES_CANNOT_REFERENCE_OTHER_CHANNEL
        if (message_reference.guild_id !== guild?.id)
          err = formBodyErrors.REPLIES_UNKNOWN_MESSAGE
        if (err) {
          error(request, errors.INVALID_FORM_BODY, {
            message_reference: { _errors: [err] }
          })
        }
      }

      // TODO: find out if bots can use stickers from other guilds
      // they can use emojis from other guilds in select menu options somehow
      if (
        sticker_ids?.length &&
        (!guild || sticker_ids.some(id => !guild.stickers.has(id)))
      )
        error(request, errors.CANNOT_USE_STICKER)

      if (
        isEmpty(content, embeds) &&
        !(files?.length ?? 0) &&
        !(sticker_ids?.length ?? 0)
      )
        error(request, errors.EMPTY_MESSAGE)

      const base = defaults.message(channelId)({
        content,
        nonce,
        flags: 0,
        tts:
          (tts ?? false) &&
          permissions !== undefined &&
          hasPermissions(permissions, PermissionFlagsBits.SendTTSMessages),
        author_id: userId,
        message_reference,
        ...messageMentionsDetails(
          backend,
          guild,
          permissions,
          content,
          allowed_mentions
        ),
        components,
        stickers: sticker_ids?.map(id => [id, guild!.id])
      })

      const defaultAttachment = defaults.attachment(channelId, base.id)
      const message: Message = {
        ...base,
        embeds: embeds?.map(resolveEmbed(channelId, base.id, files)) ?? [],
        // TODO: file sizes, etc
        attachments:
          attachments?.map(attachment =>
            defaultAttachment({
              ...attachment,
              filename: attachment.filename ?? files![Number(attachment.id)]!.name
            })
          ) ?? []
      }

      channel.messages.set(message.id, message)
      channel.last_message_id = message.id

      const apiMessage = convert.message(backend, channelId)(message)
      if (hasIntents(messagesIntent(guild)))
        emitPacket(GatewayDispatchEvents.MessageCreate, apiMessage)
      return apiMessage
    }
