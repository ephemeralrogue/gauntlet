import Discord, {Collection, DataResolver} from 'discord.js'
import {TypeError} from '../../../node_modules/discord.js/src/errors'
import * as Data from '../../data'
import defaults from '../../defaults'
import {GuildEmoji} from '../../structures/emoji'
import {mergeDefault, throwPermissionsError} from '../../util'
import manager from '../BaseManager'
import type {Base64Resolvable, BufferResolvable, EmojiResolvable, GuildEmojiCreateOptions, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type {Guild} from '../../structures'

export class GuildEmojiManager extends manager<
Discord.GuildEmojiManager, typeof GuildEmoji, EmojiResolvable
>(Discord.GuildEmojiManager) {
  readonly client!: Client
  cache!: Collection<Snowflake, GuildEmoji>
  holds!: typeof GuildEmoji
  guild!: Guild
  add!: (data?: Partial<Data.GuildEmoji>, cache?: boolean) => GuildEmoji
  resolve!: (resolvable: EmojiResolvable) => GuildEmoji | null
  private readonly isClient: boolean

  constructor(guild: Guild | {client: Client}, iterable?: Iterable<Data.GuildEmoji>) {
    super(guild.client, iterable, GuildEmoji)
    this.isClient = !('id' in guild)
  }

  /**
   * Creates a new custom emoji in the guild.
   *
   * @param attachment The image for the emoji.
   * @param name The name for the emoji.
   * @param options The options.
   * @returns The created emoji.
   * @example
   * // Create a new emoji from a url
   * guild.emojis.create('https://i.imgur.com/w3duR07.png', 'rip')
   *   .then(emoji => console.log(`Created new emoji with name ${emoji.name}!`))
   *   .catch(console.error)
   * @example
   * // Create a new emoji from a file on your computer
   * guild.emojis.create('./memes/banana.png', 'banana')
   *   .then(emoji => console.log(`Created new emoji with name ${emoji.name}!`))
   *   .catch(console.error)
   */
  async create(
    attachment: BufferResolvable | Base64Resolvable, name: string, {roles = [], reason}: GuildEmojiCreateOptions = {}
  ): Promise<GuildEmoji> {
    if (this.isClient) {
      throw new Error(
        'You can only call this from a GuildEmojiManager belonging to a Guild, not the one returned from Client#emojis.'
      )
    }

    throwPermissionsError(this.guild.me, 'MANAGE_EMOJIS', `/guilds/${this.guild.id}/emojis`, 'post')

    attachment = await DataResolver.resolveImage(attachment)
    if (!attachment) throw new TypeError('REQ_RESOURCE_TYPE')

    const _roles = []
    for (const r of roles instanceof Collection ? roles.values() : roles) {
      const role = this.guild.roles.resolve(r)
      if (!role) {
        return Promise.reject(
          new TypeError('INVALID_TYPE', 'options.roles', 'Array or Collection of Roles or Snowflakes', true)
        )
      }
      _roles.push(role.id)
    }

    const data = mergeDefault(defaults.guildEmoji, {
      name,
      roles: _roles,
      user: this.client.user.toData()
    })

    this.guild._addLog({
      action_type: Data.AuditLogEvent.EMOJI_CREATE,
      target_id: data.id,
      user_id: this.client.user.id,
      reason,
      changes: [{key: 'name', new_value: name}]
    })
    // TODO: attachment/image
    return this.client._actions.GuildEmojiCreate.handle(this.guild, data).emoji
  }
}
