import {WebhookType} from 'discord-api-types/v9'
import {snowflake} from '../utils'
import {partialChannel} from './channel/partial'
import {partialGuild} from './guild/partial'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {Webhook} from '../types'

export const webhook = d<Webhook>(
  ({source_channel, source_guild, user: wUser, ...rest}) => ({
    id: snowflake(),
    type: WebhookType.Incoming,
    name: null,
    avatar: null,
    application_id: null,
    ...rest,
    ...(wUser ? {user: user(wUser)} : {}),
    ...(source_guild ? {source_guild: partialGuild(source_guild)} : {}),
    ...(source_channel ? {source_channel: partialChannel(source_channel)} : {})
  })
)
