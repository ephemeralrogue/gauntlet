import {TeamMemberMembershipState} from 'discord-api-types/v9'
import {snowflake} from '../utils'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {APITeam, APITeamMember} from 'discord-api-types/v9'

export const teamMember = d<APITeamMember>(member => ({
  membership_state: TeamMemberMembershipState.Invited,
  team_id: snowflake(),
  ...member,
  permissions: ['*'],
  user: user(member?.user)
}))

export const team = d<APITeam>(_team => {
  const id = snowflake()
  const ownerId = snowflake()
  return {
    id,
    icon: null,
    name: 'Team name',
    owner_user_id: ownerId,
    members: _team?.members?.map(member => ({
      ...teamMember(member),
      team_id: id
    })) ?? [
      teamMember({
        team_id: id,
        membership_state: TeamMemberMembershipState.Accepted,
        user: {id: ownerId}
      })
    ]
  }
})
