import Discord, {Constants} from 'discord.js'
import * as Data from '../../data'
import defaults from '../../defaults'
import {GuildChannelBase} from '../../structures/channel'
import {PermissionOverwrites} from '../../structures/PermissionOverwrites'
import {mergeDefault, sanitiseChannelName, throwPermissionsError} from '../../util'
import manager from '../BaseManager'
import type {Collection, GuildCreateChannelOptions, GuildChannelResolvable, OverwriteResolvable, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type {
  CategoryChannel, Guild, GuildChannel, TextChannel, VoiceChannel
} from '../../structures'
import type {ArrayType} from '../../util'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {ChannelTypes} = Constants

export class GuildChannelManager extends manager<
Discord.GuildChannelManager, typeof GuildChannelBase, GuildChannelResolvable
>(Discord.GuildChannelManager) {
  readonly client!: Client
  cache!: Collection<Snowflake, GuildChannel>
  holds!: typeof GuildChannelBase
  add!: (channel: GuildChannel) => GuildChannel
  resolve!: (resolvable: GuildChannelResolvable) => GuildChannel | null

  constructor(public guild: Guild, iterable?: Iterable<Data.GuildMember>) {
    super(guild.client, iterable, GuildChannelBase)
  }

  /**
   * Creates a new channel in the guild.
   *
   * @param name The name of the new channel.
   * @param options The options.
   * @example
   * // Create a new text channel
   * guild.channels.create('new-general', {reason: 'Needed a cool new channel'})
   *   .then(console.log)
   *   .catch(console.error)
   * @example
   * // Create a new channel with permission overwrites
   * guild.channels.create('new-voice', {
   *   type: 'voice',
   *   permissionOverwrites: [
   *      {
   *        id: message.author.id,
   *        deny: ['VIEW_CHANNEL']
   *     }
   *   ]
   * })
   */
  async create(name: string, options: GuildCreateChannelOptions & {type: 'voice'}): Promise<VoiceChannel>
  async create(name: string, options: GuildCreateChannelOptions & {type: 'category'}): Promise<CategoryChannel>
  async create(name: string, options?: GuildCreateChannelOptions & {type?: 'text'}): Promise<TextChannel>
  async create(
    name: string,
    {
      type, topic, nsfw, bitrate, userLimit, parent, permissionOverwrites, position, rateLimitPerUser, reason
    }: GuildCreateChannelOptions = {}
  ): Promise<TextChannel | VoiceChannel | CategoryChannel> {
    throwPermissionsError(this.guild.me, 'MANAGE_CHANNELS', `/guilds/${this.guild.id}/channels`, 'post')

    type = typeof type == 'string'
      ? ChannelTypes[type.toUpperCase() as keyof typeof ChannelTypes]
      : ChannelTypes.TEXT
    if (parent !== undefined) parent = this.client.channels.resolveID(parent)!
    if (permissionOverwrites) {
      permissionOverwrites = (permissionOverwrites.map as (<T>(callbackfn: (value: OverwriteResolvable) => T) => T[]))(
        o => PermissionOverwrites.resolve(o, this.guild)
      )
    }

    const data = mergeDefault(defaults[
      /* eslint-disable operator-linebreak -- ternary looks clearer here */
      type === ChannelTypes.VOICE ? 'voiceChannel' :
      type === ChannelTypes.CATEGORY ? 'categoryChannel' :
      /* eslint-enable operator-linebreak -- see above */
      'textChannel'
    ], {
      type,
      position,
      permission_overwrites: permissionOverwrites,
      name: sanitiseChannelName(name, type),
      parent_id: parent,
      topic,
      nsfw,
      rate_limit_per_user: rateLimitPerUser,
      bitrate,
      user_limit: userLimit,
      guild_id: this.guild.id
    }) as unknown as Data.GuildChannel

    const changes: Data.ChannelCreateEntry['changes'] = [
      {key: 'name', new_value: data.name},
      {key: 'type', new_value: data.type},
      {key: 'position', new_value: data.position},
      {key: 'permission_overwrites', new_value: data.permission_overwrites ?? []}
    ]
    ;(['topic', 'bitrate', 'nsfw', 'rate_limit_per_user'] as const).forEach(k => {
      if ((data as {[K in typeof k]?: string | null | number})[k] != null) {
        changes.push({
          key: k, new_value: (data as unknown as {[K in typeof k]: string | number})[k]
        } as ArrayType<Data.ChannelCreateEntry['changes']>)
      }
    })
    this.guild._addLog({
      action_type: Data.AuditLogEvent.CHANNEL_CREATE,
      target_id: data.id,
      user_id: this.client.user.id,
      reason,
      changes
    })
    return this.client._actions.ChannelCreate.handle(data).channel as TextChannel | VoiceChannel | CategoryChannel
  }
}
