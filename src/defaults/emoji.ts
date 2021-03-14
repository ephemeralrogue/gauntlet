import {snowflake} from '../utils'
import {DEFAULT_CUSTOM_EMOJI_NAME, DEFAULT_STANDARD_EMOJI} from './constants'
import {createDefaults as d} from './utils'
import type {D} from '../types'

export const dataPartialEmoji = d<D.PartialEmoji>(emoji =>
  !emoji || emoji.id == null
    ? // Ordinary emoji
      {id: null, name: emoji?.name ?? DEFAULT_STANDARD_EMOJI}
    : // Custom emoji
      {
        id: emoji.id,
        name: emoji.name ?? DEFAULT_CUSTOM_EMOJI_NAME
      }
)

export const dataGuildEmoji = d<D.GuildEmoji>(emoji => ({
  id: snowflake(),
  name: DEFAULT_CUSTOM_EMOJI_NAME,
  animated: false,
  roles: [],
  user_id: snowflake(),
  require_colons: true,
  managed: false,
  available: true,
  ...emoji
}))
