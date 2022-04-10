import Discord from 'discord.js'
import defaults from '../defaults'
import {mergeDefault} from '../util'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Base, Team, User} from '.'

export class TeamMember extends Discord.TeamMember implements Base {
  client!: Client
  team!: Team
  user!: User

  constructor(team: Team, data?: Partial<Data.TeamMember>) {
    super(team, mergeDefault({...defaults.teamMember, team_id: team.id}, data))
  }
}
