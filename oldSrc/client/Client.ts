import Discord, {Collection, DataResolver, Intents, Structures} from 'discord.js'
import WebSocketShard from '../../node_modules/discord.js/src/client/websocket/WebSocketShard'
import {TypeError} from '../../node_modules/discord.js/src/errors'
import TestUser from '../TestUser'
import {ChannelManager, GuildManager, GuildEmojiManager, UserManager} from '../managers'
import {
  CategoryChannel, ClientApplication, ClientPresence, ClientUser, DMChannel, Guild, GuildMember, GuildPreview, Invite,
  Message, MessageReaction, NewsChannel, Presence, Role, StoreChannel, TextChannel, User, VoiceChannel, VoiceRegion,
  VoiceState, Webhook
} from '../structures'
import defaultVoiceRegions from '../voiceRegions'
import {WebSocketManager} from './websocket/WebSocketManager'
import type {
  ClientOptions, GuildResolvable, IntentsString, InviteResolvable, Snowflake, Speaking
} from 'discord.js'
import type * as Data from '../data'
import type {Channel, GuildEmoji} from '../structures'
import type {DeepPartial} from '../util'
import type {ActionsManager} from './ActionsManager'

interface ClientEvents extends Discord.ClientEvents {
  channelCreate: [Channel]
  channelDelete: [Channel]
  channelPinsUpdate: [Channel, Date]
  channelUpdate: [Channel, Channel]
  emojiCreate: [GuildEmoji]
  emojiDelete: [GuildEmoji]
  emojiUpdate: [GuildEmoji, GuildEmoji]
  guildBanAdd: [Guild, User]
  guildBanRemove: [Guild, User]
  guildCreate: [Guild]
  guildDelete: [Guild]
  guildUnavailable: [Guild]
  guildIntegrationsUpdate: [Guild]
  guildMemberAdd: [GuildMember]
  guildMemberAvailable: [GuildMember]
  guildMemberRemove: [GuildMember]
  guildMembersChunk: [Collection<Snowflake, GuildMember>, Guild]
  guildMemberSpeaking: [GuildMember, Readonly<Speaking>]
  guildMemberUpdate: [GuildMember, GuildMember]
  guildUpdate: [Guild, Guild]
  inviteCreate: [Invite]
  inviteDelete: [Invite]
  message: [Message]
  messageDelete: [Message]
  messageReactionRemoveAll: [Message]
  messageReactionRemoveEmoji: [MessageReaction]
  messageDeleteBulk: [Collection<Snowflake, Message>]
  messageReactionAdd: [MessageReaction, User]
  messageReactionRemove: [MessageReaction, User]
  messageUpdate: [Message, Message]
  presenceUpdate: [Presence | undefined, Presence]
  roleCreate: [Role]
  roleDelete: [Role]
  roleUpdate: [Role, Role]
  typingStart: [Channel, User]
  userUpdate: [User, User]
  voiceStateUpdate: [VoiceState, VoiceState]
  webhookUpdate: [TextChannel]
}

// TODO: mock voice

/** Whether the Discord.js structures have been extended. */
let extended = false

// TODO: more of this
export interface ClientData {
  user?: Partial<Data.ClientUser>
  application?: Partial<Data.ClientApplication>
  guildPreviews?: Partial<Data.GuildPreview>[]
  voiceRegions?: Partial<Data.VoiceRegion>[]
}

export class Client extends Discord.Client {
  channels: ChannelManager
  guilds: GuildManager
  users: UserManager
  ws: WebSocketManager
  user: ClientUser
  readonly _actions: ActionsManager
  readonly _application: ClientApplication
  on!: <K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void) => this
  once!: <K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void) => this
  emit!: <K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]) => boolean
  #guildPreviews: Collection<Snowflake, GuildPreview>
  #voiceRegions: Collection<string, VoiceRegion>
  // @ts-ignore 'presence' is declared but its value is never read.
  private readonly presence: ClientPresence

  // @ts-ignore Private properties
  constructor(
    options?: ClientOptions, {user, application, guildPreviews = [], voiceRegions = defaultVoiceRegions}: ClientData = {}
  ) {
    // TODO: Fix Structures.extend type (shouldn't work for non-extendable types)
    if (!extended) {
      Structures.extend('Guild', () => Guild)
      Structures.extend('TextChannel', () => TextChannel)
      Structures.extend('VoiceChannel', () => VoiceChannel)
      Structures.extend('NewsChannel', () => NewsChannel)
      Structures.extend('CategoryChannel', () => CategoryChannel)
      Structures.extend('StoreChannel', () => StoreChannel)
      Structures.extend('DMChannel', () => DMChannel)
      Structures.extend('Message', () => Message as new (
        client: Client, data: Partial<Data.Message> | undefined, channel: DMChannel | TextChannel
      ) => Message)
      Structures.extend('MessageReaction', () => MessageReaction)
      Structures.extend('GuildMember', () => GuildMember)
      Structures.extend('Role', () => Role)
      Structures.extend('VoiceState', () => VoiceState)
      Structures.extend('Presence', () => Presence)
      Structures.extend('User', () => User)
      extended = true
    }

    // The restSweepInterval: 0 is to stop the RESTManager from setting an interval
    super({...options, restSweepInterval: 0})

    this.channels = new ChannelManager(this)
    this.guilds = new GuildManager(this)
    this.users = new UserManager(this)
    this.presence = new ClientPresence(this)
    this.ws = new WebSocketManager(this)
    // eslint-disable-next-line dot-notation -- actions is private
    this._actions = this['actions'] as ActionsManager

    this.user = new ClientUser(this, user)
    this._application = new ClientApplication(this, application)
    this.#guildPreviews = new Collection(guildPreviews.map(g => {
      const preview = new GuildPreview(this, g)
      return [preview.id, preview]
    }))
    this.#voiceRegions = new Collection(voiceRegions.map(r => {
      const region = new VoiceRegion(r)
      return [region.id, region]
    }))

    // eslint-disable-next-line dot-notation -- triggerClientReady is private
    this.ws['triggerClientReady']()
    this.ws.shards.set(0, new WebSocketShard(this.ws, 0))
  }

  get emojis(): GuildEmojiManager {
    const emojis = new GuildEmojiManager({client: this})
    this.guilds.cache.forEach(guild => {
      if (guild.available) guild.emojis.cache.forEach(emoji => emojis.cache.set(emoji.id, emoji))
    })
    return emojis
  }

  get _usingIntents(): boolean {
    return typeof this.options.ws?.intents != 'undefined'
  }

  /**
   * Obtains an invite.
   *
   * @param invite The invite code or URL.
   * @param data Additional data for the invite.
   * @example
   * client.fetchInvite('https://discord.gg/bRCvFy9')
   *   .then(invite => console.log(`Obtained invite with code: ${invite.code}`))
   */
  async fetchInvite(invite: InviteResolvable, data?: DeepPartial<Data.Invite>): Promise<Invite> {
    const code = DataResolver.resolveInviteCode(invite)
    const _invite = new Invite(this, {
      code,
      ...this.guilds.cache.flatMap(g => g.channels.cache).flatMap(c => c._invites).get(code)?.toData(),
      ...data
    })
    _invite.channel._invites.set(_invite.code, _invite)
    return _invite
  }

  /**
   * Obtains a webhook.
   *
   * @param id The ID of the webhook.
   * @param token The token for the webhook.
   * @param data Additional data for the webhook.
   * @example
   * client.fetchWebhook('id', 'token')
   *   .then(webhook => console.log(`Obtained webhook with name: ${webhook.name}`))
   */
  async fetchWebhook(id: Snowflake, token?: string, data?: Partial<Data.Webhook>): Promise<Webhook> {
    return new Webhook(this, {id, token, ...data} as Partial<Data.Webhook>)
  }

  /**
   * Obtains the available voice regions.
   *
   * @param data Data of the voice regions.
   * @example
   * client.fetchVoiceRegions()
   *   .then(regions => console.log(`Available regions are: ${regions.map(region => region.name).join(', ')}`))
   */
  async fetchVoiceRegions(data?: Partial<Data.VoiceRegion>[]): Promise<Collection<string, VoiceRegion>> {
    if (data) {
      this.#voiceRegions.clear()
      data.forEach(r => {
        const region = new VoiceRegion(r)
        this.#voiceRegions.set(region.id, region)
      })
    }
    return this.#voiceRegions
  }

  /** Obtains the OAuth Application of this bot. */
  async fetchApplication(): Promise<ClientApplication> {
    return this._application
  }

  /**
   * Obtains a guild preview.
   *
   * @param guild The guild to fetch the preview for.
   * @param data Additional data for the preview.
   */
  async fetchGuildPreview(guild: GuildResolvable, data?: Partial<Data.GuildPreview>): Promise<GuildPreview> {
    const id = this.guilds.resolveID(guild)
    if (!id) throw new TypeError('INVALID_TYPE', 'guild', 'GuildResolvable')
    const preview = new GuildPreview(this, {id, ...this.#guildPreviews.get(id)?.toData(), ...data})
    this.#guildPreviews.set(id, preview)
    return preview
  }

  createTestUser(data?: Partial<Data.User>): TestUser
  createTestUser(data: Partial<Data.User>, ...guilds: Guild[]): Promise<TestUser>
  createTestUser(data?: Partial<Data.User>, ...guilds: Guild[]): TestUser | Promise<TestUser> {
    const user = new TestUser(this, data)
    this.users.cache.set(user.id, user)
    return guilds.length
      ? Promise.all(guilds.map(async g => g.addMember(user, {accessToken: 'access token'}))).then(() => user)
      : user
  }

  _hasIntent(intent: IntentsString): boolean {
    return (this.options.ws?.intents === undefined ? new Intents(Intents.ALL) : new Intents(this.options.ws.intents))
      .has(intent)
  }
}
