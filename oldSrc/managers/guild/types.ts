import type {Collection, Role, RoleResolvable, Snowflake} from 'discord.js'

export type Roles = RoleResolvable[] | Collection<Snowflake, Role>
export type RoleOrRoles = RoleResolvable | Roles
