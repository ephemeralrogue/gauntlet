import {snowflake} from '../utils'
import {DEFAULT_CUSTOM_EMOJI_NAME} from './constants'
import type {DataGuildEmoji} from '../Data'
import type {Defaults} from '../resolve-collection'

export const dataGuildEmoji: Defaults<DataGuildEmoji> = emoji => ({
  id: snowflake(),
  name: DEFAULT_CUSTOM_EMOJI_NAME,
  animated: false,
  roles: [],
  user_id: snowflake(),
  require_colons: true,
  managed: false,
  available: true,
  ...emoji
})
