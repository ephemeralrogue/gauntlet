import Discord from 'discord.js'
import {Error} from '../../node_modules/discord.js/src/errors'
import * as Data from '../data'
import defaults from '../defaults'
import {apiError, mergeDefault, timestamp, throwPermissionsError} from '../util'
import {TextBasedChannelBase} from './channel'
import {Role} from './Role'
import type {
  BanOptions, ChannelResolvable, PermissionString, PermissionResolvable, Permissions, RoleResolvable, Snowflake
} from 'discord.js'
import type {Client} from '../client'
import type {GuildMemberRoleManager} from '../managers'
import type {ErrorCode} from '../util'
import type {
  DMChannel, Guild, Presence, User, VoiceChannelResolvable, VoiceState
} from '.'
import type {BulkDelete, Send} from './channel/TextBasedChannel'

export interface GuildMemberEditData extends Discord.GuildMemberEditData {
  // TODO: fix this in Discord.js as it is currently ChannelResolvable
  // TODO: Fix Discord.js: nick can be nullable to unset nickname
  channel?: VoiceChannelResolvable | null
}

export class GuildMember extends TextBasedChannelBase.applyToClass(Discord.GuildMember) {
  client!: Client
  guild!: Guild
  readonly presence!: Presence
  readonly roles!: GuildMemberRoleManager
  user!: User
  readonly voice!: VoiceState
  bulkDelete!: BulkDelete
  send!: Send
  ban!: (options?: BanOptions) => Promise<GuildMember>
  fetch!: () => Promise<GuildMember>
  createDM!: () => Promise<DMChannel>
  deleteDM!: () => Promise<DMChannel>
  permissionsIn!: (channel: ChannelResolvable) => Readonly<Permissions>
  setNickname!: (nickname: string, reason?: string) => Promise<this>

  _clone!: () => this
  _patch!: (data: Partial<Data.GuildMember>) => void
  _roles!: Snowflake[]

  lastSeen = new Date()

  constructor(client: Client, data: Partial<Data.GuildMember> | undefined, guild: Guild) {
    super(client, mergeDefault(defaults.guildMember, data), guild)
  }

  // eslint-disable-next-line complexity, max-lines-per-function -- don't know how to shorten this
  async edit(data: GuildMemberEditData, reason?: string): Promise<this> {
    const {channel, deaf, mute, nick, roles} = data

    const resolvedData: {
      nick?: string
      roles?: Snowflake[]
      mute?: boolean
      deaf?: boolean
      channel_id?: Snowflake | null
    } = {nick, mute, deaf}
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- what it is in Discord.js
    if (channel) {
      const _channel = this.guild.channels.resolve(channel)
      if (!_channel || _channel.type !== 'voice') throw new Error('GUILD_VOICE_CHANNEL_RESOLVE')
      resolvedData.channel_id = _channel.id
    } else if (channel === null) resolvedData.channel_id = null
    if (roles) {
      resolvedData.roles = (roles.map as <T>(f: (x: RoleResolvable) => T) => T[])(
        role => role instanceof Discord.Role ? role.id : role
      )
    }

    const changedNick = resolvedData.nick !== undefined
    const changedMute = resolvedData.mute !== undefined
    const changedDeaf = resolvedData.deaf !== undefined
    const changedRoles = !!resolvedData.roles
    const changedChannel = resolvedData.channel_id !== undefined

    const checkForErrors = (): void => {
      const keys = Object.keys(data)
      const path = `/guilds/${this.guild.id}/members/`
      if (this.user.id === this.client.user.id && keys.length === 1 && keys[0] === 'nick')
        throwPermissionsError(this.guild.me, 'CHANGE_NICKNAME', `${path}@me/nick`, 'patch')
      else {
        const _apiError = (error: ErrorCode): never => apiError(error, path + this.id, 'patch')
        const permissions: PermissionString[] = []
        const checks: boolean[] = []
        const clientHigher = (role: Role): boolean =>
          this.guild.me ? this.guild.me.roles.highest.comparePositionTo(role) > 0 : true

        if (changedNick) {
          permissions.push('MANAGE_NICKNAMES')
          // The client must be higher than this member
          checks.push(clientHigher(this.roles.highest))
        }

        if (changedRoles) {
          permissions.push('MANAGE_ROLES')
          // All the managed roles must be present
          checks.push(this.roles.cache.filter(r => r.managed).every(r => resolvedData.roles!.includes(r.id)))
          // Can't add or remove roles higher than the client
          checks.push(resolvedData.roles!.every(r => {
            const role = this.guild.roles.cache.get(r)
            return role ? clientHigher(role) : true
          }))
        }

        if (changedMute) permissions.push('MUTE_MEMBERS')
        if (changedDeaf) permissions.push('DEAFEN_MEMBERS')

        let canViewChannel = true
        let noVoice = false
        if (changedChannel) {
          permissions.push('MOVE_MEMBERS')
          if (resolvedData.channel_id) {
            const _channel = this.guild.channels.cache.get(resolvedData.channel_id)
            const hasPermissions = (_permissions: PermissionResolvable): boolean =>
              _channel && this.guild.me ? this.guild.me.permissionsIn(_channel).has(_permissions) : true
            checks.push(hasPermissions('CONNECT'))
            // Client needs to be able to connect to the other channel
            canViewChannel = hasPermissions('VIEW_CHANNEL')
            if (!this.voice.channel) noVoice = true
          }
        }

        // Can't move a member if they aren't connected to voice
        if (!noVoice) _apiError('NO_VOICE')
        // Check permissions
        if (!this.guild.me?.hasPermission(permissions) || checks.some(c => !c)) _apiError('MISSING_PERMISSIONS')
        // Client needs to be able to view the channel
        if (!canViewChannel) _apiError('UNKNOWN_CHANNEL')
      }
    }

    checkForErrors()

    if (changedNick || changedMute || changedDeaf || changedRoles) {
      if (this.client._hasIntent('GUILD_MEMBERS')) {
        this.client.ws._handlePacket({
          t: 'GUILD_MEMBER_UPDATE',
          d: {
            guild_id: this.guild.id,
            roles: resolvedData.roles ?? this._roles,
            user: this.user.toData(),
            nick: nick === undefined ? this.nickname : nick,
            premium_since: this.premiumSinceTimestamp === null ? undefined : timestamp(this.premiumSinceTimestamp)
          }
        })
      }
      if (changedRoles) {
        const addedRoles = resolvedData.roles!.filter(r => !this._roles.includes(r))
        const removedRoles = this._roles.filter(r => !resolvedData.roles!.includes(r))
        const changes: Data.MemberRoleUpdateEntry['changes'] = []
        const toPartialRole = (id: Snowflake): Data.PartialRole => ({id, name: this.guild.roles.cache.get(id)?.name ?? 'role name'})

        if (addedRoles.length) changes.push({key: '$add', new_value: addedRoles.map(toPartialRole)})
        if (removedRoles.length) changes.push({key: '$remove', new_value: removedRoles.map(toPartialRole)})
        if (changes.length) {
          this.guild._addLog({
            action_type: Data.AuditLogEvent.MEMBER_ROLE_UPDATE,
            target_id: this.id,
            user_id: this.client.user.id,
            reason,
            changes
          })
        }
      }
      if (changedNick || changedMute || changedDeaf) {
        const changes: Data.MemberUpdateEntry['changes'] = []
        if (resolvedData.nick !== this.nickname) {
          changes.push({
            key: 'nick', old_value: this.nickname ?? undefined, new_value: resolvedData.nick
          } as Data.AnyChange<'nick', string>)
        }
        if (resolvedData.mute !== this.voice.serverMute)
          changes.push({key: 'mute', old_value: this.voice.serverMute!, new_value: resolvedData.mute!})
        if (resolvedData.deaf !== this.voice.serverDeaf)
          changes.push({key: 'deaf', old_value: this.voice.serverDeaf!, new_value: resolvedData.deaf!})
        if (changes.length) {
          this.guild._addLog({
            action_type: Data.AuditLogEvent.MEMBER_UPDATE,
            target_id: this.id,
            user_id: this.client.user.id,
            reason,
            changes
          })
        }
      }
    }

    if (changedChannel && this.client._hasIntent('GUILD_VOICE_STATES')) {
      this.client.ws._handlePacket({
        t: 'VOICE_STATE_UPDATE',
        d: {...this.voice.toData(), channel_id: resolvedData.channel_id as Snowflake | null}
      })
    }

    const clone = this._clone()
    clone._patch({...resolvedData, user: this.user})
    return clone
  }

  async kick(reason?: string): Promise<this> {
    throwPermissionsError(this.guild.me, 'KICK_MEMBERS', `/guilds/${this.guild.id}/members/${this.id}`, 'delete')
    this.guild._addLog({
      action_type: Data.AuditLogEvent.MEMBER_KICK,
      target_id: this.id,
      user_id: this.client.user.id,
      reason
    })
    if (this.client._hasIntent('GUILD_MEMBERS')) {
      this.client.ws._handlePacket({
        t: 'GUILD_MEMBER_REMOVE',
        d: {
          guild_id: this.guild.id,
          user: this.user.toData()
        }
      })
    }
    return this
  }

  toData(): Data.GuildMember {
    return {
      user: this.user.toData(),
      nick: this.nickname ?? undefined,
      roles: this.roles.cache.keyArray(),
      joined_at: timestamp(this.joinedTimestamp!),
      premium_since: this.premiumSinceTimestamp === null ? undefined : timestamp(this.premiumSinceTimestamp),
      deaf: !!this.voice.deaf,
      mute: !!this.voice.mute
    }
  }
}
