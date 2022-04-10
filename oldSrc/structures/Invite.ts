import Discord from 'discord.js'
import * as Data from '../data'
import defaults from '../defaults'
import {apiError, mergeDefault, timestamp} from '../util'
import type {Client} from '../client'
import type {DeepPartial} from '../util'
import type {PartialGroupDMChannel} from './channel'
import type {Base, Guild, GuildChannel, User} from '.'

export class Invite extends Discord.Invite implements Base {
  client!: Client
  channel!: GuildChannel | PartialGroupDMChannel
  guild!: Guild | null
  inviter!: User | null
  targetUser!: User | null
  targetUserType!: Data.TargetUserType | null

  #deleted = false

  constructor(client: Client, data: DeepPartial<Data.InviteWithMetadata> = {}) {
    super(client, mergeDefault(defaults.invite, data))
  }

  async delete(reason?: string): Promise<this> {
    const path = `/invites/${this.code}`
    const method = 'delete'
    if (!this.guild || this.#deleted) apiError('UNKNOWN_INVITE', path, method)
    if (!(
      this.guild.me
        ? (this.channel as GuildChannel).permissionsFor(this.guild.me)?.has('MANAGE_CHANNELS') ||
          this.guild.me.permissions.has('MANAGE_GUILD')
        : true
    ))
      apiError('MISSING_PERMISSIONS', path, method)

    this.#deleted = true

    this.guild._addLog({
      target_id: null,
      action_type: Data.AuditLogEvent.INVITE_DELETE,
      user_id: this.client.user.id,
      reason,
      changes: [
        {key: 'code', old_value: this.code},
        {key: 'channel_id', old_value: this.channel.id},
        {key: 'max_uses', old_value: this.maxUses ?? 1},
        {key: 'uses', old_value: this.uses ?? 0},
        {key: 'max_age', old_value: this.maxAge ?? 1800},
        {key: 'temporary', old_value: this.temporary ?? false},
        ...this.inviter ? [{key: 'inviter_id', old_value: this.inviter.id} as const] : []
      ]
    })

    return this
  }

  toData(): Data.Invite & Partial<Data.InviteWithMetadata> {
    return {
      code: this.code,
      guild: this.guild?.toData(),
      channel: this.channel.toData(),
      inviter: this.inviter?.toData(),
      target_user: this.targetUser?.toData(),
      target_user_type: this.targetUserType ?? undefined,
      uses: this.uses ?? undefined,
      max_uses: this.maxUses ?? undefined,
      max_age: this.maxAge ?? undefined,
      temporary: this.temporary ?? undefined,
      created_at: this.createdAt ? timestamp(this.createdAt) : undefined
    }
  }
}
