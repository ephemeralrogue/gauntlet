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
  message: 'AFK channels must be GUILD_VOICE'
}

export const GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST: FormBodyError = {
  code: 'GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST',
  message: 'Channels with a parent_id must appear after their category channel'
}

export const GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT: FormBodyError = {
  code: 'GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT',
  message: 'System channels must be GUILD_TEXT'
}

export const BASE_TYPE_BAD_LENGTH = (
  min: number,
  max: number
): FormBodyError => ({
  code: 'BASE_TYPE_BAD_LENGTH',
  message: `Must be between ${min} and ${max} in length.`
})

export const BASE_TYPE_CHOICES = (
  choices: string | readonly (number | string)[]
): FormBodyError => ({
  code: 'BASE_TYPE_CHOICES',
  message: `Value must be one of (${
    typeof choices == 'string' ? choices : choices.join(', ')
  }).`
})

export const GUILD_CREATE_CHANNEL_ID_INVALID = (
  key: string,
  id: number | string
): FormBodyError => ({
  code: 'GUILD_CREATE_CHANNEL_ID_INVALID',
  message: `Invalid ${key} (${id})`
})
/* eslint-enable id-length */
