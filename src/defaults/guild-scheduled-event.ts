import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventStatus
} from 'discord-api-types/v9'
import {snowflake, timestamp} from '../utils'
import {createDefaults as d} from './utils'
import type {GuildScheduledEvent} from '../types'

type DOmit<T, K extends T extends unknown ? keyof T : never> = T extends unknown
  ? Omit<T, K>
  : never

export const guildScheduledEvent = d<GuildScheduledEvent>(event => {
  const creator = snowflake()
  const base: DOmit<
    GuildScheduledEvent,
    'channel_id' | 'entity_metadata' | 'entity_type'
  > = {
    id: snowflake(),
    // events created >=25/10/21 always have a creator_id
    creator_id: creator,
    name: 'Event name',
    scheduled_start_time: timestamp(),
    scheduled_end_time: null,
    privacy_level: GuildScheduledEventPrivacyLevel.GuildOnly,
    status: GuildScheduledEventStatus.Scheduled,
    entity_id: null,
    ...event,
    user_ids: [...new Set([creator, ...(event.user_ids ?? [])])]
  }

  switch (event.entity_type) {
    case GuildScheduledEventEntityType.External:
      return {
        channel_id: null,
        entity_metadata: {location: '', ...event.entity_metadata},
        ...(base as typeof base & {
          entity_type: GuildScheduledEventEntityType.External
        })
      }
    default:
      return {
        entity_type: GuildScheduledEventEntityType.StageInstance,
        channel_id: snowflake(),
        entity_metadata: null,
        ...base
      }
  }
})
