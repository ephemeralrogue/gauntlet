import {snowflake, timestamp} from '../utils'
import {
  DEFAULT_CHANNEL_NAME,
  DEFAULT_GUILD_NAME,
  DEFAULT_GUILD_PREFERRED_LOCALE
} from './constants'
import {createDefaults as d} from './utils'
import {overwrite} from './channel'
import type {
  APIGuildCreatePartialChannel,
  APIGuildCreateRole,
  APITemplateSerializedSourceGuild
} from 'discord-api-types/v8'
import type {DataGuildTemplate} from '../types'

// These live here instead of in ./guild.ts to avoid dependency cycles
const guildCreateRole = d<APIGuildCreateRole>(_role => ({
  id: snowflake(),
  ..._role
}))

const guildCreatePartialChannel = d<APIGuildCreatePartialChannel>(channel => ({
  name: DEFAULT_CHANNEL_NAME,
  ...channel,
  permission_overwrites: channel?.permission_overwrites
    ? channel.permission_overwrites.map(overwrite)
    : undefined
}))

const templateSerializedSourceGuild = d<APITemplateSerializedSourceGuild>(
  guild => ({
    name: DEFAULT_GUILD_NAME,
    description: null,
    preferred_locale: DEFAULT_GUILD_PREFERRED_LOCALE,
    icon_hash: null,
    ...guild,
    // TODO: @everyone role
    roles: guild?.roles ? guild.roles.map(guildCreateRole) : undefined,
    channels: guild?.channels
      ? guild.channels.map(guildCreatePartialChannel)
      : undefined
  })
)

export const dataGuildTemplate = d<DataGuildTemplate>(_template => ({
  code: Math.random().toString(36).slice(2),
  name: 'Friends & Family',
  description: null,
  usage_count: 0,
  creator_id: snowflake(),
  created_at: timestamp(),
  updated_at: timestamp(),
  is_dirty: null,
  ..._template,
  serialized_source_guild: templateSerializedSourceGuild(
    _template?.serialized_source_guild
  )
}))
