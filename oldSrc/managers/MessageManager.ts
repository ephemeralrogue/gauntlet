import Discord, {Collection, PermissionString} from 'discord.js'
import LimitedCollection from '../../node_modules/discord.js/src/util/LimitedCollection'
import * as Data from '../data'
import defaults from '../defaults'
import {Message} from '../structures/Message'
import {apiError, mergeDefault} from '../util'
import manager from './BaseManager'
import type {ChannelLogsQueryOptions, MessageResolvable, Snowflake} from 'discord.js'
import type {Client} from '../client'
import type {Guild, GuildChannel, TextBasedChannel, TextBasedChannelBase} from '../structures'
import type {ErrorCode, PartialKey} from '../util'

type GuildTextBasedChannel = GuildChannel & TextBasedChannel

export class MessageManager extends manager<Discord.MessageManager, typeof Message, MessageResolvable>(
  Discord.MessageManager
) {
  readonly client!: Client
  cache!: Collection<Snowflake, Message>
  holds!: typeof Message
  add!: (data?: Partial<Data.Message>, cache?: boolean) => Message
  resolve!: (resolvable: MessageResolvable) => Message | null
  #pinned: Data.Message[] = []

  constructor(public channel: TextBasedChannelBase, iterable?: Iterable<Data.Message>) {
    super(channel.client, iterable, Message, LimitedCollection, channel.client.options.messageCacheMaxSize)
  }

  private get guild(): Guild | undefined {
    return (this.channel as PartialKey<GuildTextBasedChannel, 'guild'>).guild
  }

  /**
   * Gets a message from this channel.
   *
   * @param message The ID of the message to fetch.
   * @param cache Whether to cache the message.
   * @param data The data for the message.
   * @example
   * // Get message
   * channel.messages.fetch('99539446449315840')
   *   .then(message => console.log(message.content))
   *   .catch(console.error)
   */
  async fetch(message: Snowflake, cache?: boolean, data?: Partial<Data.Message>): Promise<Message>

  /**
   * Gets messages from this channel.
   *
   * The returned `Collection` does not contain reaction users of the messages if they were not cached. Those need to be
   * fetched separately in such a case.
   *
   * @param options The query parameters.
   * @param cache Whether to cache the messages.
   * @param data The data for the messages.
   * @example
   * // Get messages
   * channel.messages.fetch({limit: 10})
   *   .then(messages => console.log(`Received ${messages.size} messages`))
   *   .catch(console.error)
   * @example
   * // Get messages and filter by user ID
   * channel.messages.fetch()
   *   .then(messages => console.log(`${messages.filter(m => m.author.id === '84484653687267328').size} messages`))
   *   .catch(console.error)
   */
  async fetch(
    options?: ChannelLogsQueryOptions, cache?: boolean, data?: Partial<Data.Message>[]
  ): Promise<Collection<Snowflake, Message>>

  async fetch(
    message?: Snowflake | ChannelLogsQueryOptions, cache = true, data?: Partial<Data.Message> | Partial<Data.Message>[]
  ): Promise<Message | Collection<Snowflake, Message>> {
    return typeof message == 'string'
      ? this._fetchID(message, cache, data as Partial<Data.Message>)
      : this._fetchMany(message, cache, data as Partial<Data.Message>[])
  }

  /**
   * Fetches the pinned messages of this channel and returns a collection of them.
   *
   * The returned `Collection` does not contain any reaction data of the messages. Those need to be fetched separately.
   *
   * @param cache Whether to cache the message(s).
   * @param data The data for the pinned messages.
   * @example
   * // Get pinned messages
   * channel.fetchPinned()
   *   .then(messages => console.log(`Received ${messages.size} messages`))
   *   .catch(console.error)
   */
  async fetchPinned(cache = true, data: Partial<Data.Message>[] = this.#pinned): Promise<Collection<Snowflake, Message>> {
    this.#pinned = []
    // TODO: make merging of Data.Message take into account timestamp and edited_timestamp for id
    const messages = new Collection<Snowflake, Message>(data.map(message => {
      // TODO: merge properly for user or webhook message
      const m = mergeDefault(defaults.message, message) as Data.Message
      this.#pinned.push(m)
      return [m.id, this.add(m, cache)]
    }))
    return messages
  }

  /**
   * Deletes a message, even if it's not cached.
   *
   * @param message The message to delete.
   * @param reason The reason for deleting this message if it does not belong to the client user.
   */
  async delete(message: MessageResolvable, reason?: string): Promise<void> {
    const m = this.resolve(message)
    if (m) {
      this.client.ws._handlePacket({
        t: 'MESSAGE_DELETE',
        d: {
          id: m.id,
          channel_id: this.channel.id,
          guild_id: this.guild?.id
        }
      })
      if (m.author.id !== this.client.user.id) {
        this.guild?._addLog({
          action_type: Data.AuditLogEvent.MESSAGE_DELETE,
          target_id: m.id,
          user_id: this.client.user.id,
          reason,
          options: {
            channel_id: this.channel.id,
            count: '1'
          }
        })
      }
    }
  }

  private hasPermission(permission: PermissionString): boolean {
    return this.guild?.me
    // if there are no permissions it doesn't have the permissions
      ? !!(this.channel as GuildTextBasedChannel).permissionsFor(this.guild.me)?.has(permission)
      : true
  }

  private async _fetchID(messageID: Snowflake, cache: boolean, data?: Partial<Data.Message>): Promise<Message> {
    const existing = this.cache.get(messageID)
    if (existing) return existing
    if (this.hasPermission('READ_MESSAGE_HISTORY')) apiError('MISSING_ACCESS', `/channels/${this.channel.id}/messages/${messageID}`, 'get')
    // TODO: proper default messages (user/webhook)
    return this.add(mergeDefault(defaults.message, {...data, id: messageID} as Data.Message), cache)
  }

  private async _fetchMany(
    {before, after, around, limit = 50}: ChannelLogsQueryOptions = {}, cache: boolean, data: Partial<Data.Message>[] = []
  ): Promise<Collection<Snowflake, Message>> {
    const error = (err: ErrorCode, extra?: Record<string, any>): never =>
      apiError(err, `/channels/${this.channel.id}/messages`, 'get', extra)
    if (limit < 1) {
      error('INVALID_FORM_BODY', {
        limit: {_errors: [{code: 'NUMBER_TYPE_MIN', message: 'int value should be greater than or equal to 1.'}]}
      })
    }
    if (limit > 100) {
      error('INVALID_FORM_BODY', {
        limit: {_errors: [{code: 'NUMBER_TYPE_MAX', message: 'int value should be less than or equal to 100.'}]}
      })
    }
    if (!this.hasPermission('VIEW_CHANNEL')) error('MISSING_ACCESS')

    const messages = this.cache
      .concat(new Collection(data.map(m => {
        const message = this.add(mergeDefault(defaults.message, m) as Data.Message, cache)
        return [message.id, message]
      })))
      .array()
      .sort((a, b) => Number(b.id) - Number(a.id))
    const i = messages.findIndex(m => m.id === (around ?? after ?? before))
    return new Collection<Snowflake, Message>(
      (this.hasPermission('READ_MESSAGE_HISTORY')
        ? around === undefined
          ? after === undefined
            ? before === undefined
              ? messages.slice(0, limit)
              : messages.slice(Math.max(0, i - limit), i)
            : messages.slice(i + 1, i + limit + 1)
          : messages.slice(Math.max(0, i - Math.floor(i / 2)), i + Math.floor(i / 2) + 1)
        : []).map(m => [m.id, m])
    )
  }
}
