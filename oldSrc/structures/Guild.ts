import Discord, {Collection, Constants, SystemChannelFlags} from 'discord.js'
import {Error, TypeError} from '../../node_modules/discord.js/src/errors'
import defaults from '../defaults'
import * as Data from '../data'
import {GuildChannelManager} from '../managers/guild/GuildChannelManager'
import {GuildEmojiManager} from '../managers/guild/GuildEmojiManager'
import {GuildMemberManager} from '../managers/guild/GuildMemberManager'
import {PresenceManager} from '../managers/guild/PresenceManager'
import {RoleManager} from '../managers/guild/RoleManager'
import {VoiceStateManager} from '../managers/guild/VoiceStateManager'
import {apiError, mergeDefault, throwPermissionsError} from '../util'
import {GuildAuditLogs} from './GuildAuditLogs'
import {GuildPreview} from './GuildPreview'
import {Integration} from './Integration'
import {Invite} from './Invite'
import {User} from './User'
import {VoiceRegion} from './VoiceRegion'
import {Webhook} from './Webhook'
import type {
  AddGuildMemberOptions, Base64Resolvable, ChannelPosition, ChannelResolvable,
  ExplicitContentFilterLevel, GuildAuditLogsFetchOptions, GuildEditData, GuildEmbedData, GuildMemberResolvable,
  IntegrationData, Role, RolePosition, RoleResolvable, UserResolvable, Snowflake, SystemChannelFlagsResolvable
} from 'discord.js'
import type {Client} from '../client'
import type {ArrayType} from '../util'
import type {Base, Channel, GuildChannel, GuildMember, TextChannel, VoiceChannel, VoiceState} from '.'

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {DefaultMessageNotifications, ExplicitContentFilterLevels, VerificationLevels} = Constants

export interface BanInfo {
  user: User
  // TODO: fix Discord.js return type for fetchBan and fetchBans because reason can be null
  // reason: string | null
  reason: string
}

// TODO: fix Discord.js because fetchEmbed should return GuildChannel | null in the channel property, not
// GuildChannelResolvable | null
export interface GuildWidget extends Discord.GuildEmbedData {
  channel: GuildChannel | null
}

export class Guild extends Discord.Guild implements Base {
  channels = new GuildChannelManager(this)
  members = new GuildMemberManager(this)
  presences = new PresenceManager(this.client)
  roles = new RoleManager(this)
  voiceStates = new VoiceStateManager(this)
  readonly afkChannel!: VoiceChannel | null
  client!: Client
  embedChannel!: GuildChannel | null
  emojis!: GuildEmojiManager
  readonly me!: GuildMember | null
  readonly publicUpdatesChannel!: TextChannel | null
  readonly owner!: GuildMember | null
  readonly rulesChannel!: TextChannel | null
  readonly systemChannel!: TextChannel | null
  readonly voice!: VoiceState
  readonly widgetChannel!: TextChannel
  member!: (user: UserResolvable) => GuildMember | null
  setAFKChannel!: (afkChannel: ChannelResolvable | null, reason?: string) => Promise<Guild>
  setAFKTimeout!: (afkTimeout: number, reason?: string) => Promise<Guild>
  setBanner!: (banner: Base64Resolvable | null, reason?: string) => Promise<Guild>

  setDefaultMessageNotifications!: (
    defaultMessageNotifications: Discord.DefaultMessageNotifications | number,
    reason?: string
  ) => Promise<Guild>

  setExplicitContentFilter!: (explicitContentFilter: ExplicitContentFilterLevel, reason?: string) => Promise<Guild>
  setIcon!: (icon: Base64Resolvable | null, reason?: string) => Promise<Guild>
  setName!: (name: string, reason?: string) => Promise<Guild>
  setOwner!: (owner: GuildMemberResolvable, reason?: string) => Promise<Guild>
  setRegion!: (region: string, reason?: string) => Promise<Guild>
  setSplash!: (splash: Base64Resolvable | null, reason?: string) => Promise<Guild>
  setSystemChannel!: (systemChannel: ChannelResolvable | null, reason?: string) => Promise<Guild>
  setSystemChannelFlags!: (systemChannelFlags: SystemChannelFlagsResolvable, reason?: string) => Promise<Guild>

  #bans = new Collection<Snowflake, BanInfo>()
  #integrations = new Collection<Snowflake, Integration>()
  readonly #logs: GuildAuditLogs
  #vanityCode?: string
  #voiceRegions = new Collection<string, VoiceRegion>()
  #widget: GuildWidget = {enabled: false, channel: null}

  // @ts-ignore Can't use private properties if super isn't the first call
  constructor(client: Client, data?: Partial<Data.Guild>, auditLogs?: Partial<Data.AuditLog>) {
    const mergedData = mergeDefault(defaults.guild, data)
    super(client, mergedData)

    // Initialise data for new managers
    if (mergedData.channels as Data.GuildChannel[] | undefined) {
      this.channels.cache.clear()
      mergedData.channels.forEach(rawChannel =>
        (this.client.channels.add as (data: Data.Channel, guild?: Guild, cache?: boolean) => Channel | null)(
          rawChannel, this
        ))
    }
    if (mergedData.roles as Data.Role[] | undefined) {
      this.roles.cache.clear()
      mergedData.roles.forEach(role => this.roles.add(role))
    }
    if (mergedData.members as Data.GuildMember[] | undefined) {
      this.members.cache.clear()
      mergedData.members.forEach(guildUser => this.members.add(guildUser))
    }
    if (mergedData.presences as Data.Presence[] | undefined)
      mergedData.presences.forEach(presence => this.presences.add({...presence, guild: this} as Data.Presence))
    if (mergedData.voice_states as Data.VoiceState[] | undefined) {
      this.voiceStates.cache.clear()
      mergedData.voice_states.forEach(voiceState => this.voiceStates.add(voiceState))
    }

    this.#logs = new GuildAuditLogs(this, auditLogs)
  }

  /**
   * Fetches this guild.
   *
   * @param data Optional data to update the guild with.
   */
  async fetch(data?: Partial<Data.Guild>): Promise<this> {
    if (data) this._patch(mergeDefault(this.toData(), data))
    return this
  }

  /**
   * Fetches information on a banned user from this guild.
   *
   * @param user  The User to fetch the ban info of.
   * @param data Optional data for the ban. If `false`, an 'Unknown ban' `DiscordAPIError` error will be thrown.
   */
  async fetchBan(
    user: UserResolvable, data: {ban?: Partial<Omit<Data.Ban, 'user'>>, user?: Partial<Omit<Data.User, 'id'>>} | false = {}
  ): Promise<BanInfo> {
    const id = this.client.users.resolveID(user)
    if (!id) throw new Error('FETCH_BAN_RESOLVE_ID')
    if (data === false) apiError('UNKNOWN_BAN', `/guilds/${this.id}/bans/${id}`, 'get')
    const ban = {
      reason: data.ban?.reason ?? '',
      user: this.client.users.resolve(user) ?? this.client.users.add(mergeDefault(defaults.user, {...data.user, id}))
    }
    this.#bans.set(id, ban)
    return ban
  }

  /**
   * Fetches a collection of banned users in this guild.
   *
   * @param data The data for the bans from Discord.
   */
  async fetchBans(
    data?: Partial<Data.Ban | BanInfo>[] | Collection<Snowflake, BanInfo>
  ): Promise<Collection<Snowflake, BanInfo>> {
    if (data) {
      this.#bans = Array.isArray(data)
        ? new Collection(data.map(b => {
          let ban: BanInfo
          if (b.user instanceof User) ban = {reason: null, ...b} as BanInfo
          else {
            const merged = mergeDefault(defaults.ban, b)
            ban =
              {...merged, user: this.client.users.resolve(merged.user.id) ?? this.client.users.add(merged.user)} as BanInfo
          }
          return [ban.user.id, ban]
        }))
        : data
    }
    return this.#bans
  }

  /**
   * Fetches a collection of integrations to this guild.
   * Resolves with a collection mapping integrations by their ids.
   *
   * @param data The data for the integrations from Discord.
   * @example
   * // Fetch integrations
   * guild.fetchIntegrations()
   *   .then(integrations => console.log(`Fetched ${integrations.size} integrations`))
   *   .catch(console.error)
   */
  async fetchIntegrations(
    data?: Partial<Data.Integration>[] | Collection<Snowflake, Integration>
  ): Promise<Collection<string, Integration>> {
    if (data) {
      this.#integrations = Array.isArray(data)
        ? new Collection(data.map(i => {
          const integration = new Integration(this.client, this, mergeDefault(defaults.integration, i))
          return [integration.id, integration]
        }))
        : data
    }
    return this.#integrations
  }

  /**
   * Creates an integration by attaching an integration object.
   *
   * @param data The data for the integration.
   * @param reason The reason for creating the integration.
   */
  async createIntegration(data: IntegrationData, reason?: string): Promise<this> {
    throwPermissionsError(this.me, 'MANAGE_GUILD', `/guilds/${this.id}/integrations`, 'post')
    const integration =
      new Integration(this.client, this, mergeDefault(defaults.integration, {...data, user: this.client.user.toData()}))
    this.#integrations.set(integration.id, integration)
    if (this.client._hasIntent('GUILD_INTEGRATIONS')) {
      this.client.ws._handlePacket({
        t: 'GUILD_INTEGRATIONS_UPDATE',
        d: {guild_id: this.id}
      })
    }
    this._addLog({
      action_type: Data.AuditLogEvent.INTEGRATION_CREATE,
      target_id: integration.id,
      user_id: this.client.user.id,
      reason,
      changes: [
        {key: 'name', new_value: integration.name},
        {key: 'type', new_value: integration.type},
        {key: 'expire_behavior', new_value: integration.expireBehavior},
        {key: 'expire_grace_period', new_value: integration.expireGracePeriod}
      ]
    })
    return this
  }

  /**
   * Fetches a collection of invites to this guild.
   *
   * @param data The data of this guild's invites returned from Discord. If this is supplied, it will overwrite all the
   * invites for this guild's channels.
   * @returns A collection mapping invites by their codes.
   * @example
   * // Fetch invites
   * guild.fetchInvites()
   *   .then(invites => console.log(`Fetched ${invites.size} invites`))
   *   .catch(console.error)
   * @example
   * // Fetch invite creator by their id
   * guild.fetchInvites()
   *  .then(invites => console.log(invites.find(invite => invite.inviter.id === '84484653687267328')))
   *  .catch(console.error)
   */
  async fetchInvites(
    data?: (Partial<Omit<Data.InviteWithMetadata, 'guild'>> & {
      channel: Partial<Pick<Data.GuildChannel, 'id' | 'type' | 'name'>> & Pick<Data.GuildChannel, 'id'>
    })[]
  ): Promise<Collection<string, Invite>> {
    if (data) {
      this.channels.cache.forEach(c => c._invites.clear())
      data.forEach(i => {
        const channel = this.channels.resolve(i.channel.id)
        if (channel) {
          const invite = new Invite(this.client, i)
          channel._invites.set(invite.code, invite)
        }
      })
    }
    return new Collection(
      (await Promise.all(this.channels.cache.map(async c => c.fetchInvites()))).flatMap(c => [...c.entries()])
    )
  }

  /**
   * Obtains a guild preview for this guild from Discord, only available for public guilds.
   *
   * @param data The data of the guild preview from Discord.
   */
  async fetchPreview(data?: Partial<Omit<Data.GuildPreview, keyof Data.Guild>>): Promise<GuildPreview> {
    if (!this.features.includes('PUBLIC')) apiError('UNKNOWN_GUILD', `/guilds/${this.id}/preview`, 'get')
    return new GuildPreview(this.client, {...data, ...this.toData()})
  }

  /**
   * Fetches the vanity url invite code to this guild.
   *
   * @returns A string matching the vanity url invite code, not the full url.
   * @example
   * // Fetch invites
   * guild.fetchVanityCode()
   *   .then(code => console.log(`Vanity URL: https://discord.gg/${code}`))
   *   .catch(console.error)
   */
  async fetchVanityCode(data?: string): Promise<string> {
    if (!this.features.includes('VANITY_URL')) throw new Error('VANITY_URL')
    if (typeof data != 'undefined') this.#vanityCode = data
    return this.#vanityCode ?? 'abc'
  }

  /**
   * Fetches all webhooks for the guild.
   *
   * @param data The data of this guild's webhooks returned from Discord. If this is supplied, it will overwrite all the
   * webhooks for this guild's text channels.
   * @example
   * // Fetch webhooks
   * guild.fetchWebhooks()
   *   .then(webhooks => console.log(`Fetched ${webhooks.size} webhooks`))
   *   .catch(console.error)
   */
  async fetchWebhooks(
    data?: (Partial<Omit<Data.Webhook, 'guild_id'>> & Pick<Data.Webhook, 'channel_id'>)[]
  ): Promise<Collection<Snowflake, Webhook>> {
    const textChannels = this.channels.cache.filter(c => c.type === 'text') as Collection<Snowflake, TextChannel>
    if (data) {
      textChannels.forEach(c => c._webhooks.clear())
      data.forEach(w => {
        const channel = this.channels.resolve(w.channel_id)
        if (channel?.type === 'text') {
          const webhook = new Webhook(this.client, w)
          channel._webhooks.set(webhook.id, webhook)
        }
      })
    }
    return new Collection((await Promise.all(textChannels.map(async c => c.fetchWebhooks()))).flatMap(c => [...c.entries()]))
  }

  /**
   * Fetches the available voice regions.
   *
   * @param data The data of the voice regions returned from Discord.
   */
  async fetchVoiceRegions(
    data?: Data.VoiceRegion[] | Collection<string, VoiceRegion>
  ): Promise<Collection<string, VoiceRegion>> {
    if (data) {
      this.#voiceRegions = Array.isArray(data)
        ? new Collection(data.map(r => {
          const region = new VoiceRegion(r)
          return [region.id, region]
        }))
        : data
    }
    return this.#voiceRegions
  }

  /**
   * Fetches the guild embed/widget.
   *
   * @example
   * // Fetches the guild embed
   * guild.fetchEmbed()
   *   .then(embed => console.log(`The embed is ${embed.enabled ? 'enabled' : 'disabled'}`))
   *   .catch(console.error)
   */
  async fetchEmbed(data?: GuildEmbedData): Promise<GuildWidget> {
    throwPermissionsError(this.me, 'MANAGE_GUILD', `/guilds/${this.id}/embed`, 'get')
    if (data) {
      this.#widget = {
        enabled: data.enabled,
        channel: data.channel == null ? data.channel : this.channels.resolve(data.channel)
      }
    }
    return this.#widget
  }

  /**
   * Fetches audit logs for this guild.
   *
   * @param options Options for fetching audit logs.
   * @example
   * // Output audit log entries
   * guild.fetchAuditLogs()
   *   .then(audit => console.log(audit.entries.first()))
   *   .catch(console.error)
   */
  async fetchAuditLogs(options: GuildAuditLogsFetchOptions = {}): Promise<GuildAuditLogs> {
    const path = `/guilds/${this.id}/audit-logs`
    const method = 'get'
    throwPermissionsError(this.me, 'VIEW_AUDIT_LOG', path, method)

    const before = options.before instanceof Discord.GuildAuditLogs.Entry ? options.before.id : options.before
    const user = options.user === undefined ? null : this.client.users.resolveID(options.user)
    const {limit} = options
    if (limit !== undefined) {
      if (limit < 1) {
        apiError(
          'INVALID_FORM_BODY',
          path,
          method,
          {limit: {_errors: [{code: 'NUMBER_TYPE_MIN', message: 'int value should be greater than or equal to 1.'}]}}
        )
      }
      if (limit > 100) {
        apiError(
          'INVALID_FORM_BODY',
          path,
          method,
          {limit: {_errors: [{code: 'NUMBER_TYPE_MAX', message: 'int value should be less than or equal to 100.'}]}}
        )
      }
    }

    let {entries} = this.#logs
    if (before) entries = entries.filter(e => e.id < before)
    if (user) entries = entries.filter(e => e.executor.id === user)
    if (limit !== undefined)
      entries = new Collection([...entries.sorted((a, b) => Number(b.id) - Number(a.id)).entries()].slice(0, limit))

    const logs = new GuildAuditLogs(this)
    logs.entries = entries
    return logs
  }

  /**
   * Adds a user to the guild using OAuth2. Requires the `CREATE_INSTANT_INVITE` permission.
   *
   * @param user The user to add to the guild.
   * @param options Options for the addition.
   * @param data The data of the guild member returned by Discord.
   */
  async addMember(
    user: UserResolvable, {accessToken, nick, roles, mute, deaf}: AddGuildMemberOptions, data?: Data.GuildMember
  ): Promise<GuildMember> {
    const resolvedUser = this.client.users.resolve(user)
    if (!resolvedUser) throw new TypeError('INVALID_TYPE', 'user', 'UserResolvable')
    if (this.members.cache.has(resolvedUser.id)) return this.members.cache.get(resolvedUser.id)!
    const resolvedRoles = (roles?.map as (<T>(fn: (value: Role | RoleResolvable) => T) => T[]) | undefined)?.(
      r => this.roles.resolveID(r)
    )
    if (resolvedRoles?.some(r => !r))
      throw new TypeError('INVALID_TYPE', 'options.roles', 'Array or Collection of Roles or Snowflakes', true)

    const path = `/guilds/${this.id}/members/${resolvedUser.id}`
    const method = 'put'
    throwPermissionsError(this.me, 'CREATE_INSTANT_INVITE', path, method)
    if (!accessToken) {
      apiError(
        'INVALID_FORM_BODY',
        path,
        method,
        {access_token: {_errors: [{code: 'BASE_TYPE_REQUIRED', message: 'This field is required'}]}}
      )
    }

    const merged = mergeDefault(defaults.guildMember, data)
    const memberData = {
      ...merged,
      user: resolvedUser.toData(),
      guild_id: this.id
    }
    if (nick && this.me?.hasPermission('MANAGE_NICKNAMES')) memberData.nick = nick
    if (resolvedRoles && this.me?.hasPermission('MANAGE_ROLES')) memberData.roles = resolvedRoles as Snowflake[]
    if (mute && this.me?.hasPermission('MUTE_MEMBERS')) memberData.mute = mute
    if (deaf && this.me?.hasPermission('DEAFEN_MEMBERS')) memberData.deaf = deaf

    if (this.client._hasIntent('GUILD_MEMBERS'))
      this.client.ws._handlePacket({t: 'GUILD_MEMBER_ADD', d: memberData}, this.client.ws.shards.first())
    const member = this.members.add(memberData)
    member.user = resolvedUser
    return member
  }

  // Must disable this rule because it warns because of 'e.g.' (full stops makes it think it's the end of a sentence)
  /* eslint-disable jsdoc/require-description-complete-sentence -- see above */
  /**
   * Updates the guild with new information - e.g. a new name.
   *
   * @param data The data to update the guild with.
   * @param reason The reason for editing this guild.
   * @example
   * // Set the guild name and region
   * guild.edit({
   *   name: 'Discord Guild',
   *   region: 'london'
   * })
   *   .then(updated => console.log(`New guild name ${updated} in region ${updated.region}`))
   *   .catch(console.error)
   */
  /* eslint-enable jsdoc/require-description-complete-sentence -- see above */
  async edit(data: GuildEditData, reason?: string): Promise<Guild> {
    throwPermissionsError(this.me, 'MANAGE_GUILD', `/guilds/${this.id}`, 'patch')

    const oldData = this.toData()
    const newData = {...oldData}
    const changes: Data.GuildUpdateEntry['changes'] = []

    type AuditLogKeys = ArrayType<Data.GuildUpdateEntry['changes']>['key']
    type DataKeys = {[K in AuditLogKeys]: K extends 'icon_hash' ? 'icon' : K extends 'splash_hash' ? 'splash' : K}
    const addChange: {
      (key: Exclude<AuditLogKeys, 'icon_hash' | 'splash_hash'>): void
      <T extends 'icon_hash' | 'splash_hash'>(key: T, newKey: DataKeys[T]): void
    } = <T extends AuditLogKeys>(key: T, dataKey = key as unknown as DataKeys[T]): void => {
      changes.push({
        key, old_value: oldData[dataKey] ?? undefined, new_value: newData[dataKey]!
      } as ArrayType<typeof changes>)
    }

    if (data.name) {
      newData.name = data.name
      addChange('name')
    }
    if (data.region) {
      newData.region = data.region
      addChange('region')
    }
    if (data.verificationLevel !== undefined) {
      newData.verification_level = typeof data.verificationLevel === 'number'
        ? data.verificationLevel
        : VerificationLevels.indexOf(data.verificationLevel)
      addChange('verification_level')
    }
    if (data.afkChannel !== undefined) {
      newData.afk_channel_id = this.client.channels.resolveID(data.afkChannel)!
      addChange('afk_channel_id')
    }
    if (data.systemChannel !== undefined) {
      newData.system_channel_id = this.client.channels.resolveID(data.systemChannel)!
      addChange('system_channel_id')
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- what it is in Discord.js
    if (data.afkTimeout) {
      newData.afk_timeout = Number(data.afkTimeout)
      addChange('afk_timeout')
    }
    if (data.icon !== undefined) {
      // TODO: images
      // in rest/APIRequest the data is stringified, which means buffers aren't properly converted to base64
      // TODO: Fix this in Discord.js
      newData.icon = JSON.stringify(data.icon)
      addChange('icon_hash', 'icon')
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- what it is in Discord.js
    if (data.owner) {
      newData.owner_id = this.client.users.resolveID(data.owner) ?? this.ownerID
      addChange('owner_id')
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- what it is in Discord.js
    if (data.splash) {
      newData.splash = JSON.stringify(data.splash)
      addChange('splash_hash', 'splash')
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- what it is in Discord.js
    if (data.banner) newData.banner = JSON.stringify(data.banner)
    if (data.explicitContentFilter !== undefined) {
      newData.explicit_content_filter = typeof data.explicitContentFilter === 'number'
        ? data.explicitContentFilter
        : ExplicitContentFilterLevels.indexOf(data.explicitContentFilter)
      addChange('explicit_content_filter')
    }
    if (data.defaultMessageNotifications !== undefined) {
      newData.default_message_notifications = typeof data.defaultMessageNotifications === 'string'
        ? DefaultMessageNotifications.indexOf(data.defaultMessageNotifications)
        : data.defaultMessageNotifications
      addChange('default_message_notifications')
    }
    if (data.systemChannelFlags !== undefined)
      newData.system_channel_flags = SystemChannelFlags.resolve(data.systemChannelFlags)

    if (changes.length) {
      this._addLog({
        action_type: Data.AuditLogEvent.GUILD_UPDATE,
        target_id: this.id,
        user_id: this.client.user.id,
        reason,
        changes
      })
    }

    return this.client._actions.GuildUpdate.handle(newData).updated
  }

  /**
   * Batch-updates the guild's channels' positions.
   *
   * @param channelPositions The channel positions to update.
   * @example
   * guild.setChannelPositions([{channel: channelID, position: newChannelIndex}])
   *   .then(guild => console.log(`Updated channel positions for ${guild}`))
   *   .catch(console.error)
   */
  async setChannelPositions(channelPositions: ChannelPosition[]): Promise<Guild> {
    return this.client._actions.GuildChannelsPositionUpdate.handle({
      guild_id: this.id,
      channels: channelPositions.map(({channel, position}) => ({id: this.client.channels.resolveID(channel)!, position}))
    }).guild
  }

  /**
   * Batch-updates the guild's role positions.
   *
   * @param rolePositions The role positions to update.
   * @example
   * guild.setRolePositions([{role: roleID, position: updatedRoleIndex}])
   *  .then(guild => console.log(`Role permissions updated for ${guild}`))
   *  .catch(console.error)
   */
  async setRolePositions(rolePositions: RolePosition[]): Promise<Guild> {
    return this.client._actions.GuildRolesPositionUpdate.handle({
      guild_id: this.id,
      roles: rolePositions.map(({role, position}) => ({id: this.roles.resolveID(role)!, position}))
    }).guild
  }

  /**
   * Edits the guild's embed/widget.
   *
   * @param embed The embed for the guild.
   * @param reason The reason for changing the guild's embed.
   */
  async setEmbed(embed: GuildEmbedData, reason?: string): Promise<this> {
    const changes: Data.GuildUpdateEntry['changes'] = []
    if (embed.enabled !== this.#widget.enabled)
      changes.push({key: 'widget_enabled', old_value: this.#widget.enabled, new_value: embed.enabled})

    const channel = embed.channel == null ? embed.channel : this.channels.resolve(embed.channel)
    if (channel?.id !== this.#widget.channel?.id) {
      const change: {key: 'widget_channel_id', old_value?: string, new_value?: string} = {key: 'widget_channel_id'}
      if (this.#widget.channel?.id) change.old_value = this.#widget.channel.id
      if (channel?.id) change.new_value = channel.id
      changes.push(change as ArrayType<Data.GuildUpdateEntry['changes']>)
    }

    if (changes.length) {
      this._addLog({
        action_type: Data.AuditLogEvent.GUILD_UPDATE,
        target_id: this.id,
        user_id: this.client.user.id,
        reason,
        changes
      })
    }

    this.#widget = {enabled: embed.enabled, channel}
    return this
  }

  /**
   * Leaves the guild.
   *
   * @example
   * // Leave a guild
   * guild.leave()
   *   .then(g => console.log(`Left the guild ${g}`))
   *   .catch(console.error)
   */
  async leave(): Promise<Guild> {
    if (this.ownerID === this.client.user.id) throw new Error('GUILD_OWNED')
    return this.client._actions.GuildDelete.handle({id: this.id}).guild!
  }

  async delete(): Promise<Guild> {
    return this.client._actions.GuildDelete.handle({id: this.id}).guild!
  }

  toData(): Data.Guild {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      splash: this.splash,
      owner: this.ownerID === this.client.user.id,
      owner_id: this.ownerID,
      region: this.region,
      afk_channel_id: this.afkChannelID,
      afk_timeout: this.afkTimeout,
      embed_enabled: this.embedEnabled,
      embed_channel_id: this.embedChannelID,
      verification_level: Data.VerificationLevel[this.verificationLevel],
      default_message_notifications: typeof this.defaultMessageNotifications == 'string'
        ? Data.DefaultMessageNotificationLevel[this.defaultMessageNotifications === 'ALL' ? 'ALL_MESSAGES' : 'ONLY_MENTIONS']
        : this.defaultMessageNotifications,
      explicit_content_filter: Data.ExplicitContentFilterLevel[this.explicitContentFilter],
      roles: this.roles.cache.map(role => role.toData()),
      emojis: this.emojis.cache.map(emoji => emoji.toData()),
      features: this.features,
      mfa_level: this.mfaLevel,
      application_id: this.applicationID,
      widget_enabled: this.widgetEnabled ?? undefined,
      widget_channel_id: this.widgetChannelID,
      system_channel_id: this.systemChannelID,
      system_channel_flags: this.systemChannelFlags.bitfield,
      rules_channel_id: this.rulesChannelID,
      max_presences: this.maximumPresences,
      max_members: this.maximumMembers ?? undefined,
      vanity_url_code: this.vanityURLCode,
      description: this.description,
      banner: this.banner,
      premium_tier: this.premiumTier,
      premium_subscription_count: this.premiumSubscriptionCount ?? undefined,
      public_updates_channel_id: this.publicUpdatesChannelID
    }
  }

  _addLog(data?: Partial<Data.AuditLogEntry>): void {
    const entry = new GuildAuditLogs.Entry(this.#logs, this, {...data, reason: data?.reason?.slice(0, 512)})
    this.#logs.entries.set(entry.id, entry)
  }

  protected _patch(data: Data.Guild): void {
    // @ts-ignore Can't do type assertions with super
    (super._patch as (data: Data.Guild) => void)(data)
    if (Object.getPrototypeOf(this.emojis) === Discord.GuildEmojiManager.prototype)
      this.emojis = new GuildEmojiManager(this, data.emojis)
  }
}
