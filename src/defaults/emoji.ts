import {snowflake} from '../utils'
import {DEFAULT_CUSTOM_EMOJI_NAME} from './constants'
import {createDefaults as d} from './utils'
import type {DataGuildEmoji} from '../Data'

export const dataGuildEmoji = d<DataGuildEmoji>(emoji => ({
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
