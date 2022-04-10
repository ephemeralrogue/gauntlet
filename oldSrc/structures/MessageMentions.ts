import Discord from 'discord.js'
import type {Collection, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Guild, GuildChannel, GuildMember, Message, Role, TextChannel, User} from '.'

declare class MessageMentions extends Discord.MessageMentions {
  readonly client: Client
  readonly guild: Guild
  roles: Collection<Snowflake, Role>
  users: Collection<Snowflake, User>
  constructor(
    message: Message,
    users: Data.User[] | Collection<Snowflake, User>,
    roles: Snowflake[] | Collection<Snowflake, Role>,
    everyone: boolean,
    crosspostedChannels?: Data.ChannelMention[]
  )

  get channels(): Collection<Snowflake, TextChannel>
  get members(): Collection<Snowflake, GuildMember> | null
  has(
    data: User | GuildMember | Role | GuildChannel,
    options?: {
      ignoreDirect?: boolean
      ignoreRoles?: boolean
      ignoreEveryone?: boolean
    }
  ): boolean
}
// eslint-disable-next-line @typescript-eslint/naming-convention -- _MessageMentions is a class
const _MessageMentions = Discord.MessageMentions as unknown as typeof MessageMentions
type _MessageMentions = MessageMentions
export {_MessageMentions as MessageMentions}
