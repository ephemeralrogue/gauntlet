import { WebhookType } from 'discord-api-types/v9';
import { snowflake } from '../utils.ts';
import { partialChannel } from './channel/partial.ts';
import { partialGuild } from './guild/partial.ts';
import { user } from './user.ts';
import { createDefaults as d } from './utils.ts';
import type { Webhook } from '../types/index.ts';

export const webhook = d<Webhook>(
  ({ source_channel, source_guild, user: wUser, ...rest }) => ({
    id: snowflake(),
    type: WebhookType.Incoming,
    name: null,
    avatar: null,
    application_id: null,
    ...rest,
    ...(wUser ? { user: user(wUser) } : {}),
    ...(source_guild ? { source_guild: partialGuild(source_guild) } : {}),
    ...(source_channel ? { source_channel: partialChannel(source_channel) } : {})
  })
)
