import {WebhookType} from 'discord-api-types/v8'
import {snowflake} from '../utils'
import {partialChannel} from './channel'
import {partialGuild} from './guild'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {APIWebhook} from 'discord-api-types/v8'

export const webhook = d<APIWebhook>(hook => ({
  id: snowflake(),
  type: WebhookType.Incoming,
  channel_id: snowflake(),
  name: null,
  avatar: null,
  application_id: null,
  ...hook,
  user: hook?.user ? user(hook.user) : undefined,
  source_guild: hook?.source_guild
    ? partialGuild(hook.source_guild)
    : undefined,
  source_channel: hook?.source_channel
    ? partialChannel(hook.source_channel)
    : undefined
}))
