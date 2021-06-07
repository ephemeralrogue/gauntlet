import {DiscordAPIError} from 'discord.js'
import {RESTJSONErrorCodes} from 'discord-api-types/v8'
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
  EMPTY_MESSAGE: [
    'Cannot send an empty message',
    400,
    RESTJSONErrorCodes.CannotSendAnEmptyMessage
  ],
  MISSING_PERMISSIONS: [
    'Missing Permissions',
    403,
    RESTJSONErrorCodes.MissingPermissions
  ],
  INVALID_WEBHOOK_TOKEN: ['Invalid Webhook Token', 401, 50_027],
  INVALID_FORM_BODY: [
    'Invalid Form Body',
    400,
    RESTJSONErrorCodes.InvalidFormBodyOrContentType
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

export const error: {
  (
    error: InvalidFormBodyError,
    path: string,
    method: Method,
    formBodyErrors: FormBodyErrors
  ): never
  (
    error: Exclude<DiscordError, InvalidFormBodyError>,
    path: string,
    method: Method
  ): never
} = (
  [message, status, code]: DiscordError,
  path: string,
  method: Method,
  formBodyErrors?: FormBodyErrors
) => {
  const errorObject: APIError = {
    message,
    code,
    ...(formBodyErrors ? {errors: formBodyErrors} : {})
  }
  // TODO: request.options.data, request.options.files
  throw new DiscordAPIError(errorObject, status, {
    path,
    method,
    options: {}
  })
}
