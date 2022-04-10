import Discord from 'discord.js'
import defaults from '../../defaults'
import {User} from '../../structures/User'
import {mergeDefault} from '../../util'
import manager from '../BaseManager'
import type {Collection, UserResolvable, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type * as Data from '../../data'

export class UserManager extends manager<Discord.UserManager, typeof User, UserResolvable>(Discord.UserManager) {
  readonly client!: Client
  cache!: Collection<Snowflake, User>
  holds!: typeof User
  declare add: (data?: Partial<Data.User>, cache?: boolean, {id, extras}?: {id: Snowflake, extras?: any[]}) => User
  resolve!: (resolvable: UserResolvable) => User | null

  constructor(client: Client, iterable?: Iterable<Data.User>) {
    super(client, iterable, User)
  }

  /**
   * Obtains a user from Discord, or the user cache if it's already available.
   *
   * @param id The ID of the user.
   * @param cache Whether to cache the new user object if it isn't already.
   * @param data Optional data for the user. Will only be used if `cache` is `false`.
   */
  async fetch(id: string, cache = true, data?: Partial<Data.User>): Promise<User> {
    const existing = this.cache.get(id)
    if (existing) return existing
    return this.add(mergeDefault(defaults.user, {...data, id}), cache)
  }
}
