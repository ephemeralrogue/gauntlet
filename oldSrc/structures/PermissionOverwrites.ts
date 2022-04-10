import Discord from 'discord.js'
import * as Data from '../data'
import defaults from '../defaults'
import {channelThrowPermissionsError, mergeDefault} from '../util'
import type {PermissionOverwriteOption, PermissionResolvable, ResolvedOverwriteOptions} from 'discord.js'
import type {Method} from '../util'
import type {GuildChannel} from '.'

export class PermissionOverwrites extends Discord.PermissionOverwrites {
  declare static resolveOverwriteOptions: (
    // options: PermissionOverwriteOption,
    // again another Discord.js typing error
    options: ResolvedOverwriteOptions,
    initialPermissions?: {allow?: PermissionResolvable, deny?: PermissionResolvable}
  ) => ResolvedOverwriteOptions

  readonly channel!: GuildChannel

  constructor(guildChannel: GuildChannel, data?: Data.PermissionOverwrite) {
    super(guildChannel, mergeDefault(defaults.permissionOverwrites, data))
  }

  async update(options: PermissionOverwriteOption, reason?: string): Promise<this> {
    const {allow, deny} = PermissionOverwrites.resolveOverwriteOptions(options as ResolvedOverwriteOptions, this)

    this.#permissionsError('put')
    this.#addLog(
      Data.AuditLogEvent.CHANNEL_OVERWRITE_UPDATE,
      [
        {key: 'allow', old_value: this.allow.bitfield, new_value: allow.bitfield},
        {key: 'deny', old_value: this.deny.bitfield, new_value: deny.bitfield}
      ],
      reason
    )
    if (this.channel.client._hasIntent('GUILDS')) {
      this.#handlePacket([
        ...this.channel.toData().permission_overwrites?.filter(({id}) => id !== this.id) ?? [],
        {...this.toData(), allow: allow.bitfield, deny: deny.bitfield}
      ])
    }

    return this
  }

  async delete(reason?: string): Promise<this> {
    this.#permissionsError('delete')
    this.#addLog(
      Data.AuditLogEvent.CHANNEL_OVERWRITE_DELETE,
      [
        {key: 'id', old_value: this.id},
        {key: 'type', old_value: this.type},
        {key: 'allow', old_value: this.allow.bitfield},
        {key: 'deny', old_value: this.deny.bitfield}
      ],
      reason
    )
    this.#handlePacket(this.channel.toData().permission_overwrites?.filter(({id}) => id !== this.id))

    return this
  }

  toData(): Data.PermissionOverwrite {
    return {
      id: this.id,
      type: this.type,
      allow: this.allow.bitfield,
      deny: this.deny.bitfield
    }
  }

  #permissionsError = (method: Method): void =>
    channelThrowPermissionsError(
      this.channel, 'MANAGE_ROLES', `/channels/${this.channel.id}/permissions/${this.id}`, method
    )

  #addLog = <T extends Data.AuditLogEvent.CHANNEL_OVERWRITE_UPDATE | Data.AuditLogEvent.CHANNEL_OVERWRITE_DELETE>(
    actionType: T,
    changes: (T extends Data.AuditLogEvent.CHANNEL_OVERWRITE_UPDATE
      ? Data.ChannelOverwriteUpdateEntry
      : Data.ChannelOverwriteDeleteEntry)['changes'],
    reason?: string
  ): void =>
    this.channel.guild._addLog({
      action_type: actionType,
      target_id: this.id,
      user_id: this.channel.client.user.id,
      reason,
      changes,
      options: {
        id: this.id,
        type: this.type,
        ...this.type === 'role' ? {role_name: this.channel.guild.roles.cache.get(this.id)?.name ?? 'role name'} : {}
      }
    } as Partial<Data.ChannelOverwriteUpdateEntry | Data.ChannelOverwriteDeleteEntry>)

  #handlePacket = (permissionOverwrites?: Data.PermissionOverwrite[]): void => {
    this.channel.client.ws._handlePacket({
      t: 'CHANNEL_UPDATE',
      d: {
        ...this.channel.toData(),
        permission_overwrites: permissionOverwrites
      } as Data.ChannelUpdate['d']
    })
  }
}
