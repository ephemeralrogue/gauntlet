import Discord, {Collection, SnowflakeUtil} from 'discord.js'
import {TypeError, RangeError} from '../../../node_modules/discord.js/src/errors'
import DiscordTextBasedChannel from '../../../node_modules/discord.js/src/structures/interfaces/TextBasedChannel'
import * as Data from '../../data'
import {MessageManager} from '../../managers/MessageManager'
import {apiError, timestamp} from '../../util'
import APIMessage from '../APIMessage'
import {MessageMentions} from '../MessageMentions'
import {ChannelBase} from './Channel'
import type {
  AwaitMessagesOptions, Constructable, MessageAdditions, MessageCollectorOptions, MessageOptions, StringResolvable, Snowflake
} from 'discord.js'
import type {
  MessageOptionsWithoutSplit, MessageOptionsWithSplit
} from '../../../node_modules/discord.js/src/structures/interfaces/TextBasedChannel'
import type {Client} from '../../client'
import type {PartialKey} from '../../util'
import type {
  DMChannel, Guild, GuildMember, Message, MessageCollector, MessageCollectorFilter, NewsChannel, TextChannel, User
} from '..'

type TextBasedChannelProperties =
  | 'send'
  | 'lastMessage'
  | 'lastPinAt'
  | 'bulkDelete'
  | 'startTyping'
  | 'stopTyping'
  | 'typing'
  | 'typingCount'
  | 'createMessageCollector'
  | 'awaitMessages'
  | 'awaitNextMessageFromClient'

type MaybeTextChannel = Omit<TextChannel, 'guild'> & {guild?: Guild}

interface TypingData extends Discord.TypingData {
  user: User
}

export type BulkDelete = (
  messages: Collection<Snowflake, Message> | Message[] | Snowflake[] | number,
  filterOld?: boolean
) => Promise<Collection<Snowflake, Message>>

export interface Send {
  (options: MessageOptionsWithoutSplit | MessageAdditions | APIMessage): Promise<Message>
  (options: MessageOptionsWithSplit & {content: StringResolvable} | APIMessage): Promise<Message[]>
  (options: MessageOptions & {content: StringResolvable} | APIMessage): Promise<Message | Message[]>
  (content: StringResolvable, options?: MessageOptionsWithoutSplit | MessageAdditions): Promise<Message>
  (content: StringResolvable, options?: MessageOptionsWithSplit): Promise<Message[]>
  (content: StringResolvable, options?: MessageOptions | MessageAdditions): Promise<Message | Message[]>
}

export type Sendable = TextBasedChannel | GuildMember | User

export const send = async (
  {
    channel,
    author,
    member,
    sendFunction
  }: {
    channel: Sendable
    author: User
    member: GuildMember | null | undefined
    sendFunction: (channel: Sendable, message: APIMessage) => Promise<Message>
  },
  content: any,
  options?: MessageOptions | MessageAdditions
): Promise<Message | Message[]> => {
  let apiMessage: APIMessage

  if (content instanceof APIMessage) apiMessage = content.resolveData() as APIMessage
  else {
    apiMessage = APIMessage.create(channel, content, options)
      .resolveData() as APIMessage & {target: TextChannel | DMChannel}
    if (Array.isArray(apiMessage.data!.content))
      return Promise.all(apiMessage.split().map(async m => sendFunction(channel, m)))
  }

  const {data, files} = await apiMessage.resolveFiles()
  const mentions = data?.content?.matchAll(MessageMentions.USERS_PATTERN)
  const roles = data?.content?.matchAll(MessageMentions.ROLES_PATTERN)
  return channel.client._actions.MessageCreate.handle({
    id: SnowflakeUtil.generate(),
    channel_id: channel.id,
    author: author.toData(),
    member: member?.toData(),
    content: data?.content,
    timestamp: timestamp(),
    edited_timestamp: null,
    tts: data?.tts ?? false,
    mention_everyone: !data?.allowed_mentions?.parse || data.allowed_mentions.parse.includes('everyone')
      ? data?.content ? /@(everyone|here)/u.test(data.content) : false
      : false,
    mentions: mentions
      ? (await Promise.all([...mentions].map(async m => {
        const [,id] = m
        const user = await channel.client.users.fetch(id)
        const _member = 'guild' in channel ? await channel.guild.members.fetch(id) : undefined
        return {
          ...user.toData(),
          member: _member ? _member.toData() : undefined
        }
      }))).sort()
      : [],
    mention_roles: roles ? [...roles].map(r => r[1]).sort() : [],
    attachments: files?.map(f => {
      const id = SnowflakeUtil.generate()
      const {name} = f
      return {
        id,
        filename: name,
        size: f.file.length,
        url: `https://cdn.discordapp.com/attachments/${channel.id}/${id}/${name}`,
        proxy_url: `https://media.discordapp.net/attachments/${channel.id}/${id}/${name}`,
        height: null,
        width: null
      }
    }) ?? [],
    embeds: data?.embed ? [data.embed] : [],
    reactions: [],
    nonce: data?.nonce,
    pinned: false,
    type: Data.MessageType.DEFAULT
  }).message
}

export class TextBasedChannelBase extends DiscordTextBasedChannel {
  _typing!: Map<string, TypingData>
  messages!: MessageManager
  client!: Client
  id!: Snowflake
  awaitMessages!: (filter: MessageCollectorFilter, options?: AwaitMessagesOptions) => Promise<Collection<Snowflake, Message>>
  createMessageCollector!: (filter: MessageCollectorFilter, options?: MessageCollectorOptions) => MessageCollector

  static applyToClass<
    // eslint-disable-next-line @typescript-eslint/ban-types -- needs to be {} to be inherited
    T extends Constructable<{}>,
    TFull extends boolean = false,
    TIgnore extends TextBasedChannelProperties = never
  >(
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Class is a class
    Class: T, full: TFull = false as TFull, ignore: TIgnore[] = []
  ): new (...args: ConstructorParameters<T>) => InstanceType<T> & Pick<TextBasedChannelBase, Exclude<
    TFull extends true ? TextBasedChannelProperties : 'send' | 'awaitNextMessageFromClient', TIgnore
    > | 'client' | 'messages' | 'awaitMessages' | 'createMessageCollector'> {
    class TextBasedChannelMixin extends Class {}
    [
      'send',
      'awaitNextMessageFromClient',
      ...full ? [
        'lastMessage',
        'lastPinAt',
        'bulkDelete',
        'startTyping',
        'stopTyping',
        'typing',
        'typingCount',
        'createMessageCollector',
        'awaitMessages'
      ] : []
    ].forEach(prop => {
      if (!ignore.includes(prop as TIgnore)) {
        Object.defineProperty(
          TextBasedChannelMixin.prototype,
          prop,
          Object.getOwnPropertyDescriptor(TextBasedChannelBase.prototype, prop) ??
            Object.getOwnPropertyDescriptor(DiscordTextBasedChannel.prototype, prop)!
        )
      }
    })
    return ChannelBase.applyToClass(TextBasedChannelMixin) as unknown as new (...args: ConstructorParameters<T>) =>
    InstanceType<T> & Pick<TextBasedChannelBase,
    Exclude<TFull extends true
      ? TextBasedChannelProperties
      : 'send' | 'awaitNextMessageFromClient', TIgnore> | 'client' | 'messages' | 'awaitMessages' | 'createMessageCollector'
    >
  }

  /**
   * Sends a message to this channel.
   *
   * @param content The content to send.
   * @param options The options to provide.
   * @example
   * // Send a basic message
   * channel.send('hello!')
   *   .then(message => console.log(`Sent message: ${message.content}`))
   * @example
   * // Send a remote file
   * channel.send({
   *   files: ['https://cdn.discordapp.com/icons/222078108977594368/6e1019b3179d71046e463a75915e7244.png?size=2048']
   * })
   *   .then(console.log)
   * @example
   * // Send a local file
   * channel.send({
   *   files: [{
   *     attachment: 'entire/path/to/file.jpg',
   *     name: 'file.jpg'
   *   }]
   * })
   *   .then(console.log)
   * @example
   * // Send an embed with a local image inside
   * channel.send('This is an embed', {
   *   embed: {
   *     thumbnail: {
   *          url: 'attachment://file.jpg'
   *       }
   *    },
   *    files: [{
   *       attachment: 'entire/path/to/file.jpg',
   *       name: 'file.jpg'
   *    }]
   * })
   *   .then(console.log)
   */
  async send(options: MessageOptionsWithoutSplit | MessageAdditions | APIMessage): Promise<Message>
  async send(options: MessageOptionsWithSplit & {content: StringResolvable} | APIMessage): Promise<Message[]>
  async send(options: MessageOptions & {content: StringResolvable} | APIMessage): Promise<Message | Message[]>
  async send(content: StringResolvable, options?: MessageOptionsWithoutSplit | MessageAdditions): Promise<Message>
  async send(content: StringResolvable, options?: MessageOptionsWithSplit): Promise<Message[]>
  async send(content: StringResolvable, options?: MessageOptions | MessageAdditions): Promise<Message | Message[]>
  async send(...content: [StringResolvable, (MessageOptions | MessageAdditions)?]): Promise<Message | Message[]> {
    // eslint-disable-next-line no-shadow,@typescript-eslint/naming-convention -- class, already imported as type
    const {GuildMember} = await import('../GuildMember')
    // eslint-disable-next-line no-shadow, @typescript-eslint/naming-convention -- User is a class
    const {User} = await import('../User')

    if (this instanceof User || this instanceof GuildMember)
      return (await this.createDM()).send(...content)

    return send(
      {
        channel: this as unknown as Sendable,
        author: this.client.user,
        member: (this as unknown as MaybeTextChannel).guild?.me,
        sendFunction: async (channel, message) => channel.send(message)
      },
      ...content
    )
  }

  /**
   * Starts a typing indicator in the channel.
   *
   * @param count The number of times `startTyping` should be considered to have been called.
   * @returns Resolves once the bot stops typing gracefully, or rejects when an error occurs.
   * @example
   * // Start typing in a channel, or increase the typing count by one
   * channel.startTyping()
   * @example
   * // Start typing in a channel with a typing count of five, or set it to five
   * channel.startTyping(5)
   */
  async startTyping(count?: number): Promise<void> {
    if (typeof count != 'undefined' && count < 1) throw new RangeError('TYPING_COUNT')
    if (this.client.user._typing.has(this.id)) {
      const entry = this.client.user._typing.get(this.id)!
      entry.count = count ?? entry.count! + 1
      return entry.promise
    }

    const handlePacket = (): void => {
      if (this.client._hasIntent('DIRECT_MESSAGE_TYPING')) {
        this.client.ws._handlePacket({
          t: 'TYPING_START',
          d: {
            channel_id: this.id,
            guild_id: (this as unknown as MaybeTextChannel).guild?.id,
            user_id: this.client.user.id,
            timestamp: timestamp(),
            member: (this as unknown as MaybeTextChannel).guild?.me?.toData()
          }
        })
      }
    }
    const entry: {
      promise: Promise<void>
      count?: number
      interval?: NodeJS.Timeout
      resolve?: () => void
    } = {
      promise: new Promise(resolve => {
        Object.assign(entry, {
          count: count ?? 1,
          interval: this.client.setInterval(() => handlePacket(), 9000),
          resolve
        })
        handlePacket()
        this.client.user._typing.set(this.id, entry)
      })
    }
    return entry.promise
  }

  /**
   * Bulk deletes given messages that are newer than two weeks.
   *
   * @param messages The messages or number of messages to delete.
   * @param filterOld Whether to filter messages to remove those which are older than two weeks automatically.
   * @returns The deleted messages.
   */
  async bulkDelete(
    messages: Collection<Snowflake, Message> | Message[] | Snowflake[], filterOld?: boolean
  ): Promise<Collection<Snowflake, Message>>

  /**
   * Bulk deletes given messages that are newer than two weeks.
   *
   * @param messages The messages or number of messages to delete.
   * @param filterOld Whether to filter messages to remove those which are older than two weeks automatically.
   * @param data The data returned from Discord when fetching the messages to delete.
   * @returns The deleted messages.
   * @example
   * // Bulk delete messages
   * channel.bulkDelete(5)
   *   .then(messages => console.log(`Bulk deleted ${messages.size} messages`))
   */
  async bulkDelete(
    messages: number, filterOld?: boolean, data?: Partial<Data.Message>[]
  ): Promise<Collection<Snowflake, Message>>

  async bulkDelete(
    messages: Collection<Snowflake, Message> | Message[] | Snowflake[] | number,
    filterOld = false,
    data: Partial<Data.Message>[] = []
  ): Promise<Collection<Snowflake, Message>> {
    if (Array.isArray(messages) || messages instanceof Collection) {
      let messageIds = messages instanceof Collection
        ? messages.keyArray()
        : (messages.map as <T>(fn: (value: Message | Snowflake) => T) => T[])(
          m => (m as PartialKey<Message, 'id'>).id ?? m as Snowflake
        )
      if (filterOld)
        messageIds = messageIds.filter(id => Date.now() - SnowflakeUtil.deconstruct(id).date.getTime() < 1_209_6e5)
      if (!messageIds.length) return new Collection()

      /*
      * These aren't instance methods of `TextBasedChannelBase` because they will cause errors with the channels inheriting
      * from it not inheriting private methods. These are also here to stop eslint reporting that this method has too many
      * statements.
      */
      const deleteSingleMessage = async (id: Snowflake): Promise<Collection<Snowflake, Message>> => {
        let existing = this.messages.cache.find(m => m.id === id)
        if (existing) {
          await existing.delete()
          existing._deleted = true
        } else {
          if (this.client._hasIntent('GUILD_MESSAGES')) {
            this.client.ws._handlePacket({
              t: 'MESSAGE_DELETE',
              d: {
                id,
                channel_id: this.id,
                guild_id: (this as unknown as {guild: Guild}).guild.id
              }
            })
          }
          existing = this.messages.cache.find(m => m.id === id)
          if (existing) existing._deleted = true
        }
        const message = this.client._actions.MessageDelete.getMessage({id}, this)
        return message ? new Collection([[message.id, message]]) : new Collection()
      }

      const deleteMultipleMessages = (ids: Snowflake[]): Collection<Snowflake, Message> => {
        const existing = this.messages.cache.filter(m => ids.includes(m.id))
        const now = Date.now()
        if (existing.some(m => now - m.createdAt.getTime() > 1_209_6e5))
          apiError('MESSAGE_TOO_OLD', `/channels/${this.id}/messages/bulk-delete`, 'post')
        existing.forEach(m => m._deleted = true)
        if (this.client._hasIntent('GUILD_MESSAGES')) {
          this.client.ws._handlePacket({
            t: 'MESSAGE_DELETE_BULK',
            d: {
              ids,
              channel_id: this.id,
              guild_id: (this as unknown as {guild: Guild}).guild.id
            }
          })
        }
        return new Collection(ids.map(id => [
          id,
          this.client._actions.MessageDeleteBulk.getMessage({id}, this)
        ])).filter(m => typeof m !== 'undefined') as Collection<Snowflake, Message>
      }

      return messageIds.length === 1 ? deleteSingleMessage(messageIds[0]) : deleteMultipleMessages(messageIds)
    }
    if (typeof messages == 'number')
      return this.bulkDelete(await this.messages.fetch({limit: messages}, undefined, data), filterOld)
    throw new TypeError('MESSAGE_BULK_DELETE_TYPE')
  }

  async awaitNextMessageFromClient(): Promise<Message> {
    return (await this.awaitMessages(({author}) => author.id === this.client.user.id, {max: 1})).first()!
  }
}

export type TextBasedChannel = TextChannel | NewsChannel | DMChannel
