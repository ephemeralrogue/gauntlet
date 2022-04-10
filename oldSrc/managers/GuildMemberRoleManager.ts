import Discord, {Collection, RoleResolvable} from 'discord.js'
import * as Data from '../data'
import {TypeError} from '../../node_modules/discord.js/src/errors'
import {timestamp} from '../util'
import type {Snowflake} from 'discord.js'
import type {Client} from '../client'
import type {Guild, GuildMember, Role} from '../structures'
import type {Roles, RoleOrRoles} from './guild/types'

class _GuildMemberRoleManager extends Discord.GuildMemberRoleManager {
  readonly client!: Client
  readonly cache!: Collection<Snowflake, Role>
  readonly hoist!: Role | null
  readonly color!: Role | null
  readonly highest!: Role
  guild!: Guild
  member!: GuildMember
  set!: (roles: Roles, reason?: string) => Promise<GuildMember>
  private readonly _roles!: Collection<Snowflake, Role>

  /**
   * Adds a role (or multiple roles) to the member.
   *
   * @param roleOrRoles The role or roles to add.
   * @param reason The reason for adding the role(s).
   */
  async add(roleOrRoles: RoleOrRoles, reason?: string): Promise<GuildMember> {
    if (roleOrRoles instanceof Collection || Array.isArray(roleOrRoles)) {
      roleOrRoles = this.resolveRoles(roleOrRoles)
      const newRoles = [...new Set([...roleOrRoles, ...this._roles.values()])]
      return this.set(newRoles, reason)
    }

    const resolved = this.resolveRole(roleOrRoles)
    const newRoles = [...this._roles.keys(), resolved.id]
    this.setRoles(newRoles, '$add', resolved, reason)

    const clone = this.member._clone()
    clone._roles = newRoles
    return clone
  }

  /**
   * Removes a role (or multiple roles) from the member.
   *
   * @param roleOrRoles The role or roles to remove.
   * @param reason The reason for removing the role(s).
   */
  async remove(roleOrRoles: RoleOrRoles, reason?: string): Promise<GuildMember> {
    if (roleOrRoles instanceof Collection || Array.isArray(roleOrRoles)) {
      roleOrRoles = this.resolveRoles(roleOrRoles)
      const newRoles = this._roles.filter(role => !(roleOrRoles as RoleResolvable[]).includes(role))
      return this.set(newRoles, reason)
    }

    const resolved = this.resolveRole(roleOrRoles)
    const newRoles = [...this._roles.filter(role => role.id !== resolved.id).keys()]
    this.setRoles(newRoles, '$remove', resolved, reason)

    const clone = this.member._clone()
    clone._roles = newRoles
    return clone
  }

  private resolveRoles(roles: Roles): Role[] {
    return (roles.map as <T>(callbackfn: (value: RoleResolvable) => T) => T[])(r => {
      const resolved = this.guild.roles.resolve(r)
      if (!resolved) throw new TypeError('INVALID_TYPE', 'roles', 'Array or Collection of Roles or Snowflakes', true)
      return resolved
    })
  }

  private resolveRole(role: RoleResolvable): Role {
    const resolved = this.guild.roles.resolve(role)
    if (resolved === null)
      throw new TypeError('INVALID_TYPE', 'roles', 'Role, Snowflake or Array or Collection of Roles or Snowflakes')
    return resolved
  }

  private setRoles(roles: Snowflake[], key: '$add' | '$remove', role: Role, reason?: string): void {
    if (this.member.id === this.guild.me?.id || this.client._hasIntent('GUILD_MEMBERS')) {
      this.client.ws._handlePacket({
        t: 'GUILD_MEMBER_UPDATE',
        d: {
          guild_id: this.guild.id,
          roles,
          user: this.member.user.toData(),
          nick: this.member.nickname,
          premium_since: this.member.premiumSinceTimestamp == null ? undefined : timestamp(this.member.premiumSinceTimestamp)
        }
      })
    }
    this.guild._addLog({
      action_type: Data.AuditLogEvent.MEMBER_ROLE_UPDATE,
      target_id: this.member.id,
      user_id: this.client.user.id,
      reason,
      changes: [{key, new_value: [{name: role.name, id: role.id}]}]
    })
  }
}
// eslint-disable-next-line @typescript-eslint/naming-convention -- GuildMemberRoleManager is a class
export const GuildMemberRoleManager: new (member: GuildMember) => _GuildMemberRoleManager = _GuildMemberRoleManager
export type GuildMemberRoleManager = _GuildMemberRoleManager
