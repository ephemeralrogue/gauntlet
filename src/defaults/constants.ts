import {
  PermissionFlagsBits,
  ThreadAutoArchiveDuration
} from 'discord-api-types/v9';

export const DEFAULT_CHANNEL_NAME = 'general'
export const DEFAULT_STANDARD_EMOJI = '🔥'
export const DEFAULT_CUSTOM_EMOJI_NAME = 'LUL'
export const DEFAULT_GUILD_NAME = 'Discord Developers'
export const DEFAULT_NEW_GUILD_NAME = 'Discord Testers'
export const DEFAULT_GUILD_PREFERRED_LOCALE = 'en-US'
export const DEFAULT_INTEGRATION_NAME = 'Integration Name'
export const DEFAULT_NEW_INTEGRATION_NAME = 'New Integration Name'
export const DEFAULT_ROLE_NAME = 'new role'
export const DEFAULT_STAGE_TOPIC = 'Testing Testing, 123'
export const DEFAULT_STICKER_DESCRIPTION = 'Wumpus waves hello'
export const DEFAULT_STICKER_NAME = 'Wave'
export const DEFAULT_THREAD_AUTO_ARCHIVE_DURATION =
  ThreadAutoArchiveDuration.OneDay
export const DEFAULT_WEBHOOK_NAME = 'Captain Hook'
export const DEFAULT_NEW_WEBHOOK_NAME = 'Spidey Bot'

export const DEFAULT_PERMISSIONS =
  PermissionFlagsBits.CreateInstantInvite |
  PermissionFlagsBits.AddReactions |
  PermissionFlagsBits.Stream |
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.AttachFiles |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.MentionEveryone |
  PermissionFlagsBits.UseExternalEmojis |
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.Speak |
  PermissionFlagsBits.UseVAD |
  PermissionFlagsBits.ChangeNickname

export const DEFAULT_PERMISSIONS_STRING = `${DEFAULT_PERMISSIONS}` as const
