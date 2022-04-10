import {Constants, DiscordAPIError} from 'discord.js'
import type {APIError} from './discord'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {APIErrors} = Constants

export const errors = {
  UNKNOWN_CHANNEL: ['Unknown Channel', 404, APIErrors.UNKNOWN_CHANNEL],
  UNKNOWN_GUILD: ['Unknown Guild', 404, APIErrors.UNKNOWN_GUILD],
  UNKNOWN_INVITE: ['Unknown Invite', 404, APIErrors.UNKNOWN_INVITE],
  UNKNOWN_WEBHOOK: ['Unknown Webhook', 404, APIErrors.UNKNOWN_WEBHOOK],
  MAXIMUM_GUILDS: [
    'Maximum number of guilds reached (10)',
    400,
    APIErrors.MAXIMUM_GUILDS
  ],
  MISSING_PERMISSIONS: [
    'Missing Permissions',
    403,
    APIErrors.MISSING_PERMISSIONS
  ],
  INVALID_WEBHOOK_TOKEN: ['Invalid Webhook Token', 401, 50027],
  INVALID_FORM_BODY: ['Invalid Form Body', 400, APIErrors.INVALID_FORM_BODY]
} as const

type Errors = typeof errors[keyof typeof errors]

interface FormBodyError {
  code: string
  message: string
}

export interface FormBodyErrors {
  [key: string]: {_errors: FormBodyError[]} | FormBodyErrors
}

export type Method = 'get' | 'put' | 'patch' | 'post' | 'delete'
export const error: {
  (
    _error: typeof errors.INVALID_FORM_BODY,
    path: string,
    method: Method,
    extraErrors: FormBodyErrors
  ): never
  (
    _error: Exclude<Errors, typeof errors.INVALID_FORM_BODY>,
    path: string,
    method: Method
  ): never
} = (
  [message, status, code]: Errors,
  path: string,
  method: Method,
  formBodyErrors?: FormBodyErrors
) => {
  const errorObject: APIError = {
    message,
    code,
    ...(formBodyErrors ? {errors: formBodyErrors} : {})
  }
  throw new DiscordAPIError(path, errorObject, method, status)
}

export const invalidFormBodyError: (
  path: string,
  method: Method,
  formErrors: Record<string, FormBodyError[]>
) => never = (path, method, formErrors) =>
  error(
    errors.INVALID_FORM_BODY,
    path,
    method,
    Object.fromEntries(
      Object.entries(formErrors).map(([k, v]) => [k, {_errors: v}])
    )
  )

export const formBodyErrors = {
  /* eslint-disable id-length -- using exact code */
  BASE_TYPE_BAD_LENGTH: (min: number, max: number): FormBodyError => ({
    code: 'BASE_TYPE_BAD_LENGTH',
    message: `Must be between ${min} and ${max} in length.`
  }),
  BASE_TYPE_CHOICES: (
    choices: readonly (string | number)[]
  ): FormBodyError => ({
    code: 'BASE_TYPE_CHOICES',
    message: `Value must be one of (${choices.join(', ')}).`
  }),
  BASE_TYPE_REQUIRED: {
    code: 'BASE_TYPE_REQUIRED',
    message: 'This field is required'
  },
  BINARY_TYPE_MAX_SIZE: (size: string): FormBodyError => ({
    code: 'BINARY_TYPE_MAX_SIZE',
    message: `File cannot be larger than ${size}.`
  }),
  CHANNEL_PARENT_INVALID_TYPE: {
    code: 'CHANNEL_PARENT_INVALID_TYPE',
    message: 'Not a category'
  },
  GUILD_CREATE_AFK_CHANNEL_NOT_GUILD_VOICE: {
    code: 'GUILD_CREATE_AFK_CHANNEL_NOT_GUILD_VOICE',
    message: 'AFK channels must be GUILD_VOICE'
  },
  GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST: {
    code: 'GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST',
    message:
      'Channels with a parent_id must appear after their category channel'
  },
  GUILD_CREATE_CHANNEL_ID_INVALID: (id: number): FormBodyError => ({
    code: 'GUILD_CREATE_CHANNEL_ID_INVALID',
    message: `Invalid parent_id (${id})`
  }),
  GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT: {
    code: 'GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT',
    message: 'System channels must be GUILD_TEXT'
  }
  /* eslint-enable id-length -- using exact code */
}
