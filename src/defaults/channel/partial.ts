// This is separate from channel/index.ts to avoid import cycles

import {ChannelType} from 'discord-api-types/v9'
import {snowflake} from '../../utils'
import {createDefaults as d} from '../utils'
import type {PartialChannel, PartialDeep} from '../../types'

export const partialChannel: <T extends PartialChannel>(
  channel?: PartialDeep<T>
) => PartialChannel & {type: T['type']} = d<PartialChannel>(channel => ({
  id: channel?.id ?? snowflake(),
  type: channel?.type ?? ChannelType.GuildText,
  name:
    // Every channel except for DMs can have names
    channel?.type === ChannelType.DM ? undefined : channel?.name ?? 'general'
}))
