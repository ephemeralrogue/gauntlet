import {ActivityType} from 'discord-api-types/v9'
import {snowflake} from '../utils'
import {DEFAULT_CUSTOM_EMOJI_NAME, DEFAULT_STANDARD_EMOJI} from './constants'
import {createDefaults as d} from './utils'
import type {
  Activity,
  ActivityEmoji,
  ActivityParty,
  GuildPresence,
  PresenceUpdate
} from '../types'

export const activityEmoji = d<ActivityEmoji>(_emoji =>
  _emoji.id == null
    ? // Ordinary emoji
      {name: _emoji.name ?? DEFAULT_STANDARD_EMOJI}
    : // Custom emoji
      {
        id: snowflake(),
        name: DEFAULT_CUSTOM_EMOJI_NAME,
        ..._emoji
      }
)

export const party = d<ActivityParty>(_party => {
  if (_party.size) {
    const currentSize = _party.size[0] ?? 1
    return {..._party, size: [currentSize, _party.size[1] ?? currentSize]}
  }
  return _party as Omit<typeof _party, 'size'>
})

export const activity = d<Activity>(
  ({emoji, party: aParty, ...rest}): Activity => {
    const name = rest.name ?? 'Twitch'
    const type = rest.type ?? ActivityType.Streaming
    return {
      id:
        type === ActivityType.Custom
          ? 'custom'
          : name === 'Spotify'
          ? 'spotify:1'
          : 'activity-id', // ec0b28a579ecb4bd, d593101b9c8b5f61
      name,
      type,
      url: null,
      created_at: Date.now(),
      ...rest,
      ...(emoji ? {emoji: activityEmoji(emoji)} : {}),
      ...(aParty ? {party: party(aParty)} : {})
    }
  }
)

export const presenceUser = d<PresenceUpdate['user']>(_user => ({
  id: snowflake(),
  ..._user
}))

export const guildPresence = d<GuildPresence>(({activities, ...rest}) => ({
  ...rest,
  user_id: snowflake(),
  ...(activities ? {activities: activities.map(activity)} : {})
}))
