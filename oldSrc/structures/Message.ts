import Discord from 'discord.js'
import {TypeError} from '../../node_modules/discord.js/src/errors'
import * as Data from '../data'
import defaults from '../defaults'
import {ReactionManager} from '../managers/ReactionManager'
import {Util, apiError, channelThrowPermissionsError, mergeDefault, timestamp} from '../util'
import APIMessage from './APIMessage'
import {ClientApplication} from './ClientApplication'
import {MessageReaction} from './MessageReaction'
import type {
  AwaitReactionsOptions, Collection, EmojiIdentifierResolvable, IntentsString, MessageEditOptions,
  MessageEmbed, PermissionResolvable, ReactionCollectorOptions, StringResolvable, Snowflake
} from 'discord.js'
import type {Client} from '../client'
import type {Method} from '../util'
import type {
  Base, DMChannel, Guild, GuildMember, MessageMentions, NewsChannel,
  ReactionCollector, ReactionCollectorFilter, User, TextChannel
} from '.'

const enum MessageIntent {
  MESSAGES = 'MESSAGES',
  REACTIONS = 'MESSAGE_REACTIONS'
}

export class Message extends Discord.Message implements Base {
  application!: ClientApplication | null
  author!: User
  client!: Client
  channel!: TextChannel | DMChannel | NewsChannel
  readonly edits!: Message[]
  readonly guild!: Guild | null
  member!: GuildMember | null
  mentions!: MessageMentions
  reactions!: ReactionManager

  awaitReactions!: (
    filter: ReactionCollectorFilter, options?: AwaitReactionsOptions
  ) => Promise<Collection<Snowflake, MessageReaction>>

  createReactionCollector!: (filter: ReactionCollectorFilter, options?: ReactionCollectorOptions) => ReactionCollector
  delete!: (options?: {timeout?: number, reason?: string}) => Promise<this>

  _deleted = false
  private readonly _clone!: () => this

  constructor(client: Client, data: Partial<Data.Message> | undefined, channel: DMChannel | TextChannel | NewsChannel) {
    super(client, mergeDefault(defaults.message, data), channel as DMChannel | TextChannel)
  }

  // This is mocked os that the mocked ClientApplication and ReactionManager be used
  _patch(data: Data.Message): void {
    // @ts-ignore -- can't have type assertions with super
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- see above
    super._patch(data)
    this.reactions = new ReactionManager(this, data.reactions)
    this.application = data.application ? new ClientApplication(this.client, data.application) : null
  }

  /**
   * Edits the content of the message.
   *
   * @param content The new content for the message.
   * @param options The options for the message.
   * @example
   * // Update the content of a message
   * message.edit('This is my new content!')
   *   .then(msg => console.log(`Updated the content of a message to ${msg.content}`))
   */
  async edit(content: StringResolvable, options?: MessageEditOptions): Promise<this>
  async edit(options: MessageEditOptions | MessageEmbed | APIMessage): Promise<this>
  async edit(
    content: StringResolvable | MessageEditOptions | MessageEmbed | APIMessage, options?: MessageEditOptions | MessageEmbed
  ): Promise<this> {
    const {data} = (content instanceof APIMessage
      ? content as APIMessage
      : APIMessage.create(this, content, options)).resolveData()

    const path = this.#messagePath()
    const method = 'patch'
    this.#permissionsError('VIEW_CHANNEL', path, method)
    if (!this.editable) apiError('EDIT_OTHER_USERS_MESSAGE', path, method)
    const current = this.toData()
    const _data = {
      ...current,
      content: data?.content ?? current.content,
      edited_timestamp: timestamp(),
      mention_roles: [],
      embeds: data?.embed ? [data.embed] : current.embeds,
      flags: data?.flags ?? current.flags
    }
    this.#emitUpdate(_data)

    const clone = this._clone()
    clone._patch(_data)
    return clone
  }

  /** Pins this message to the channel's pinned messages. */
  async pin(): Promise<this> {
    const method = 'put'
    this.#pinErrors(method)
    if ((await this.channel.messages.fetchPinned()).size >= 50) apiError('MAX_PINS', this.#pinsPath(), method)
    if (!this.pinned) this.#emitPinUpdate(true)

    return this
  }

  /** Unpins this message from the channel's pinned messages. */
  async unpin(): Promise<this> {
    this.#pinErrors('delete')
    this.#emitPinUpdate(true)

    return this
  }

  /**
   * Adds a reaction to the message.
   *
   * @param emoji The emoji to react with.
   * @example
   * // React to a message with a unicode emoji
   * message.react('??')
   *   .then(console.log)
   * @example
   * // React to a message with a custom emoji
   * message.react(message.guild.emojis.cache.get('123456789012345678'))
   *   .then(console.log)
   */
  async react(emoji: EmojiIdentifierResolvable): Promise<MessageReaction> {
    const emojiID = this.client.emojis.resolveIdentifier(emoji)
    if (!emojiID) throw new TypeError('EMOJI_TYPE')

    const path = `${this.#messagePath}/reactions/${emojiID}/@me`
    const method = 'put'
    this.#permissionsError(
      [
        'READ_MESSAGE_HISTORY',
        ...(emoji instanceof MessageReaction || typeof emoji == 'string' ? this.reactions.resolve(emoji) === null : false)
          ? ['ADD_REACTIONS' as const]
          : []
      ],
      path,
      method
    )
    const parsedEmoji = Util.parseEmoji(emojiID)
    if (!parsedEmoji) apiError('UNKNOWN_EMOJI', path, method)

    if (this.#hasIntent(MessageIntent.REACTIONS)) {
      this.client.ws._handlePacket({
        t: 'MESSAGE_REACTION_ADD',
        d: {
          user_id: this.client.user.id,
          channel_id: this.channel.id,
          message_id: this.id,
          guild_id: this.guild?.id,
          member: this.guild?.me?.toData(),
          emoji: parsedEmoji
        }
      })
    }

    return this.client._actions.MessageReactionAdd.handle({
      user: this.client.user,
      channel: this.channel,
      message: this,
      emoji: parsedEmoji
    }).reaction
  }

  toData(): Data.Message {
    return {
      id: this.id,
      channel_id: this.channel.id,
      member: this.member?.toData(),
      content: this.content,
      timestamp: timestamp(this.createdAt),
      edited_timestamp: this.editedAt ? timestamp(this.editedAt) : null,
      tts: this.tts,
      mention_everyone: this.mentions.everyone,
      mentions: this.mentions.members?.map(member => ({...member.user.toData(), member: member.toData()})) ??
        this.mentions.users.map(user => user.toData()),
      mention_roles: this.mentions.roles.keyArray(),
      attachments: this.attachments.map(attachment => ({
        ...attachment,
        filename: attachment.name!,
        proxy_url: attachment.proxyURL
      })),
      embeds: this.embeds.map(({
        title,
        type,
        description,
        url, timestamp: embedTimestamp,
        color,
        footer,
        image,
        thumbnail,
        video,
        provider,
        author,
        fields
      }) => ({
        title,
        type: type as Data.EmbedType,
        description,
        url,
        timestamp: embedTimestamp == null ? undefined : timestamp(embedTimestamp),
        color,
        footer: footer
          ? {...footer as typeof footer & {text: string}, icon_url: footer.iconURL, proxy_icon_url: footer.proxyIconURL}
          : undefined,
        image: image ? {...image, proxy_url: image.proxyURL} : undefined,
        thumbnail: thumbnail ? {...thumbnail, proxy_url: thumbnail.proxyURL} : undefined,
        video: video ?? undefined,
        provider: provider ?? undefined,
        author: author ? {...author, icon_url: author.iconURL, proxy_icon_url: author.proxyIconURL} : undefined,
        fields
      })),
      reactions: this.reactions.cache.array() as Data.Reaction[],
      nonce: this.nonce ?? undefined,
      pinned: this.pinned,
      type: Data.MessageType[this.type === 'PINS_ADD' ? 'CHANNEL_PINNED_MESSAGE' : this.type],
      activity: this.activity ? {...this.activity, party_id: this.activity.partyID} : undefined,
      application: this.application ? {...this.application, cover_image: this.application.cover ?? undefined} : undefined,
      flags: this.flags.bitfield,
      author: this.author.toData(),
      webhook_id: this.webhookID ?? undefined
    }
  }

  #channelPath = (): string => `/channels/${this.channel.id}`

  #messagePath = (): string => `${this.#channelPath}/messages/${this.id}`

  // Accessors can't be private identifiers
  #pinsPath = (): string => `${this.#channelPath}/pins/${this.id}`

  #permissionsError = (permissions: PermissionResolvable, path: string, method: Method): void =>
    channelThrowPermissionsError(this.channel, permissions, path, method)

  #hasIntent = (intent: MessageIntent): boolean =>
    this.client._hasIntent((this.guild ? `GUILD_${intent}` : `DIRECT_${intent}`) as IntentsString)

  #emitUpdate = (data: Data.MessageUpdate['d']): void => {
    if (this.#hasIntent(MessageIntent.MESSAGES)) this.client.ws._handlePacket({t: 'MESSAGE_UPDATE', d: data})
  }

  #pinErrors = (method: Method): void => {
    const path = this.#pinsPath()
    this.#permissionsError('MANAGE_MESSAGES', path, method)
    if (this.system) apiError('SYSTEM_MESSAGE', path, method)
  }

  #emitPinUpdate = (pinned: boolean): void => this.#emitUpdate({...this.toData(), pinned})
}
