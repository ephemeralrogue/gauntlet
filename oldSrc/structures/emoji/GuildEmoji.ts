import Discord from 'discord.js'
import {Error} from '../../../node_modules/discord.js/src/errors'
import * as Data from '../../data'
import defaults from '../../defaults'
import {apiError, mergeDefault, throwPermissionsError} from '../../util'
import {BaseGuildEmoji} from './BaseGuildEmoji'
import type {GuildEmojiEditData, RoleResolvable, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type {GuildEmojiRoleManager} from '../../managers'
import type {Method} from '../../util'
import type {Guild, Role, User} from '..'

export class GuildEmoji extends BaseGuildEmoji.applyToClass(Discord.GuildEmoji) {
  client!: Client
  guild!: Guild
  readonly roles!: GuildEmojiRoleManager
  setName!: (name: string, reason?: string) => Promise<this>

  #deleted = false

  private readonly author: User
  private readonly _clone!: () => this
  private readonly _patch!: (data: Data.GuildEmoji) => void

  // Can't have super as the first call because I need to use mergedData
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- see above
  // @ts-ignore
  constructor(client: Client, guild: Guild, data?: Partial<Data.GuildEmoji>) {
    const mergedData = mergeDefault(defaults.guildEmoji, data)
    super(client, mergedData, guild)
    this.author = this.client.users.add(mergedData.user)
  }

  #handlePacket = (emojis: Data.GuildEmoji[]): void => {
    if (this.client._hasIntent('GUILD_EMOJIS')) {
      this.client.ws._handlePacket({
        t: 'GUILD_EMOJIS_UPDATE',
        d: {
          guild_id: this.guild.id,
          emojis
        }
      })
    }
  }

  #checkIfDeleted = (method: Method): void => {
    if (this.#deleted) apiError('UNKNOWN_EMOJI', `/guilds/${this.guild.id}/emojis/${this.id}`, method)
  }

  /**
   * Fetches the author for this emoji.
   *
   * @param data Optional data for the author.
   */
  async fetchAuthor(data?: Partial<Data.User>): Promise<User> {
    if (this.managed) return Promise.reject(new Error('EMOJI_MANAGED'))
    if (!this.guild.me) return Promise.reject(new Error('GUILD_UNCACHED_ME'))
    if (!this.guild.me.permissions.has('MANAGE_EMOJIS'))
      return Promise.reject(new Error('MISSING_MANAGE_EMOJIS_PERMISSION', this.guild))

    this.#checkIfDeleted('get')
    return this.client.users.add(mergeDefault(this.author.toData(), data))
  }

  /**
   * Edits the emoji.
   *
   * @param data The new data for the emoji.
   * @param reason The reason for editing this emoji.
   * @example
   * // Edit an emoji
   * emoji.edit({name: 'newemoji'})
   *   .then(e => console.log(`Edited emoji ${e}`))
   */
  async edit(data: GuildEmojiEditData, reason?: string): Promise<this> {
    this.#checkIfDeleted('patch')
    this.#throwPermissionsError('patch')
    const roles = (data.roles?.map as ((fn: (value: Role | RoleResolvable) => Snowflake) => Snowflake[]) | undefined)?.(
      r => ((r as Role).id as Snowflake | undefined) ?? r as Snowflake
    )
    const currentRoles = this.roles.cache.keyArray()

    const clone = this._clone()
    clone._patch({
      ...this.toData(),
      name: data.name ?? this.name,
      roles: roles ?? currentRoles
    })

    const nameChanged = data.name !== undefined && data.name !== this.name
    if (roles?.some(r => !currentRoles.includes(r)) || currentRoles.some(r => !roles?.includes(r)) || nameChanged) {
      this.#handlePacket([...this.guild.emojis.cache.filter(e => e.id !== this.id).map(e => e.toData()), this.toData()])
      if (nameChanged) {
        this.guild._addLog({
          action_type: Data.AuditLogEvent.EMOJI_UPDATE,
          target_id: this.id,
          user_id: this.client.user.id,
          reason,
          changes: [{key: 'name', old_value: this.name, new_value: data.name!}]
        })
      }
    }

    return clone
  }

  /**
   * Deletes the emoji.
   *
   * @param reason The reason for deleting the emoji.
   */
  async delete(reason?: string): Promise<this> {
    this.#checkIfDeleted('delete')
    this.#throwPermissionsError('delete')
    this.#deleted = true
    this.#handlePacket(this.guild.emojis.cache.filter(e => e.id !== this.id).map(e => e.toData()))
    this.guild._addLog({
      action_type: Data.AuditLogEvent.EMOJI_DELETE,
      target_id: this.id,
      user_id: this.client.user.id,
      reason,
      changes: [{key: 'name', old_value: this.name}]
    })
    return this
  }

  toData(): Data.GuildEmoji {
    return {
      ...super.toData(),
      roles: this.roles.cache.keyArray(),
      user: this.author.toData(),
      require_colons: this.requiresColons
    }
  }

  #throwPermissionsError = (method: Method): void =>
    throwPermissionsError(this.guild.me, 'MANAGE_EMOJIS', `/guilds/${this.guild.id}/emojis/${this.id}`, method)
}
