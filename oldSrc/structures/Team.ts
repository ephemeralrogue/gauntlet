import Discord from 'discord.js'
import defaults from '../defaults'
import {mergeDefault} from '../util'
import type {Collection, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Base, TeamMember} from '.'

export class Team extends Discord.Team implements Base {
  client!: Client
  members!: Collection<Snowflake, TeamMember>

  constructor(client: Client, data?: Partial<Data.Team>) {
    super(client, mergeDefault(defaults.team, data))
  }
}
