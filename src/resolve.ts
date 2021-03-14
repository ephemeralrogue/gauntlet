import {toCollection} from './utils'
import type {D, RD} from './types'

export const dmChannel = ({messages, ...rest}: D.DMChannel): RD.DMChannel => ({
  ...rest,
  messages: toCollection(messages)
})

export const guildChannel = ({
  permission_overwrites,
  messages,
  ...rest
}: D.GuildChannel): RD.GuildChannel => ({
  permission_overwrites: toCollection(permission_overwrites),
  messages: messages ? toCollection(messages) : undefined,
  ...rest
})

export const guild = ({
  audit_log_entries,
  channels,
  emojis,
  integrations,
  members,
  presences,
  roles,
  voice_states,
  ...rest
}: D.Guild): RD.Guild => ({
  audit_log_entries: toCollection(audit_log_entries),
  channels: toCollection(channels.map(guildChannel)),
  emojis: toCollection(emojis),
  integrations: toCollection(integrations),
  members: toCollection(members),
  presences: toCollection(presences, 'user_id'),
  roles: toCollection(roles),
  voice_states: toCollection(voice_states, 'user_id'),
  ...rest
})
