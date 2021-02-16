import {ActivityType} from 'discord-api-types/v8'
import {snowflake} from '../utils'
import {DEFAULT_CUSTOM_EMOJI_NAME, DEFAULT_STANDARD_EMOJI} from './constants'
import {createDefaults as d} from './utils'
import type {
  GatewayActivityEmoji,
  GatewayActivityParty,
  GatewayPresenceUpdate
} from 'discord-api-types/v8'
import type {DataPartialDeep} from '../resolve-collection'
import type {Activity, GuildPresence} from '../types'
import type {Override} from '../utils'

export const activityEmoji = d<GatewayActivityEmoji>(_emoji =>
  !_emoji || _emoji.id === undefined
    ? // Ordinary emoji
      {name: _emoji?.name ?? DEFAULT_STANDARD_EMOJI}
    : // Custom emoji
      {
        id: snowflake(),
        name: DEFAULT_CUSTOM_EMOJI_NAME,
        ..._emoji
      }
)

export const party = d<GatewayActivityParty>(_party => {
  if (_party?.size) {
    const currentSize = _party.size[0] ?? 1
    return {..._party, size: [currentSize, _party.size[1] ?? currentSize]}
  }
  return {
    ...(_party as Override<
      DataPartialDeep<GatewayActivityParty>,
      {
        size?: undefined
      }
    >)
  }
})

export const activity = d<Activity>(_activity => {
  const name = _activity?.name ?? 'Twitch'
  const type = _activity?.type ?? ActivityType.Streaming
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
    ..._activity,
    emoji: _activity?.emoji ? activityEmoji(_activity.emoji) : undefined,
    party: _activity?.party ? party(_activity.party) : undefined
  }
})

export const presenceUser = d<GatewayPresenceUpdate['user']>(_user => ({
  id: snowflake(),
  ..._user
}))

export const guildPresence = d<GuildPresence>(_presence => ({
  ..._presence,
  user: presenceUser(_presence?.user),
  activities: _presence?.activities
    ? _presence.activities.map(activity)
    : undefined
}))
