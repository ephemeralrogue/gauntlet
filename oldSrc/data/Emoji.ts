import type {Snowflake} from 'discord.js'
import type {User} from './User'

export interface StandardEmoji {
  id: null
  name: string
  animated: boolean
}

export interface GuildPreviewEmoji {
  id: string
  name: string | null
  animated: boolean
  roles: Snowflake[]
  require_colons: boolean
  managed: boolean
}

export interface GuildEmoji extends GuildPreviewEmoji {
  user: User
}

export type BaseGuildEmoji = GuildEmoji | GuildPreviewEmoji
export type Emoji = StandardEmoji | BaseGuildEmoji

export type ReactionEmoji = Pick<Emoji, 'id' | 'name'> | Pick<GuildEmoji, 'id' | 'name'> & {animated: true}
