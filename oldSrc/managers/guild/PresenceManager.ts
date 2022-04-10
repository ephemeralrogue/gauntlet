import Discord from 'discord.js'
import {Presence} from '../../structures/Presence'
import manager from '../BaseManager'
import type {Collection, PresenceResolvable, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type * as Data from '../../data'

export class PresenceManager extends manager<Discord.PresenceManager, typeof Presence, PresenceResolvable>(
  Discord.PresenceManager
) {
  readonly client!: Client
  cache!: Collection<Snowflake, Presence>
  holds!: typeof Presence
  add!: (data?: Partial<Data.Presence>, cache?: boolean) => Presence
  resolve!: (resolvable: PresenceResolvable) => Presence | null

  constructor(client: Client, iterable?: Iterable<Data.Presence>) {
    super(client, iterable, Presence)
  }
}
