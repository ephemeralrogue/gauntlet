import type {Snowflake} from 'discord.js'
import type {User} from './User'

export interface StandardEmoji {
  id: null
  name: string
  animated: boolean
}

export interface GuildPreviewEmoji {
  id: string
  name: string
  animated: boolean
  roles: Snowflake[]
  require_colons: boolean
  managed: boolean
}

export interface GuildEmoji extends GuildPreviewEmoji {
  user: User
}

/** https://discord.com/developers/docs/resources/emoji#emoji-object */
export type Emoji = StandardEmoji | GuildEmoji

/** https://discord.com/developers/docs/resources/emoji#emoji-object-gateway-reaction-standard-emoji-example */
export type ReactionEmoji =
  | Pick<StandardEmoji, 'id' | 'name'>
  | (Pick<GuildEmoji, 'id'> & {name: string | null; animated?: true})

/** https://discord.com/developers/docs/resources/emoji#create-guild-emoji */
export interface CreateGuildEmojiParams {
  name: string
  image: string
  roles?: Snowflake[]
}
