import type {Snowflake} from 'discord.js'
import type {User} from './User'

export const enum MembershipState {
  INVITED = 1,
  ACCEPTED
}

export interface TeamMember {
  membership_state: MembershipState
  permissions: ['*']
  team_id: Snowflake
  user: Pick<User, 'id' | 'username' | 'discriminator' | 'avatar'>
}

export interface Team {
  icon: string | null
  id: Snowflake
  members: TeamMember[]
  owner_user_id: Snowflake
}
