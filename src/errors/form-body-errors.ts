import type {AllowedMentionsTypes} from 'discord-api-types/v9'

export interface FormBodyError {
  code: string
  message: string
}

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- circular type
export interface FormBodyErrors {
  [key: string]: FormBodyErrors | {_errors: FormBodyError[]}
}

/* eslint-disable id-length -- using exact code */
export const BASE_TYPE_REQUIRED: FormBodyError = {
  code: 'BASE_TYPE_REQUIRED',
  message: 'This field is required'
}

export const CHANNEL_PARENT_INVALID_TYPE: FormBodyError = {
  code: 'CHANNEL_PARENT_INVALID_TYPE',
  message: 'Not a category'
}

export const GUILD_CREATE_AFK_CHANNEL_NOT_GUILD_VOICE: FormBodyError = {
  code: 'GUILD_CREATE_AFK_CHANNEL_NOT_GUILD_VOICE',
  message: 'AFK channels must be GuildVoice'
}

export const GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST: FormBodyError = {
  code: 'GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST',
  message: 'Channels with a parent_id must appear after their category channel'
}

export const GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT: FormBodyError = {
  code: 'GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT',
  message: 'System channels must be GuildText'
}

export const MAX_EMBED_SIZE_EXCEEDED: FormBodyError = {
  code: 'MAX_EMBED_SIZE_EXCEEDED',
  message: 'Embed size exceeds maximum size of 6000'
}

export const NONCE_TYPE_INVALID_TYPE: FormBodyError = {
  code: 'NONCE_TYPE_INVALID_TYPE',
  message: 'This field must be a string or integer.'
}

// export const NONCE_TYPE_OUT_OF_BOUNDS: FormBodyError = {
//   code: 'NONCE_TYPE_OUT_OF_BOUNDS',
//   message: 'Must be between -9223372036854775808 and 9223372036854775807.'
// }

export const NONCE_TYPE_TOO_LONG: FormBodyError = {
  code: 'NONCE_TYPE_TOO_LONG',
  message: 'Must be 25 or fewer characters long.'
}

export const REPLIES_CANNOT_REFERENCE_OTHER_CHANNEL: FormBodyError = {
  code: 'REPLIES_CANNOT_REFERENCE_OTHER_CHANNEL',
  message: 'Cannot reply to a message in a different channel'
}

export const REPLIES_UNKNOWN_MESSAGE: FormBodyError = {
  code: 'REPLIES_UNKNOWN_MESSAGE',
  message: 'Unknown message'
}

export const SET_TYPE_ALREADY_CONTAINS_VALUE: FormBodyError = {
  code: 'SET_TYPE_ALREADY_CONTAINS_VALUE',
  message: 'The set already contains this value'
}

// export const URL_TYPE_INVALID_URL: FormBodyError = {
//   code: 'URL_TYPE_INVALID_URL',
//   message: 'Not a well formed URL.'
// }

export const BASE_TYPE_BAD_LENGTH = (
  min: number,
  max: number
): FormBodyError => ({
  code: 'BASE_TYPE_BAD_LENGTH',
  message: `Must be between ${min} and ${max} in length.`
})

export const BASE_TYPE_MAX_LENGTH = (max: number): FormBodyError => ({
  code: 'BASE_TYPE_MAX_LENGTH',
  message: `Must be ${max} or fewer in length.`
})

export const BASE_TYPE_CHOICES = (
  choices: Iterable<number | string>
): FormBodyError => ({
  code: 'BASE_TYPE_CHOICES',
  message: `Value must be one of (${[...choices].join(', ')}).`
})

export const DATE_TIME_TYPE_PARSE = (input: string): FormBodyError => ({
  code: 'DATE_TIME_TYPE_PARSE',
  message: `Could not parse ${input}. Should be ISO8601.`
})

export const GUILD_CREATE_CHANNEL_ID_INVALID = (
  key: string,
  id: number | string
): FormBodyError => ({
  code: 'GUILD_CREATE_CHANNEL_ID_INVALID',
  message: `Invalid ${key} (${id})`
})

export const MESSAGE_ALLOWED_MENTIONS_PARSE_EXCLUSIVE = (
  type: AllowedMentionsTypes
): FormBodyError => ({
  code: 'MESSAGE_ALLOWED_MENTIONS_PARSE_EXCLUSIVE',
  message: `parse:["${type}"] and ${type}: [ids...] are mutually exclusive.`
})

export const NUMBER_TYPE_MAX = (max: number): FormBodyError => ({
  code: 'NUMBER_TYPE_MAX',
  message: `int value should be less than or equal to ${max}.`
})

export const NUMBER_TYPE_MIN = (min: number): FormBodyError => ({
  code: 'NUMBER_TYPE_MIN',
  message: `int value should be greater than or equal to ${min}.`
})

// export const URL_TYPE_INVALID_SCHEME = (scheme: string): FormBodyError => ({
//   code: 'URL_TYPE_INVALID_SCHEME',
//   message: `Scheme "${scheme}" is not supported. Scheme must be one of ('http', 'https').`
// })
/* eslint-enable id-length */
