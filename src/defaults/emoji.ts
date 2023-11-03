import { snowflake } from '../utils.ts';
import {
  DEFAULT_CUSTOM_EMOJI_NAME,
  DEFAULT_STANDARD_EMOJI
} from './constants.ts';
import { createDefaults as d } from './utils.ts';
import type {
  GuildEmoji,
  PartialEmoji
} from '../types/index.ts';

export const partialEmoji = d<PartialEmoji>(emoji =>
  emoji.id == null
    ? // Ordinary emoji
    { id: null, name: emoji.name ?? DEFAULT_STANDARD_EMOJI }
    : // Custom emoji
    {
      id: emoji.id,
      name: emoji.name ?? DEFAULT_CUSTOM_EMOJI_NAME
    }
)

export const guildEmoji = d<GuildEmoji>(emoji => ({
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
