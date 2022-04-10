import Discord, {Permissions} from 'discord.js'
import defaults from '../../defaults'
import {Role} from '../../structures/Role'
import manager from '../BaseManager'
import type {Collection, RoleData, RoleResolvable, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type * as Data from '../../data'
import type {Guild} from '../../structures'
import {Util, mergeDefault} from '../../util'

const {resolveColor} = Util

export class RoleManager extends manager<Discord.RoleManager, typeof Role, RoleResolvable>(Discord.RoleManager) {
  readonly client!: Client
  cache!: Collection<Snowflake, Role>
  holds!: typeof Role
  readonly everyone!: Role
  readonly highest!: Role
  add!: (data?: Partial<Data.Role>, cache?: boolean) => Role
  resolve!: (resolvable: RoleResolvable) => Role | null

  constructor(public guild: Guild, iterable?: Iterable<Data.Role>) {
    super(guild.client, iterable, Role)
  }

  /**
   * Obtains one role.
   *
   * @param id The ID of the role.
   * @param cache Whether to cache the new role object if it wasn't already.
   * @param data The data of the role.
   * @example
   * // Fetch a single role
   * message.guild.roles.fetch('222078108977594368')
   *   .then(role => console.log(`The role colour is: ${role.color}`))
   *   .catch(console.error)
   */
  async fetch(id: Snowflake, cache?: boolean, data?: Partial<Data.Role>): Promise<Role | null>

  /**
   * Obtains the roles of this guild.
   *
   * @param data The data for the roles.
   * @example
   * // Fetch all roles from the guild
   * message.guild.roles.fetch()
   *   .then(roles => console.log(`There are ${roles.cache.size} roles.`))
   *   .catch(console.error)
   */
  async fetch(data?: Partial<Data.Role>[] | Snowflake): Promise<this>

  async fetch(
    id: Snowflake | Partial<Data.Role>[] = [], cache = true, data?: Partial<Data.Role>
  ): Promise<Role | null | this> {
    if (typeof id == 'string') {
      const existing = this.cache.get(id)
      if (existing) return existing
    }

    const roles = data
      ? [mergeDefault(defaults.role, data)]
      : Array.isArray(id) ? id.map(role => mergeDefault(defaults.role, role)) : []
    roles.forEach(role => this.add(role, cache))
    return typeof id == 'string' ? this.cache.get(id) ?? null : this
  }

  /**
   * Creates a new role in the guild with given information.
   *
   * The position will silently reset to 1 if an invalid one or nothing is provided.
   *
   * @param options The options.
   * @param options.data The data to create the role with.
   * @param options.reason The reason for creating this role.
   * @example
   * // Create a new role
   * guild.roles.create()
   *   .then(console.log)
   *   .catch(console.error)
   * @example
   * // Create a new role with data and a reason
   * guild.roles.create({
   *   data: {name: 'Super Cool People', color: 'BLUE'},
   *   reason: 'we needed a role for Super Cool People'
   * })
   *   .then(console.log)
   *   .catch(console.error)
   */
  async create({data = {}, reason}: {data?: RoleData, reason?: string} = {}): Promise<Role> {
    const {role} = this.client._actions.GuildRoleCreate.handle({
      guild_id: this.guild.id,
      role: mergeDefault(defaults.role, {
        ...data,
        color: data.color === undefined ? undefined : resolveColor(data.color),
        permissions: data.permissions === undefined ? undefined : Permissions.resolve(data.permissions)
      })
    })
    // TODO: Fix Discord.js as it does role.setPosition(data.position, reason)
    // TODO: Fix Discord.js because it checks if data.position is falsy before setting the position, so if data.position is 0
    // the position won't be set
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- see above
    if (data.position) return role.setPosition(data.position, {reason})
    return role
  }
}
