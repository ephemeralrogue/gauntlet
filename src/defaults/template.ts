import {
  randomString,
  snowflake,
  timestamp
} from '../utils.ts';
import {
  DEFAULT_CHANNEL_NAME,
  DEFAULT_GUILD_NAME,
  DEFAULT_GUILD_PREFERRED_LOCALE
} from './constants.ts';
import { createDefaults as d } from './utils.ts';
import { partialOverwrite } from './channel/index.ts';
import type {
  GuildCreateOverwrite,
  GuildCreatePartialChannel,
  GuildCreateRole,
  GuildTemplate,
  TemplateSerializedSourceGuild
} from '../types/index.ts';

// These live here instead of in ./guild.ts to avoid dependency cycles
const guildCreateRole = d<GuildCreateRole>(_role => ({
  id: snowflake(),
  ..._role
}))

const guildCreateOverwrite = d<GuildCreateOverwrite>(overwrite => ({
  ...partialOverwrite(),
  allow: '0',
  deny: '0',
  ...overwrite
}))

const guildCreatePartialChannel = d<GuildCreatePartialChannel>(
  ({ permission_overwrites, ...rest }) => ({
    name: DEFAULT_CHANNEL_NAME,
    ...rest,
    ...(permission_overwrites
      ? {
        permission_overwrites: permission_overwrites.map(guildCreateOverwrite)
      }
      : {})
  })
)

const templateSerializedSourceGuild = d<TemplateSerializedSourceGuild>(
  ({ channels, roles, ...rest }) => ({
    name: DEFAULT_GUILD_NAME,
    description: null,
    preferred_locale: DEFAULT_GUILD_PREFERRED_LOCALE,
    icon_hash: null,
    ...rest,
    // TODO: @everyone role
    ...(roles ? { roles: roles.map(guildCreateRole) } : {}),
    ...(channels ? { channels: channels.map(guildCreatePartialChannel) } : {})
  })
)

export const guildTemplate = d<GuildTemplate>(_template => ({
  code: randomString(),
  name: 'Friends & Family',
  description: null,
  usage_count: 0,
  creator_id: snowflake(),
  created_at: timestamp(),
  updated_at: timestamp(),
  is_dirty: null,
  ..._template,
  serialized_source_guild: templateSerializedSourceGuild(
    _template.serialized_source_guild
  )
}))
