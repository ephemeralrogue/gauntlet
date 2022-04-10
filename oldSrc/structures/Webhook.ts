import Discord, {Channel, DataResolver, SnowflakeUtil} from 'discord.js'
import * as Data from '../data'
import defaults from '../defaults'
import {Util, mergeDefault, timestamp} from '../util'
import APIMessage from './APIMessage'
import {MessageMentions} from './MessageMentions'
import type {
  Constructable, MessageAdditions, SplitOptions, StringResolvable,
  WebhookEditData, WebhookFields, WebhookMessageOptions
} from 'discord.js'
import type {Client} from '../client'
import type {Override} from '../util'
import type {Message, TextBasedChannel} from '.'

interface WebhookMessageOptionsWithoutSplit extends WebhookMessageOptions {
  split?: false
}
interface WebhookMessageOptionsWithSplit extends WebhookMessageOptions {
  split: true | SplitOptions
}

export class Webhook extends Discord.Webhook {
  client!: Client

  constructor(client: Client, data: Partial<Data.Webhook> = {}) {
    super(client, mergeDefault(defaults.webhook, data))
  }

  // eslint-disable-next-line @typescript-eslint/ban-types -- needs to be {} to be inherited
  static applyToClass<T extends Constructable<{}>>(
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Class is a class
    Class: T
  ): new (...args: ConstructorParameters<T>) => Override<InstanceType<T> & WebhookFields, {
      sendSlackMessage(body: Data.SlackMessage, success?: boolean): Promise<boolean>
    }> {
    class _Class extends Class {}
    ['send', 'sendSlackMessage', 'edit', 'delete', 'createdTimestamp', 'createdAt', 'url'].forEach(prop => {
      Object.defineProperty(
        _Class.prototype,
        prop,
        Object.getOwnPropertyDescriptor(Webhook.prototype, prop) ??
          Object.getOwnPropertyDescriptor(Discord.Webhook.prototype, prop)!
      )
    })
    return _Class as unknown as new (...args: ConstructorParameters<T>) => InstanceType<T> & WebhookFields
  }

  /**
   * Sends a message with this webhook.
   *
   * @param content The content to send.
   * @param options The options to provide.
   * @example
   * // Send a basic message
   * webhook.send('hello!')
   *   .then(message => console.log(`Sent message: ${message.content}`))
   *   .catch(console.error)
   */
  async send(content?: StringResolvable, options?: WebhookMessageOptionsWithoutSplit | MessageAdditions): Promise<Message>

  /**
   * Sends a message with this webhook.
   *
   * @param content The content to send.
   * @param options The options to provide.
   */
  async send(content?: StringResolvable, options?: WebhookMessageOptionsWithSplit | MessageAdditions): Promise<Message[]>

  /**
   * Sends a message with this webhook.
   *
   * @param content The content to send.
   * @param options The options to provide.
   * @example
   * // Send a remote file
   * webhook.send({
   *   files: ['https://cdn.discordapp.com/icons/222078108977594368/6e1019b3179d71046e463a75915e7244.png?size=2048']
   * })
   *   .then(console.log)
   *   .catch(console.error)
   * @example
   * // Send a local file
   * webhook.send({files: [{attachment: 'entire/path/to/file.jpg', name: 'file.jpg'}]})
   *   .then(console.log)
   *   .catch(console.error)
   * @example
   * // Send an embed with a local image inside
   * webhook.send('This is an embed', {
   *   embeds: [{thumbnail: {url: 'attachment://file.jpg'}}],
   *   files: [{attachment: 'entire/path/to/file.jpg',  name: 'file.jpg'}]
   * })
   *   .then(console.log)
   *   .catch(console.error)
   */
  async send(options?: WebhookMessageOptionsWithoutSplit | MessageAdditions | APIMessage): Promise<Message>

  /**
   * Sends a message with this webhook.
   *
   * @param content The content to send.
   * @param options The options to provide.
   */
  async send(options?: WebhookMessageOptionsWithSplit | MessageAdditions | APIMessage): Promise<Message[]>

  async send(
    content?: StringResolvable | WebhookMessageOptions | MessageAdditions | APIMessage,
    options?: WebhookMessageOptions | MessageAdditions | APIMessage
  ): Promise<Message | Message[]> {
    let apiMessage: APIMessage

    if (content instanceof APIMessage) apiMessage = content.resolveData() as APIMessage
    else {
      apiMessage = APIMessage.create(this, content, options as Exclude<typeof options, APIMessage>).resolveData()
      if (Array.isArray(apiMessage.data!.content))
        return Promise.all(apiMessage.split().map(this.send.bind(this))) as unknown as Promise<Message[]>
    }

    const {data, files} = await apiMessage.resolveFiles()
    const mentions = data?.content?.matchAll(MessageMentions.USERS_PATTERN)
    const roles = data?.content?.matchAll(MessageMentions.ROLES_PATTERN)

    const d = mergeDefault(
      defaults.message,
      {
        channel_id: this.channelID,
        author: {
          id: this.id,
          username: this.name,
          avatar: this.avatar
        },
        content: data?.content,
        webhook_id: this.id,
        tts: data?.tts ?? false,
        mention_everyone: !data?.allowed_mentions?.parse || data.allowed_mentions.parse.includes('everyone')
          ? data?.content ? /@(everyone|here)/u.test(data.content) : false
          : false,
        mentions: mentions
          ? (await Promise.all([...mentions].map(async m => {
            const [,id] = m
            const user = await this.client.users.fetch(id)
            const member = await this.client.guilds.cache.get(this.guildID)?.members.fetch(id)
            return {
              ...user.toData(),
              member: member ? member.toData() : undefined
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
            url: `https://cdn.discordapp.com/attachments/${this.channelID}/${id}/${name}`,
            proxy_url: `https://media.discordapp.net/attachments/${this.channelID}/${id}/${name}`,
            height: null,
            width: null
          }
        }) ?? [],
        // TODO: limit embeds to 10
        embeds: data?.embeds ?? [],
        nonce: data?.nonce
      }
    )
    this.client.ws._handlePacket({t: 'MESSAGE_CREATE', d})

    const channel = this.client.channels.cache.get(d.channel_id)
    if (!channel) return d as unknown as Message | Message[]
    return (channel as TextBasedChannel).messages.add(d, false)
  }

  /**
   * Sends a raw slack message with this webhook.
   *
   * @param body The raw body to send.
   * @param success Whether the message was sent successfully. This will be used as the return value.
   * @example
   * // Send a slack message
   * webhook.sendSlackMessage({
   *   'username': 'Wumpus',
   *   'attachments': [{
   *     'pretext': 'this looks pretty cool',
   *     'color': '#F0F',
   *     'footer_icon': 'http://snek.s3.amazonaws.com/topSnek.png',
   *     'footer': 'Powered by sneks',
   *     'ts': Date.now() / 1000
   *   }]
   * }).catch(console.error)
   */
  async sendSlackMessage(body: Data.SlackMessage, success = true): Promise<boolean> {
    const mentions = body.text?.matchAll(MessageMentions.USERS_PATTERN)
    const roles = body.text?.matchAll(MessageMentions.ROLES_PATTERN)
    this.client.ws._handlePacket({
      t: 'MESSAGE_CREATE',
      d: mergeDefault(
        defaults.message,
        {
          channel_id: this.channelID,
          webhook_id: this.id,
          mentions: mentions
            ? (await Promise.all([...mentions].map(async m => {
              const [,id] = m
              const user = await this.client.users.fetch(id)
              const member = await this.client.guilds.cache.get(this.guildID)?.members.fetch(id)
              return {
                ...user.toData(),
                member: member ? member.toData() : undefined
              }
            }))).sort()
            : [],
          mention_roles: roles ? [...roles].map(r => r[1]).sort() : [],
          mention_everyone: body.text ? /@(everyone|here)/u.test(body.text) : false,
          embeds: body.attachments
            ? body.attachments.map(attachment => ({
              url: (attachment as Data.SlackAttachmentWithTitle).title_link,
              type: 'rich',
              title: (attachment as Data.SlackAttachmentWithTitle).title,
              timestamp: attachment.ts === undefined ? undefined : timestamp(attachment.ts * 1000),
              thumbnail: attachment.thumb_url ? {url: attachment.thumb_url} : undefined,
              footer: 'footer' in attachment ? {text: attachment.footer, icon_url: attachment.footer_icon} : undefined,
              fields: attachment.fields
                ? attachment.fields.map(({value, title, short}) => ({value: value!, name: title!, inline: short}))
                : [],
              description: attachment.pretext || attachment.text
                ? `${attachment.pretext ?? ''}
${attachment.text ?? ''}`
                : undefined,
              color: attachment.color ? Util.resolveColor(attachment.color) : undefined,
              author: 'author_name' in attachment
                ? {name: attachment.author_name, url: attachment.author_link, icon_url: attachment.author_icon}
                : undefined
            }))
            : [],
          edited_timestamp: null,
          content: body.text,
          author: {
            username: this.name,
            id: this.id,
            avatar: this.avatar
          }
        })
    })

    return success
  }

  /**
   * Edits the webhook.
   *
   * @param options The options.
   * @param reason The reason for editing this webhook.
   */
  async edit(
    {name = this.name, avatar, channel = this.channelID}: WebhookEditData, reason?: string
  ): Promise<this> {
    avatar = typeof avatar == 'string' && !avatar.startsWith('data:')
      ? await DataResolver.resolveImage(avatar)
      : avatar as string
    channel = channel instanceof Channel ? channel.id : channel

    const changes: Data.WebhookUpdateEntry['changes'] = []
    if (name !== this.name) changes.push({key: 'name', old_value: this.name, new_value: name})
    if (channel !== this.channelID) changes.push({key: 'channel_id', old_value: this.channelID, new_value: channel})
    if (avatar !== this.avatar) changes.push({key: 'avatar_hash', old_value: this.avatar, new_value: avatar})

    // TODO: avatar (proper hashes?)
    this.name = name
    // TODO: fix Discord.js' Webhook#avatar (should be nullable)
    this.avatar = avatar
    this.channelID = channel

    if (changes.length) {
      const _channel = this.client.channels.resolve(this.channelID)
      if (_channel && _channel.type !== 'dm') {
        _channel.guild._addLog({
          action_type: Data.AuditLogEvent.WEBHOOK_UPDATE,
          target_id: this.id,
          user_id: this.client.user.id,
          reason,
          changes
        })
      }
    }
    if (this.client._hasIntent('GUILD_WEBHOOKS'))
      this.client.ws._handlePacket({t: 'WEBHOOKS_UPDATE', d: {guild_id: this.guildID, channel_id: this.channelID}})

    return this
  }
}
