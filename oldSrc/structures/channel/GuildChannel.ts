import Discord, {Collection, Constants} from 'discord.js'
import {TypeError} from '../../../node_modules/discord.js/src/errors'
import * as Data from '../../data'
import defaults from '../../defaults'
import {Util, applyToClass, channelThrowPermissionsError, mergeDefault, sanitiseChannelName, timestamp} from '../../util'
import {Invite} from '../Invite'
import {PermissionOverwrites} from '../PermissionOverwrites'
import {Role} from '../Role'
import {ChannelBase} from './Channel'
import type {
  ChannelData, InviteOptions, OverwriteResolvable, PermissionOverwriteOption,
  RawOverwriteData, ResolvedOverwriteOptions, RoleResolvable, UserResolvable, Snowflake
} from 'discord.js'
import type {Client} from '../../client'
import type {Constructable} from '../../util'
import type {CategoryChannel, Guild, GuildMember, NewsChannel, StoreChannel, TextChannel, VoiceChannel} from '..'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {ChannelTypes} = Constants

type NSFWChannel = TextChannel | NewsChannel | StoreChannel

export type CreateInvite = (options?: InviteOptions) => Promise<Invite>

export type FetchInvites = (
  data?: (Partial<Data.InviteWithMetadata> | Invite)[] | Collection<string, Invite>
) => Promise<Collection<string, Invite>>

export class GuildChannelBase extends ChannelBase.applyToClass(Discord.GuildChannel) {
  // TODO: type these properties on children of GuildChannelBase
  client!: Client
  guild!: Guild
  readonly members!: Collection<Snowflake, GuildMember>
  readonly parent!: CategoryChannel | null
  permissionOverwrites!: Collection<Snowflake, PermissionOverwrites>
  _invites = new Collection<string, Invite>()

  private readonly _update!: (data: Data.GuildChannel) => this

  constructor(guild: Guild, data?: Partial<Data.GuildChannel>) {
    super(guild, mergeDefault(defaults.guildChannel, data))
  }

  static applyToClass<T extends Constructable>(
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Class is a class
    Class: T
  ): new (...args: ConstructorParameters<T>) => InstanceType<T> & GuildChannelBase {
    return applyToClass(GuildChannelBase)(Class)
  }

  /**
   * Overwrites the permissions for a user or role in this channel, replacing it if it exists.
   *
   * @param userOrRole The user or role to update.
   * @param options The options for the update.
   * @param reason The reason for creating/editing this overwrite.
   * @example
   * // Create or Replace permissions overwrites for a message author
   * message.channel.createOverwrite(message.author, {SEND_MESSAGES: false})
   *   .then(channel => console.log(channel.permissionOverwrites.get(message.author.id)))
   *   .catch(console.error)
   */
  async createOverwrite(
    userOrRole: RoleResolvable | UserResolvable,
    options: PermissionOverwriteOption,
    reason?: string
  ): Promise<this> {
    const _userOrRole = this.guild.roles.resolve(userOrRole as RoleResolvable) ??
      this.client.users.resolve(userOrRole as UserResolvable)
    if (!_userOrRole) return Promise.reject(new TypeError('INVALID_TYPE', 'parameter', 'User nor a Role', true))

    const type = _userOrRole instanceof Role ? 'role' : 'member'
    const {id} = _userOrRole
    const {allow, deny} = PermissionOverwrites.resolveOverwriteOptions(options as ResolvedOverwriteOptions)
    const overwrites = this.permissionOverwrites.map(o => o.toData())
    const existing = overwrites.find(o => o.id === id)
    if (existing) {
      existing.allow = allow.bitfield
      existing.deny = deny.bitfield
    } else overwrites.push({id, type, allow: allow.bitfield, deny: deny.bitfield})

    if (this.client._hasIntent('GUILDS')) {
      this.client.ws._handlePacket({
        t: 'CHANNEL_UPDATE',
        d: {
          ...this.toData() as Data.GuildChannel,
          permission_overwrites: overwrites
        }
      })
    }

    this.guild._addLog({
      action_type: existing ? Data.AuditLogEvent.CHANNEL_OVERWRITE_UPDATE : Data.AuditLogEvent.CHANNEL_OVERWRITE_CREATE,
      target_id: this.id,
      user_id: this.client.user.id,
      reason,
      changes: existing ? [
        {key: 'allow', old_value: existing.allow, new_value: allow.bitfield},
        {key: 'deny', old_value: existing.deny, new_value: deny.bitfield}
      ] : [
        {key: 'id', new_value: id},
        {key: 'type', new_value: type},
        {key: 'allow', new_value: allow.bitfield},
        {key: 'deny', new_value: deny.bitfield}
      ],
      options: {
        id,
        type,
        ...type === 'role' ? {role_name: (_userOrRole as Role).name} : {}
      }
    } as Partial<Data.ChannelOverwriteCreateEntry | Data.ChannelOverwriteUpdateEntry>)

    return this
  }

  /**
   * Edits the channel.
   *
   * @param data The new data for the channel.
   * @param reason The reason for editing this channel.
   * @example
   * // Edit a channel
   * channel.edit({name: 'new-channel'})
   *   .then(console.log)
   *   .catch(console.error)
   */
  async edit(
    {
      bitrate, name, nsfw, parentID, permissionOverwrites, position, rateLimitPerUser, topic, userLimit
    }: ChannelData,
    reason?: string
  ): Promise<this> {
    if (typeof position != 'undefined') await this._setPosition(position, false, reason, true)

    channelThrowPermissionsError(this, 'MANAGE_CHANNELS', `/channels/${this.id}`, 'patch')

    const overwrites = (permissionOverwrites?.map as <T>(fn: (value: OverwriteResolvable) => T) => T[])(
      o => PermissionOverwrites.resolve(o, this.guild)
    ) as RawOverwriteData[] | undefined
    const data = mergeDefault(
      this.toData(),
      {
        name: name && sanitiseChannelName(name, this.type),
        topic,
        nsfw,
        bitrate,
        user_limit: userLimit,
        parent_id: parentID,
        rate_limit_per_user: rateLimitPerUser,
        permission_overwrites: overwrites
      }
    ) as Data.GuildChannel

    const changes: Data.ChannelUpdateEntry['changes'] = []
    if (name) changes.push({key: 'name', old_value: this.name, new_value: name})
    if (overwrites) {
      changes.push({
        key: 'permission_overwrites',
        old_value: this.permissionOverwrites.map(o => PermissionOverwrites.resolve(o, this.guild)),
        new_value: overwrites
      })
    }
    const isText = (c: GuildChannelBase): c is TextChannel => c.type === 'text'
    if (isText(this)) {
      if (typeof topic != 'undefined')
        changes.push({key: 'topic', old_value: this.topic, new_value: topic})
      if (typeof nsfw != 'undefined') changes.push({key: 'nsfw', old_value: this.nsfw, new_value: nsfw})
      if (typeof rateLimitPerUser != 'undefined')
        changes.push({key: 'rate_limit_per_user', old_value: this.rateLimitPerUser, new_value: rateLimitPerUser})
    } else if (this.type === 'voice' && typeof bitrate != 'undefined')
      changes.push({key: 'bitrate', old_value: (this as unknown as VoiceChannel).bitrate, new_value: bitrate})
    if (changes.length) this.addLog(changes, reason)

    if (this.client._hasIntent('GUILDS')) {
      this.client.ws._handlePacket({
        t: 'CHANNEL_UPDATE',
        d: data
      })
    }

    return this._update(data)
  }

  /**
   * Sets a new position for the guild channel.
   *
   * @param position The new position for the guild channel.
   * @param options Options for setting position.
   * @param options.relative Whether to change the position relative to its current value.
   * @param options.reason Tje reason for changing the position.
   * @example
   * // Set a new channel position
   * channel.setPosition(2)
   *   .then(newChannel => console.log(`Channel's new position is ${newChannel.position}`))
   *   .catch(console.error)
   */
  async setPosition(position: number, {relative, reason}: {relative?: boolean, reason?: string} = {}): Promise<this> {
    await this._setPosition(position, relative, reason)
    return this
  }

  /**
   * Creates an invite to this guild channel.
   *
   * @param options Options for the invite.
   * @param options.temporary Whether members that joined via the invite should be automatically kicked after 24
   * hours if they have not yet received a role.
   * @param options.maxAge How long the invite should last (in seconds) Use 0 to make the invite never expire.
   * @param options.maxUses The maximum number of uses.
   * @param options.unique Whether to create a unique invite. If `false`, uses an existing one with similar settings.
   * @param options.reason The reason for creating this.
   * @example
   * // Create an invite to a channel
   * channel.createInvite()
   *   .then(invite => console.log(`Created an invite with a code of ${invite.code}`))
   *   .catch(console.error)
   */
  async createInvite(
    {temporary = false, maxAge = 86_400, maxUses = 0, unique = false}: InviteOptions = {}
  ): Promise<Invite> {
    channelThrowPermissionsError(this, 'CREATE_INSTANT_INVITE', `/channels/${this.id}/invites`, 'post')

    const first = this._invites.first()
    if (!unique && first) return first

    const baseData = {
      code: '',
      max_age: maxAge,
      max_uses: maxUses,
      temporary,
      created_at: timestamp(),
      uses: 0,
      inviter: this.client.user.toData()
    } as const

    if (this.client._hasIntent('GUILD_INVITES') &&
      (this.guild.me?.hasPermission('MANAGE_GUILD') || this.permissionsFor(this.client.user)?.has('MANAGE_CHANNELS')))
      this.client.ws._handlePacket({t: 'INVITE_CREATE', d: {...baseData, channel_id: this.id, guild_id: this.guild.id}})

    const invite = new Invite(this.client, {...baseData, channel: this.toData(), guild: this.guild.toData()})
    this._invites.set(invite.code, invite)
    return invite
  }

  /**
   * Fetches a collection of invites to this guild channel.
   *
   * @returns A collection mapping invites by their codes.
   * @param data The data of the invites from Discord.
   */
  async fetchInvites(
    data?: (Partial<Omit<Data.InviteWithMetadata, 'guild' | 'channel'>> | Invite)[] | Collection<string, Invite>
  ): Promise<Collection<string, Invite>> {
    if (data) {
      this._invites = Array.isArray(data)
        ? new Collection(data.map(i => {
          const invite = i instanceof Invite ? i : new Invite(this.client, i)
          return [invite.code, invite]
        }))
        : data
    }
    return this._invites
  }

  async delete(reason?: string): Promise<this> {
    if (this.client._hasIntent('GUILDS'))
      this.client.ws._handlePacket({t: 'CHANNEL_DELETE', d: this.toData() as Data.Channel})

    const changes: Data.ChannelDeleteEntry['changes'] = [
      {key: 'type', old_value: ChannelTypes[this.type.toUpperCase() as keyof typeof Constants.ChannelTypes]},
      {key: 'position', old_value: this.position},
      {
        key: 'permission_overwrites',
        old_value: this.permissionOverwrites.map(o => PermissionOverwrites.resolve(o, this.guild))
      }
    ]

    if ('nsfw' in this) {
      changes.push({key: 'nsfw', old_value: (this as NSFWChannel).nsfw})
      if ((this as NSFWChannel).type === 'text')
        changes.push({key: 'rate_limit_per_user', old_value: (this as TextChannel).rateLimitPerUser})
    } else if (this.type === 'voice') changes.push({key: 'bitrate', old_value: (this as unknown as VoiceChannel).bitrate})

    this.guild._addLog({
      action_type: Data.AuditLogEvent.CHANNEL_DELETE,
      target_id: this.id,
      user_id: this.client.user.id,
      reason,
      changes
    })

    return this
  }

  toData(): Data.GuildChannelBase {
    return {
      id: this.id,
      guild_id: this.guild.id,
      type: ChannelTypes[this.type.toUpperCase() as keyof typeof Constants.ChannelTypes],
      position: this.position,
      name: this.name,
      parent_id: this.parentID
    }
  }

  // This mocked so that the mocked PermissionOverwrites is used
  protected _patch(data: Data.GuildChannelBase): void {
    (ChannelBase.prototype as unknown as {_patch(this: ChannelBase, data: Data.ChannelBase): void})._patch.bind(this)(data)
    this.name = data.name
    this.rawPosition = data.position
    this.parentID = data.parent_id
    this.permissionOverwrites = new Collection()
    data.permission_overwrites?.forEach(overwrite =>
      this.permissionOverwrites.set(overwrite.id, new PermissionOverwrites(this as unknown as GuildChannel, overwrite))
    )
  }

  private addLog(changes: Data.ChannelUpdateEntry['changes'], reason?: string, target: string = this.id): void {
    this.guild._addLog({
      action_type: Data.AuditLogEvent.CHANNEL_UPDATE,
      target_id: target,
      user_id: this.client.user.id,
      reason,
      changes
    })
  }

  private async _setPosition(position: number, relative?: boolean, _reason?: string, skipThis = false): Promise<void> {
    channelThrowPermissionsError(this, 'MANAGE_CHANNELS', `/guilds/${this.guild.id}/channels`, 'patch')

    const channels = await Util.setPosition(
      // eslint-disable-next-line dot-notation -- _sortedChannels is private
      this, position, relative, this.guild['_sortedChannels'](this) as Collection<string, GuildChannelBase>
    )
    if (this.client._hasIntent('GUILDS')) {
      (skipThis ? channels.filter(({id}) => id !== this.id) : channels).forEach(c => {
        const old = this.client.channels.cache.get(c.id)! as GuildChannelBase
        this.client.ws._handlePacket({
          t: 'CHANNEL_UPDATE',
          d: {
            ...old.toData() as Data.GuildChannel,
            position: c.position
          }
        })
      })
    }
    this.client._actions.GuildChannelsPositionUpdate.handle({
      guild_id: this.guild.id,
      channels
    })
  }
}

export type GuildChannel = TextChannel | VoiceChannel | NewsChannel | StoreChannel | CategoryChannel
