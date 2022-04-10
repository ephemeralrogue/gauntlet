import Discord from 'discord.js'
import * as Data from '../data'
import defaults from '../defaults'
import {apiError, mergeDefault, throwPermissionsError} from '../util'
import type {IntegrationEditData} from 'discord.js'
import type {Client} from '../client'
import type {Method} from '../util'
import type {Base, Guild, Role, User} from '.'

export class Integration extends Discord.Integration implements Base {
  client!: Client
  guild!: Guild
  role!: Role
  user!: User

  #deleted = false

  constructor(client: Client, guild: Guild, data: Data.Integration) {
    super(client, mergeDefault(defaults.integration, data), guild)
  }

  async sync(): Promise<this> {
    this.#checkForErrors('post')
    this.syncedAt = Date.now()
    return this
  }

  async edit({expireBehavior, expireGracePeriod}: IntegrationEditData, reason?: string): Promise<this> {
    this.#checkForErrors('patch')

    const changes: Data.IntegrationUpdateEntry['changes'] = []
    if (expireBehavior !== this.expireBehavior)
      changes.push({key: 'expire_behavior', old_value: this.expireBehavior, new_value: expireBehavior!})
    if (expireGracePeriod !== this.expireGracePeriod)
      changes.push({key: 'expire_grace_period', old_value: this.expireGracePeriod, new_value: expireGracePeriod!})
    if (changes.length) {
      this.guild._addLog({
        action_type: Data.AuditLogEvent.INTEGRATION_UPDATE,
        target_id: this.id,
        user_id: this.client.user.id,
        reason,
        changes
      })
      this.#emitPacket()
    }

    return this
  }

  async delete(reason?: string): Promise<this> {
    this.#checkForErrors('delete')
    this.#deleted = true

    this.guild._addLog({
      target_id: this.id,
      action_type: Data.AuditLogEvent.INTEGRATION_DELETE,
      user_id: this.client.user.id,
      reason,
      changes: [
        {key: 'name', old_value: this.name},
        {key: 'type', old_value: this.type},
        {key: 'expire_behavior', old_value: this.expireBehavior},
        {key: 'expire_grace_period', old_value: this.expireGracePeriod},
        {key: 'account_id', old_value: this.account.id}
      ]
    })
    this.#emitPacket()

    return this
  }

  #checkForErrors = (method: Method): void => {
    const path = `/guilds/${this.guild.id}/integrations/${this.id}`
    if (this.#deleted) apiError('UNKNOWN_INTEGRATION', path, method)
    throwPermissionsError(this.guild.me, 'MANAGE_GUILD', path, method)
  }

  #emitPacket = (): void => {
    if (this.client._hasIntent('GUILD_INTEGRATIONS'))
      this.client.ws._handlePacket({t: 'GUILD_INTEGRATIONS_UPDATE', d: {guild_id: this.guild.id}})
  }
}
