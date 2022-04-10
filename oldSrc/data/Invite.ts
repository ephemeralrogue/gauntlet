import type {GuildChannel, PartialGroupDMChannel} from './Channel'
import type {Guild} from './Guild'
import type {User} from './User'
import type {Timestamp} from './utils'

export const enum TargetUserType {
  STREAM = 1
}

export interface Invite {
  code: string
  guild?: Pick<Guild,
  | 'id'
  | 'name'
  | 'splash'
  | 'description'
  | 'icon'
  | 'features'
  | 'verification_level'
  | 'vanity_url_code'
  >
  channel: Pick<GuildChannel, 'id' | 'type' | 'name'> | PartialGroupDMChannel
  inviter?: Pick<User,
  | 'id'
  | 'username'
  | 'avatar'
  | 'discriminator'
  >
  target_user?: Partial<User> & Pick<User, 'id'>
  target_user_type?: TargetUserType
  approximate_presence_count?: number
  approximate_member_count?: number
}

export interface InviteWithMetadata extends Invite {
  uses: number
  max_uses: number
  max_age: number
  temporary: boolean
  created_at: Timestamp
}
