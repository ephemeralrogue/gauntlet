import Discord, {Permissions} from 'discord.js'
import * as Data from '../data'
import {Util, apiError} from '../util'
import type {ChannelResolvable, Collection, ColorResolvable, PermissionResolvable, RoleData, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type {Method} from '../util'
import type {Base, Guild, GuildMember} from '.'

export class Role extends Discord.Role implements Base {
  declare static comparePositions: (role1: Role, role2: Role) => number
  client!: Client
  guild!: Guild
  readonly members!: Collection<Snowflake, GuildMember>
  equals!: (role: Role) => boolean
  permissionsIn!: (channel: ChannelResolvable) => Readonly<Permissions>
  setColor!: (color: ColorResolvable, reason?: string) => Promise<this>
  setHoist!: (hoist: boolean, reason?: string) => Promise<this>
  setMentionable!: (mentionable: boolean, reason?: string) => Promise<this>
  setName!: (name: string, reason?: string) => Promise<this>
  setPermissions!: (permissions: PermissionResolvable, reason?: string) => Promise<this>

  private readonly _clone!: () => this
  private readonly _patch!: (data: Data.Role) => void

  async edit(data: RoleData, reason?: string): Promise<this> {
    data.permissions = typeof data.permissions == 'undefined'
      ? this.permissions.bitfield
      : Permissions.resolve(data.permissions)
    if (typeof data.position != 'undefined') {
      this.client._actions.GuildRolesPositionUpdate.handle({
        guild_id: this.guild.id,
        roles: await Util.setPosition<Discord.Role>(
          this,
          data.position,
          false,
          // TODO: Fix types in Discord.js (_sortedRoles is a method)
          // eslint-disable-next-line dot-notation -- _sortedRoles is private
          (this.guild['_sortedRoles'] as unknown as () => Collection<Snowflake, Discord.Role>)()
        )
      })
    }

    this.#checkPermissions('patch')

    const role = {
      ...this.toData(),
      name: data.name ?? this.name,
      color: data.color === undefined ? this.color : Util.resolveColor(data.color),
      hoist: data.hoist ?? this.hoist,
      permissions: data.permissions,
      mentionable: data.mentionable ?? this.mentionable
    }

    this.guild._addLog({
      action_type: Data.AuditLogEvent.ROLE_UPDATE,
      target_id: this.id,
      user_id: this.client.user.id,
      reason,
      changes: [
        ...role.name === this.name ? [] : [{key: 'name', old_value: this.name, new_value: role.name} as const],
        ...role.color === this.color ? [] : [{key: 'color', old_value: this.color, new_value: role.color} as const],
        ...role.hoist === this.hoist ? [] : [{key: 'hoist', old_value: this.hoist, new_value: role.hoist} as const],
        ...role.permissions === this.permissions.bitfield
          ? []
          : [{key: 'permissions', old_value: this.permissions.bitfield, new_value: role.permissions} as const],
        ...role.mentionable === this.mentionable
          ? []
          : [{key: 'mentionable', old_value: this.mentionable, new_value: role.mentionable} as const]
      ]
    })
    if (this.client._hasIntent('GUILDS'))
      this.client.ws._handlePacket({t: 'GUILD_ROLE_UPDATE', d: {guild_id: this.guild.id, role}})

    const clone = this._clone()
    clone._patch(role)
    return clone
  }

  async setPosition(position: number, {relative}: {relative?: boolean, reason?: string} = {}): Promise<this> {
    const updatedRoles = await Util.setPosition<Discord.Role>(
      // eslint-disable-next-line dot-notation -- _sortedRoles is private
      this, position, relative, (this.guild['_sortedRoles'] as () => Collection<Snowflake, Discord.Role>)()
    )

    this.#checkPermissions('patch', `/guilds/${this.id}/roles`)
    if (position !== this.position && this.client._hasIntent('GUILDS')) {
      this.client.ws._handlePacket({
        t: 'GUILD_ROLE_UPDATE',
        d: {guild_id: this.guild.id, role: {...this.toData(), position}}
      })
    }

    this.client._actions.GuildRolesPositionUpdate.handle({guild_id: this.guild.id, roles: updatedRoles})
    return this
  }

  async delete(reason?: string): Promise<this> {
    this.#checkPermissions('delete')
    this.guild._addLog({
      action_type: Data.AuditLogEvent.ROLE_DELETE,
      target_id: this.id,
      user_id: this.client.user.id,
      reason,
      changes: [
        {key: 'name', old_value: this.name},
        {key: 'color', old_value: this.color},
        {key: 'hoist', old_value: this.hoist},
        {key: 'permissions', old_value: this.permissions.bitfield},
        {key: 'mentionable', old_value: this.mentionable}
      ]
    })
    const d = {guild_id: this.guild.id, role_id: this.id}
    if (this.client._hasIntent('GUILDS')) this.client.ws._handlePacket({t: 'GUILD_ROLE_DELETE', d})

    this.client._actions.GuildRoleDelete.handle(d)
    return this
  }

  toData(): Data.Role {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      hoist: this.hoist,
      position: this.position,
      permissions: this.permissions.bitfield,
      managed: this.managed,
      mentionable: this.mentionable
    }
  }

  #checkPermissions = (method: Method, path = `/guilds/${this.guild.id}/roles/${this.id}`): void => {
    if (!this.guild.me?.permissions.has('MANAGE_ROLES') || this.guild.me.roles.highest.comparePositionTo(this) < 0)
      apiError('MISSING_PERMISSIONS', path, method)
  }
}
