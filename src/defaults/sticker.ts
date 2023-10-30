import {StickerFormatType, StickerType} from 'discord-api-types/v9'
import {DEFAULT_STICKER_NAME} from './constants'
import {snowflake} from '../utils'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {GuildSticker, StandardSticker, StickerItem} from '../types'

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
  ...(_sticker.user ? {user: user(_sticker.user)} : {})
}))

export const standardSticker = d<StandardSticker>(({type, ...rest}) => ({
  pack_id: snowflake(),
  ...guildSticker(rest),
  type: StickerType.Standard
}))
