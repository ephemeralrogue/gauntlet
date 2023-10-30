import {DiscordAPIError} from 'discord.js'
import {RESTJSONErrorCodes} from 'discord-api-types/v9'
import type {HTTPErrorData} from 'discord.js'
import type {FormBodyErrors} from './form-body-errors'

/** https://discord.com/developers/docs/topics/opcodes-and-status-codes#json */
interface APIError {
  code: number
  message: string
  errors?: Record<string, unknown>
}

export const errors = {
  UNKNOWN_CHANNEL: ['Unknown Channel', 404, RESTJSONErrorCodes.UnknownChannel],
  UNKNOWN_GUILD: ['Unknown Guild', 404, RESTJSONErrorCodes.UnknownGuild],
  UNKNOWN_INVITE: ['Unknown Invite', 404, RESTJSONErrorCodes.UnknownInvite],
  UNKNOWN_MESSAGE: ['Unknown Message', 404, RESTJSONErrorCodes.UnknownMessage],
  UNKNOWN_WEBHOOK: ['Unknown Webhook', 404, RESTJSONErrorCodes.UnknownWebhook],
  UNKNOWN_GUILD_TEMPLATE: ['Unknown guild template', 404, 10_057],
  MAXIMUM_GUILDS: [
    'Maximum number of guilds reached (10)',
    400,
    RESTJSONErrorCodes.MaximumNumberOfGuildsReached
  ],
  ALREADY_HAS_TEMPLATE: [
    'A server can only have a single template.',
    400,
    RESTJSONErrorCodes.GuildAlreadyHasTemplate
  ],
  MISSING_ACCESS: ['Missing Access', 403, RESTJSONErrorCodes.MissingAccess],
  EDIT_MESSAGE_NOT_AUTHOR: [
    'Cannot edit a message authored by another user',
    403,
    RESTJSONErrorCodes.CannotEditMessageAuthoredByAnotherUser
  ],
  EMPTY_MESSAGE: [
    'Cannot send an empty message',
    400,
    RESTJSONErrorCodes.CannotSendAnEmptyMessage
  ],
  NON_TEXT_CHANNEL: [
    'Cannot send messages in a non-text channel',
    400,
    RESTJSONErrorCodes.CannotSendMessagesInVoiceChannel
  ],
  MISSING_PERMISSIONS: [
    'Missing Permissions',
    403,
    RESTJSONErrorCodes.MissingPermissions
  ],
  INVALID_WEBHOOK_TOKEN: [
    'Invalid Webhook Token',
    401,
    RESTJSONErrorCodes.InvalidWebhookToken
  ],
  INVALID_FORM_BODY: [
    'Invalid Form Body',
    400,
    RESTJSONErrorCodes.InvalidFormBodyOrContentType
  ],
  CANNOT_USE_STICKER: [
    'Cannot use this sticker',
    403,
    RESTJSONErrorCodes.InvalidStickerSent
  ]
} as const

export const enum Method {
  GET = 'get',
  PUT = 'put',
  PATCH = 'patch',
  POST = 'post',
  DELETE = 'delete'
}

type DiscordError = typeof errors[keyof typeof errors]
type InvalidFormBodyError = typeof errors.INVALID_FORM_BODY

export interface RequestOptions extends Partial<Pick<HTTPErrorData, 'files'>> {
  data?: HTTPErrorData['json']
}

export interface Request {
  path: string
  method: Method
  options: RequestOptions
}

export const mkRequest = (
  path: string,
  method: Method,
  options: RequestOptions = {}
): Request => ({path, method, options})

export const error: {
  (
    request: Request,
    error: InvalidFormBodyError,
    formBodyErrors: FormBodyErrors
  ): never
  (request: Request, error: Exclude<DiscordError, InvalidFormBodyError>): never
} = (
  request: Request,
  [message, status, code]: DiscordError,
  formBodyErrors?: FormBodyErrors
) => {
  const errorObject: APIError = {
    message,
    code,
    ...(formBodyErrors ? {errors: formBodyErrors} : {})
  }
  // private ctor
  throw new (DiscordAPIError as unknown as new (
    error: unknown,
    status: number,
    request: unknown
  ) => DiscordAPIError)(errorObject, status, request)
}
