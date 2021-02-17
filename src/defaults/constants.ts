import {PermissionFlagsBits} from 'discord-api-types/v8'

export const DEFAULT_CHANNEL_NAME = 'general'
export const DEFAULT_STANDARD_EMOJI = '🔥'
export const DEFAULT_CUSTOM_EMOJI_NAME = 'LUL'
export const DEFAULT_GUILD_NAME = 'Discord Developers'
export const DEFAULT_NEW_GUILD_NAME = 'Discord Testers'
export const DEFAULT_GUILD_PREFERRED_LOCALE = 'en-US'
export const DEFAULT_INTEGRATION_NAME = 'Integration Name'
export const DEFAULT_NEW_INTEGRATION_NAME = 'New Integration Name'
export const DEFAULT_ROLE_NAME = 'new role'
export const DEFAULT_WEBHOOK_NAME = 'Captain Hook'
export const DEFAULT_NEW_WEBHOOK_NAME = 'Spidey Bot'

export const DEFAULT_PERMISSIONS =
  PermissionFlagsBits.CREATE_INSTANT_INVITE |
  PermissionFlagsBits.ADD_REACTIONS |
  PermissionFlagsBits.STREAM |
  PermissionFlagsBits.VIEW_CHANNEL |
  PermissionFlagsBits.SEND_MESSAGES |
  PermissionFlagsBits.EMBED_LINKS |
  PermissionFlagsBits.ATTACH_FILES |
  PermissionFlagsBits.READ_MESSAGE_HISTORY |
  PermissionFlagsBits.MENTION_EVERYONE |
  PermissionFlagsBits.USE_EXTERNAL_EMOJIS |
  PermissionFlagsBits.CONNECT |
  PermissionFlagsBits.SPEAK |
  PermissionFlagsBits.USE_VAD |
  PermissionFlagsBits.CHANGE_NICKNAME

export const DEFAULT_PERMISSIONS_STRING = `${DEFAULT_PERMISSIONS}` as const
