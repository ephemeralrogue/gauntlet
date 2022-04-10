import Discord, {Collection, Constants} from 'discord.js'
import {Error, TypeError} from '../../../node_modules/discord.js/src/errors'
import chunk from 'lodash.chunk'
import * as Data from '../../data'
import defaults from '../../defaults'
import {GuildMember} from '../../structures/GuildMember'
import {mergeDefault, throwPermissionsError} from '../../util'
import manager from '../BaseManager'
import type {
  BanOptions, GuildMemberResolvable, GuildPruneMembersOptions,
  FetchMemberOptions, FetchMembersOptions, UserResolvable, Snowflake
} from 'discord.js'
import type {Client} from '../../client'
import type {Guild, NewsChannel, TextChannel, User} from '../../structures'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {Events} = Constants

interface FetchMembersData {
  members?: Partial<Data.GuildMember>[]
  presences?: Partial<Data.Presence>[]
}

export class GuildMemberManager extends manager<
Discord.GuildMemberManager, typeof GuildMember, GuildMemberResolvable
>(Discord.GuildMemberManager) {
  readonly client!: Client
  cache!: Collection<Snowflake, GuildMember>
  holds!: typeof GuildMember
  add!: (data?: Partial<Data.GuildMember>, cache?: boolean) => GuildMember
  resolve!: (resolvable: GuildMemberResolvable) => GuildMember | null

  constructor(public guild: Guild, iterable?: Iterable<Data.GuildMember>) {
    super(guild.client, iterable, GuildMember)
  }

  /**
   * Prunes members from the guild based on how long they have been inactive.
   *
   * @param options The prune options.
   * @param reason The reason for this prune.
   * @example
   * // See how many members will be pruned
   * guild.members.prune({dry: true})
   *   .then(pruned => console.log(`This will prune ${pruned} people!`))
   *   .catch(console.error)
   */
  async prune(options: GuildPruneMembersOptions & {dry?: false, count: false}): Promise<null>

  /**
   * Prunes members from the guild based on how long they have been inactive.
   *
   * @param options The prune options.
   * @param reason The reason for this prune.
   * @returns The number of members that were/will be kicked.
   * @example
   * // Actually prune the members
   * guild.members.prune({days: 1, reason: 'too many people!'})
   *   .then(pruned => console.log(`I just pruned ${pruned} people!`))
   *   .catch(console.error)
   */
  async prune(options?: GuildPruneMembersOptions): Promise<number>

  async prune({days = 7, dry = false, count = true, reason}: GuildPruneMembersOptions = {}): Promise<null | number> {
    if (typeof days != 'number') throw new TypeError('PRUNE_DAYS_TYPE')

    const now = Date.now()
    let _count = 0
    throwPermissionsError(this.guild.me, 'KICK_MEMBERS', `/guilds/${this.guild.id}/prune`, dry ? 'get' : 'post')
    this.cache.forEach(member => {
      if (now - member.lastSeen.getTime() >= days * 864e5) {
        if (!dry) {
          this.client.ws._handlePacket({
            t: 'GUILD_MEMBER_REMOVE',
            d: {
              guild_id: this.guild.id,
              user: member.user.toData()
            }
          })
        }
        _count++
      }
    })

    this.guild._addLog({
      action_type: Data.AuditLogEvent.MEMBER_PRUNE,
      target_id: null,
      user_id: this.client.user.id,
      reason,
      options: {
        delete_member_days: days.toString(),
        members_removed: _count.toString()
      }
    })

    return count ? _count : null
  }

  /**
   * Bans a user from the guild.
   *
   * @param user The user to ban.
   * @param options The options for the ban.
   * @returns This will be resolved as specifically as possible. If the GuildMember cannot be resolved, the User will instead
   * be attempted to be resolved. If that also cannot be resolved, the user ID will be the result.
   * @example
   * // Ban a user by ID (or with a user/guild member object)
   * guild.members.ban('84484653687267328')
   *   .then(user => console.log(`Banned ${user.username ?? user.id ?? user} from ${guild.name}`))
   *   .catch(console.error)
   */
  async ban(user: UserResolvable, {days = 0, reason}: BanOptions = {}): Promise<GuildMember | User | Snowflake> {
    const id = this.client.users.resolveID(user)
    if (id === null) throw new Error('BAN_RESOLVE_ID', true)

    const now = Date.now()
    const _user = this.client.users.resolve(user)!
    this.client.ws._handlePacket({
      t: 'GUILD_BAN_ADD',
      d: {guild_id: this.guild.id, user: _user.toData()}
    })
    this.guild._addLog({
      action_type: Data.AuditLogEvent.MEMBER_BAN_ADD,
      target_id: _user.id,
      user_id: this.client.user.id,
      reason
    })
    ;(this.guild.channels.cache
      .filter(c => c.type === 'text' || c.type === 'news') as Collection<Snowflake, TextChannel | NewsChannel>)
      .flatMap(c => c.messages.cache)
      .filter(m => m.author.id === _user.id && now - m.createdTimestamp <= days * 864e5)
      .forEach(async m => m.delete())

    if (user instanceof GuildMember) return user
    return this.resolve(_user) ?? _user
  }

  /**
   * Unbans a user from the guild.
   *
   * @param user The user to unban.
   * @param reason The reason for unbanning the user.
   * @example
   * // Unban a user by ID (or with a user/guild member object)
   * guild.members.unban('84484653687267328')
   *   .then(user => console.log(`Unbanned ${user.username} from ${guild.name}`))
   *   .catch(console.error)
   */
  async unban(user: UserResolvable, reason?: string): Promise<User> {
    const id = this.client.users.resolveID(user)
    if (id === null) throw new Error('BAN_RESOLVE_ID')

    const _user = this.client.users.resolve(user)!
    this.client.ws._handlePacket({
      t: 'GUILD_BAN_REMOVE',
      d: {guild_id: this.guild.id, user: _user.toData()}
    })
    this.guild._addLog({
      action_type: Data.AuditLogEvent.MEMBER_BAN_REMOVE,
      target_id: _user.id,
      user_id: this.client.user.id,
      reason
    })
    return _user
  }

  /**
   * Fetches a member.
   *
   * @param options The user to fetch.
   * @param data The data of the member to fetch.
   * @example
   * // Fetch a single member
   * guild.members.fetch('66564597481480192')
   *   .then(console.log)
   *   .catch(console.error)
   * @example
   * // Fetch a single member without caching
   * guild.members.fetch({user, cache: false})
   *   .then(console.log)
   *   .catch(console.error)
   */
  async fetch(
    options: UserResolvable | FetchMemberOptions | FetchMembersOptions & {user: UserResolvable},
    data?: Partial<Data.GuildMember>
  ): Promise<GuildMember>

  /**
   * Fetches members.
   *
   * @param options Options for fetching the members. If `undefined`, it will fetch the first 100 members.
   * @param data The data of the members and presences to fetch.
   * @example
   * // Fetch by an array of users including their presences
   * guild.members.fetch({user: ['66564597481480192', '191615925336670208'], withPresences: true})
   *   .then(console.log)
   *   .catch(console.error)
   * @example
   * // Fetch by query
   * guild.members.fetch({query: 'hydra', limit: 1})
   *   .then(console.log)
   *   .catch(console.error)
   */
  async fetch(options?: FetchMembersOptions, data?: FetchMembersData): Promise<Collection<Snowflake, GuildMember>>

  async fetch(
    options?: UserResolvable | FetchMemberOptions | FetchMembersOptions,
    data?: Partial<Data.GuildMember> | FetchMembersData
  ): Promise<GuildMember | Collection<Snowflake, GuildMember>> {
    if (options === undefined) return this._fetchMany(undefined, data as FetchMembersData)

    const user = this.client.users.resolveID(options as UserResolvable)
    if (user !== null) return this._fetchSingle({user, cache: true}, data as Partial<Data.GuildMember>)

    if (typeof options !== 'string' && 'user' in options && options.user !== undefined) {
      if (Array.isArray(options.user)) {
        return this._fetchMany(
          {...options, user: options.user.map(u => this.client.users.resolveID(u)!)}, data as FetchMembersData
        )
      }
      options.user = this.client.users.resolveID(options.user)!
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- how it is in Discord.js
      if (!(options as FetchMembersOptions).limit && !(options as FetchMembersOptions).withPresences)
        return this._fetchSingle(options as FetchMemberOptions & {user: Snowflake}, data as Partial<Data.GuildMember>)
    }

    return this._fetchMany(options as FetchMembersOptions & {user?: Snowflake | Snowflake[]}, data as FetchMembersData)
  }

  private async _fetchSingle(
    {user, cache}: {user: Snowflake, cache?: boolean}, data?: Partial<Data.GuildMember>
  ): Promise<GuildMember> {
    const existing = this.cache.get(user)
    if (existing) return existing
    return this.add(mergeDefault(defaults.guildMember, {...data, user: mergeDefault(defaults.user, {id: user})}), cache)
  }

  private async _fetchMany(
    {
      limit = 0, withPresences: presences = false, user: userIds, query, time = 12e4
    }: FetchMembersOptions & {user?: Snowflake | Snowflake[]} = {},
    data: {members?: Partial<Data.GuildMember>[], presences?: Partial<Data.Presence>[]} = {}
  ): Promise<GuildMember | Collection<Snowflake, GuildMember>> {
    if (this.guild.memberCount === this.cache.size && query === undefined && !limit && !presences && userIds === undefined)
      return this.cache
    if (query === undefined && userIds === undefined) query = ''

    const fetchedMembers = new Collection<Snowflake, GuildMember>()
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- this is how it is in Discord.js
    const option = query || limit || presences || userIds
    return new Promise((resolve, reject) => {
      const handler = (members: Collection<Snowflake, GuildMember>, guild: Guild): void => {
        if (guild.id !== this.guild.id) return

        // eslint-disable-next-line no-use-before-define -- impossible without using timeout before defined
        timeout.refresh()
        members.forEach(member => {
          if (option !== undefined) fetchedMembers.set(member.id, member)
        })
        if (
          this.guild.memberCount <= this.cache.size ||
          option !== undefined && members.size < 1000 ||
          limit && fetchedMembers.size >= limit
        ) {
          this.client.removeListener(Events.GUILD_MEMBERS_CHUNK, handler)
          const fetched = option === undefined ? this.cache : fetchedMembers
          resolve(userIds !== undefined && !Array.isArray(userIds) && fetched.size ? fetched.first() : fetched)
        }
      }

      const timeout = this.guild.client.setTimeout(() => {
        this.client.removeListener(Events.GUILD_MEMBERS_CHUNK, handler)
        reject(new Error('GUILD_MEMBERS_TIMEOUT'))
      }, time)

      this.client.on(Events.GUILD_MEMBERS_CHUNK, handler)

      if (this.client._usingIntents && this.client._hasIntent('GUILD_MEMBERS') && query === '') return

      const members = typeof query == 'undefined'
        ? this.cache
          .filter(({id}) => typeof userIds == 'string' ? id === userIds : userIds!.includes(id))
          .array()
          .sort((a, b) => Number(a.id) - Number(b.id))
          .slice(0, this.client._usingIntents ? 100 : undefined)
        : this.cache
          .filter(({user}) => user.username.startsWith(query!))
          .array()
          .sort((a, b) => Number(a.id) - Number(b.id))
          .slice(0, this.client._usingIntents ? Math.min(limit || 100, 100) : limit || undefined)

      chunk(members, 1000).forEach(ms => this.client.ws._handlePacket({
        t: 'GUILD_MEMBERS_CHUNK',
        d: {
          guild_id: this.guild.id,
          members: ms.map(m => mergeDefault(m.toData(), data.members?.find(_m => _m.user?.id === m.id))),
          presences: this.client._hasIntent('GUILD_PRESENCES') && presences
            ? ms.map(m => mergeDefault(m.presence.toData(), data.presences?.find(p => p.user?.id === m.id)))
            : undefined
        }
      }))
    })
  }
}
