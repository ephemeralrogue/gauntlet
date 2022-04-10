import type {Snowflake} from 'discord.js'
import type {User} from './User'

/** https://discord.com/developers/docs/topics/teams#data-models-membership-state-enum */
export const enum MembershipState {
  INVITED = 1,
  ACCEPTED
}

/** https://discord.com/developers/docs/topics/teams#data-models-team-members-object */
export interface TeamMember {
  membership_state: MembershipState
  permissions: ['*']
  team_id: Snowflake
  user: Pick<User, 'id' | 'username' | 'discriminator' | 'avatar'>
}

/** https://discord.com/developers/docs/topics/teams#data-models-team-object */
export interface Team {
  icon: string | null
  id: Snowflake
  members: TeamMember[]
  owner_user_id: Snowflake
}
