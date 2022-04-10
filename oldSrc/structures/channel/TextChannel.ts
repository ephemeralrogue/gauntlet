import Discord, {DataResolver, Collection} from 'discord.js'
import * as Data from '../../data'
import defaults from '../../defaults'
import {MessageManager} from '../../managers/MessageManager'
import {applyToClass, mergeDefault} from '../../util'
import {Webhook} from '../Webhook'
import {GuildChannelBase} from './GuildChannel'
import {TextBasedChannelBase} from './TextBasedChannel'
import type {Base64Resolvable, BufferResolvable, Snowflake} from 'discord.js'
import type {Client} from '../../client'
import type {Constructable} from '../../util'
import type {Guild} from '../Guild'
import type {CreateInvite, FetchInvites} from './GuildChannel'
import type {BulkDelete, Send} from './TextBasedChannel'

export class TextChannel extends TextBasedChannelBase.applyToClass(
  GuildChannelBase.applyToClass(Discord.TextChannel)
) {
  static applyToClass: <T extends Constructable>(Class: T) =>
  new (...args: ConstructorParameters<T>) => Omit<TextChannel, 'type' | 'rateLimitPerUser'> & InstanceType<T> =
  applyToClass(TextChannel)

  client!: Client
  guild!: Guild

  bulkDelete!: BulkDelete
  send!: Send
  createInvite!: CreateInvite
  fetchInvites!: FetchInvites

  messages: MessageManager = new MessageManager(this)
  _typing = new Map()

  _webhooks = new Collection<Snowflake, Webhook>()

  setNSFW!: (nsfw: boolean, reason?: string) => Promise<this>
  setRateLimitPerUser!: (rateLimitPerUser: number, reason?: string) => Promise<this>

  constructor(guild: Guild, data?: Partial<Data.TextChannel>) {
    super(guild, mergeDefault(defaults.textChannel, data))
  }

  /**
   * Fetches all webhooks for the channel.
   *
   * @param data The data returned from Discord.
   * @example
   * // Fetch webhooks
   * channel.fetchWebhooks()
   *   .then(hooks => console.log(`This channel has ${hooks.size} hooks`))
   *   .catch(console.error)
   */
  async fetchWebhooks(
    data: Partial<Omit<Data.Webhook, 'guild_id' | 'channel_id'>>[] = []
  ): Promise<Collection<Snowflake, Webhook>> {
    this._webhooks.clear()
    data
      .map(w => mergeDefault({...defaults.webhook, guild_id: this.guild.id, channel_id: this.id}, w))
      .forEach(w => this._webhooks.set(w.id, new Webhook(this.client, w)))
    return this._webhooks
  }

  /**
   * Creates a webhook for the channel.
   *
   * @param name The name of the webhook.
   * @param options Options for creating the webhook.
   * @param options.avatar The avatar for the webhook.
   * @param options.reason The reason for creating the webhook.
   * @returns The created webhook.
   * @example
   * // Create a webhook for the current channel
   * channel.createWebhook('Snek', {
   *   avatar: 'https://i.imgur.com/mI8XcpG.jpg',
   *   reason: 'Needed a cool new Webhook'
   * })
   *   .then(console.log)
   *   .catch(console.error)
   */
  async createWebhook(
    name: string, {avatar, reason}: {avatar?: BufferResolvable | Base64Resolvable, reason?: string} = {}
  ): Promise<Webhook> {
    if (typeof avatar == 'string' && !avatar.startsWith('data:')) avatar = await DataResolver.resolveImage(avatar)
    const webhook = new Webhook(this.client, {
      guild_id: this.guild.id,
      channel_id: this.id,
      user: this.client.user.toData(),
      name
      // TODO: images (to hash)
      // avatar
    })
    this._webhooks.set(webhook.id, webhook)
    this.guild._addLog({
      target_id: webhook.id,
      action_type: Data.AuditLogEvent.WEBHOOK_CREATE,
      user_id: this.client.user.id,
      reason,
      changes: [
        {key: 'channel_id', new_value: this.id},
        {key: 'name', new_value: name},
        {key: 'type', new_value: Data.WebhookType.INCOMING}
        // {key: 'avatar_hash', new_value: avatar}
      ]
    })
    return webhook
  }
}
