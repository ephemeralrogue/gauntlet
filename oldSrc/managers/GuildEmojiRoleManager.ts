import Discord from 'discord.js'
import type {Collection, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type {Guild, GuildEmoji, Role} from '../structures'
import type {RoleOrRoles, Roles} from './guild/types'

export interface GuildEmojiRoleManager extends Discord.GuildEmojiRoleManager {
  readonly client: Client
  cache: Collection<Snowflake, Role>
  emoji: GuildEmoji
  guild: Guild
  add(roleOrRoles: RoleOrRoles): Promise<GuildEmoji>
  set(roles: Roles): Promise<GuildEmoji>
  remove(roleOrRoles: RoleOrRoles): Promise<GuildEmoji>
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- GuildEmojiRoleManager is a class
export const GuildEmojiRoleManager = Discord.GuildEmojiRoleManager as new (emoji: GuildEmoji) => GuildEmojiRoleManager
