import Discord, {Collection} from 'discord.js'
import {Error} from '../../node_modules/discord.js/src/errors'
import defaults from '../defaults'
import {User} from '../structures/User'
import {apiError, channelThrowPermissionsError, mergeDefault} from '../util'
import manager from './BaseManager'
import type {UserResolvable, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {MessageReaction} from '../structures'

export class ReactionUserManager extends manager<Discord.ReactionUserManager, typeof User, UserResolvable>(
  Discord.ReactionUserManager
) {
  readonly client!: Client
  cache!: Collection<Snowflake, User>
  holds!: typeof User
  declare add: (data?: Partial<Data.User>, cache?: boolean, {id, extras}?: {id: Snowflake, extras?: any[]}) => User
  resolve!: (resolvable: UserResolvable) => User | null

  constructor(client: Client, iterable: Iterable<Data.User>, public reaction: MessageReaction) {
    super(client, iterable, User)
  }

  private get path(): string {
    const {emoji, message} = this.reaction
    return `/channels/${message.channel.id}/messages/${message.id}/${emoji.identifier}`
  }

  /**
   * Fetches all the users that gave this reaction. Resolves with a collection of users, mapped by their IDs.
   *
   * @param options The options for fetching the users.
   * @param options.limit The maximum amount of users to fetch.
   * @param options.before Limit fetching users to those with an id lower than the supplied id.
   * @param options.after Limit fetching users to those with an id greater than the supplied id.
   */
  async fetch(
    {limit = 100, after, before}: {limit?: number, after?: Snowflake, before?: Snowflake} = {},
    data: Partial<Data.User>[] = []
  ): Promise<Collection<Snowflake, User>> {
    const {message} = this.reaction
    const query = new URLSearchParams(
      Object.entries({limit, before, after}).filter(([, value]) => value !== undefined) as [string, string][]
    ).toString()
    const path = this.path + (query && `?${query}`)
    const method = 'get'
    if (message.deleted) apiError('UNKNOWN_MESSAGE', path, method)
    if (message.channel.type !== 'dm' && !message.channel.permissionsFor(this.client.user)!.has('READ_MESSAGE_HISTORY'))
      apiError('MISSING_ACCESS', path, method)

    const users = this.cache
      .concat(new Collection(data.map(u => {
        const user = this.client.users.add(mergeDefault(defaults.user, u))
        this.cache.set(user.id, user)
        return [user.id, user]
      })))
      .array()
      .sort((a, b) => Number(b.id) - Number(a.id))
    const i = users.findIndex(u => u.id === (after ?? before))
    return new Collection<Snowflake, User>(
      (after === undefined
        ? before === undefined
          ? users.slice(0, limit)
          : users.slice(Math.max(0, i - limit), i)
        : users.slice(i + 1, i + limit + 1))
        .map(m => [m.id, m])
    )
  }

  /**
   * Removes a user from this reaction.
   *
   * @param user The user to remove the reaction of.
   */
  async remove(user: UserResolvable = this.reaction.message.client.user): Promise<MessageReaction> {
    const {emoji, message} = this.reaction
    const userID = message.client.users.resolveID(user)
    if (userID == null) return Promise.reject(new Error('REACTION_RESOLVE_USER'))

    channelThrowPermissionsError(
      message.channel,
      'MANAGE_MESSAGES',
      `${this.path}/${userID === message.client.user.id ? '@me' : userID}`,
      'delete',
      true
    )

    this.client.ws._handlePacket({
      t: 'MESSAGE_REACTION_REMOVE',
      d: {
        user_id: userID,
        channel_id: message.channel.id,
        message_id: message.id,
        guild_id: message.guild?.id,
        emoji: emoji.toData()
      }
    })

    return this.reaction
  }
}
