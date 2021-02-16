import {TeamMemberMembershipState} from 'discord-api-types/v8'
import {snowflake} from '../utils'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {APITeam, APITeamMember} from 'discord-api-types/v8'

export const teamMember = d<APITeamMember>(member => ({
  membership_state: TeamMemberMembershipState.INVITED,
  team_id: snowflake(),
  ...member,
  permissions: ['*'],
  user: user(member?.user)
}))

export const team = d<APITeam>(_team => {
  const id = snowflake()
  const ownerID = snowflake()
  return {
    id,
    icon: null,
    owner_user_id: ownerID,
    members: _team?.members?.map(member => ({
      ...teamMember(member),
      team_id: id
    })) ?? [
      teamMember({
        team_id: id,
        membership_state: TeamMemberMembershipState.ACCEPTED,
        user: {id: ownerID}
      })
    ]
  }
})