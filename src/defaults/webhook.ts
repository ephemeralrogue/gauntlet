import {WebhookType} from 'discord-api-types/v9'
import {snowflake} from '../utils'
import {partialChannel} from './channel/partial'
import {partialGuild} from './guild/partial'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {Webhook} from '../types'

export const webhook = d<Webhook>(hook => ({
  id: snowflake(),
  type: WebhookType.Incoming,
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
