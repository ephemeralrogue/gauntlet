import {
  StickerFormatType,
  StickerType
} from 'discord-api-types/v9';
import { DEFAULT_STICKER_NAME } from './constants.ts';
import { snowflake } from '../utils.ts';
import { user } from './user.ts';
import { createDefaults as d } from './utils.ts';
import type {
  GuildSticker,
  StandardSticker,
  StickerItem
} from '../types/index.ts';

export const stickerItem = d<StickerItem>(item => ({
  id: snowflake(),
  name: DEFAULT_STICKER_NAME,
  format_type: StickerFormatType.PNG,
  ...item
}))

export const guildSticker = d<GuildSticker>(_sticker => ({
  description: null,
  tags: '',
  asset: '',
  type: StickerType.Guild,
  ...stickerItem(_sticker),
  ...(_sticker.user ? { user: user(_sticker.user) } : {})
}))

export const standardSticker = d<StandardSticker>(({ type, ...rest }) => ({
  pack_id: snowflake(),
  ...guildSticker(rest),
  type: StickerType.Standard
}))
