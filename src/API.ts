import {SnowflakeUtil} from 'discord.js'
import {defaultChannels, defaultVoiceRegions, defaults} from './defaults'
import {AuditLog, ChannelType} from './discord'
import {error, errors, formBodyErrors, invalidFormBodyError} from './errors'
import {resolveCollection} from './utils'
import type {
  Collection,
  NewsChannel,
  PermissionResolvable,
  TextChannel,
  Snowflake
} from 'discord.js'
import type Client from './Client'
// eslint-disable-next-line import/no-named-default -- type imports
import type {default as Data, ResolvedGuild} from './Data'
import type {
  Channel,
  ClientApplication,
  ClientUser,
  CreateGuildParams,
  CreateGuildChannelParams,
  CreateGuildEmojiParams,
  DMChannel,
  Guild,
  GuildChannel,
  GuildEmoji,
  GuildPreview,
  Invite,
  Packet,
  Role,
  VoiceRegion,
  Webhook
} from './discord'
import type {FormBodyErrors, Method} from './errors'
import type {ArrayType, DOmit, RequiredPick} from './utils'

export default class API {
  readonly oauth2 = {
    applications: (_: '@me') => ({
      get: async (): Promise<ClientApplication> => this.#application
    }),
    authorize: '/oauth2/authorize'
  }

  readonly voice = {
    regions: {
      get: async (): Promise<VoiceRegion[]> => this.#voiceRegions.array()
    }
  }

  readonly #application: ClientApplication
  readonly #client: Client
  readonly #dmChannels: Collection<Snowflake, DMChannel>
  readonly #guilds: Collection<Snowflake, ResolvedGuild>
  readonly #invites: Collection<string, Invite>
  readonly #webhooks: Collection<Snowflake, Webhook>
  readonly #voiceRegions: Collection<string, VoiceRegion>

  // eslint-disable-next-line max-lines-per-function
  constructor(
    client: Client,
    {
      application,
      dmChannels = [],
      invites = [],
      webhooks = [],
      voiceRegions = defaultVoiceRegions
    }: Data,
    guilds: Collection<Snowflake, ResolvedGuild>
  ) {
    this.#client = client
    this.#application = defaults.clientApplication(application)
    this.#dmChannels = resolveCollection(dmChannels, 'id', 'dmChannel')
    this.#guilds = guilds
    this.#invites = resolveCollection(invites, 'code', 'inviteWithMetadata')
    this.#webhooks = resolveCollection(webhooks, 'id', 'webhook')
    this.#voiceRegions = resolveCollection(voiceRegions, 'id', 'voiceRegion')

    // https://discord.com/developers/docs/resources/guild#create-guild
    // eslint-disable-next-line complexity, max-statements
    ;(this.guilds as {post?: any}).post = async ({
      data: {
        name,
        region,
        icon,
        verification_level,
        default_message_notifications,
        explicit_content_filter,
        roles,
        channels,
        afk_channel_id,
        afk_timeout,
        system_channel_id
      }
    }: {
      data: CreateGuildParams
    }): Promise<Guild> => {
      // Errors
      const path = '/guilds'
      const method: Method = 'post'
      if (this.#client.guilds.cache.size >= 10)
        error(errors.MAXIMUM_GUILDS, path, method)

      const validTypes = [
        ChannelType.GUILD_TEXT,
        ChannelType.GUILD_VOICE,
        ChannelType.GUILD_CATEGORY
      ]
      const channelErrors = channels?.reduce<FormBodyErrors>(
        (_errors, {type}, i) =>
          type !== undefined && !validTypes.includes(type)
            ? {
                ..._errors,
                [i]: {
                  type: {
                    _errors: [formBodyErrors.BASE_TYPE_CHOICES(validTypes)]
                  }
                }
              }
            : _errors,
        {}
      )
      const errors1: FormBodyErrors = {
        ...(name.length < 2 || name.length > 100
          ? {name: {_errors: [formBodyErrors.BASE_TYPE_BAD_LENGTH(2, 100)]}}
          : {}),
        ...(channelErrors &&
          (Object.keys(channelErrors).length ? {channels: channelErrors} : {}))
      }
      if (Object.keys(errors1).length)
        error(errors.INVALID_FORM_BODY, path, method, errors1)

      channels?.forEach(({parent_id}, i) => {
        if (parent_id != null) {
          const parent = channels.find(({id}) => id === parent_id)
          if (!parent) {
            invalidFormBodyError(path, method, {
              channels: [
                formBodyErrors.GUILD_CREATE_CHANNEL_ID_INVALID(parent_id)
              ]
            })
          }
          if (parent.type !== ChannelType.GUILD_CATEGORY) {
            invalidFormBodyError(path, method, {
              channels: [formBodyErrors.CHANNEL_PARENT_INVALID_TYPE]
            })
          }
          if (channels.indexOf(parent) > i) {
            invalidFormBodyError(path, method, {
              channels: [formBodyErrors.GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST]
            })
          }
        }
      })

      type Channel = ArrayType<NonNullable<typeof channels>>
      let afkChannel: Channel | undefined
      if (afk_channel_id !== undefined) {
        afkChannel = channels?.find(({id}) => id === afk_channel_id)
        if (afkChannel && afkChannel.type !== ChannelType.GUILD_VOICE) {
          invalidFormBodyError(path, method, {
            channels: [formBodyErrors.GUILD_CREATE_AFK_CHANNEL_NOT_GUILD_VOICE]
          })
        }
      }
      let systemChannel: Channel | undefined
      if (system_channel_id !== undefined) {
        systemChannel = channels?.find(({id}) => id === system_channel_id)
        if (
          systemChannel &&
          (systemChannel.type ?? ChannelType.GUILD_TEXT) !==
            ChannelType.GUILD_TEXT
        ) {
          invalidFormBodyError(path, method, {
            channels: [
              formBodyErrors.GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT
            ]
          })
        }
      }

      // Data
      // channels is empty: default channels with system channel id
      // permission overwrites: if type is member and id is role type ignored
      // invalid id: permission overwrite ignored
      const _data = defaults.fullGuild({
        name,
        icon,
        region,
        verification_level,
        default_message_notifications,
        explicit_content_filter,
        owner: true,
        owner_id: this.#client.user.id,
        members: [{user: this.#clientUser()}],
        application_id: this.#application.id,
        afk_timeout
      })
      let _roles: Role[]
      let roleMap: Map<number, Snowflake> | undefined
      if (!roles || !roles.length)
        _roles = [defaults.role({id: _data.id, name: '@everyone'})]
      else {
        roleMap = new Map([
          ...(roles[0].id === undefined
            ? []
            : [[roles[0].id, _data.id] as const]),
          ...roles
            .slice(1)
            .filter(
              (role): role is RequiredPick<typeof role, 'id'> =>
                role.id !== undefined
            )
            .map(role => [role.id, SnowflakeUtil.generate()] as const)
        ])
        _roles = [
          defaults.role({...roles[0], id: _data.id, name: '@everyone'}),
          ...roles.slice(1).map(({id, ...rest}) =>
            defaults.role({
              ...rest,
              id: id === undefined ? SnowflakeUtil.generate() : roleMap?.get(id)
            })
          )
        ]
      }

      let _channels: GuildChannel[]
      if (!channels || !channels.length) _channels = defaultChannels(_data.id)
      else {
        const channelMap = new Map(
          channels
            .filter(
              (channel): channel is RequiredPick<Channel, 'id'> =>
                channel.id !== undefined
            )
            .map(channel => [channel.id, SnowflakeUtil.generate()])
        )
        _channels = channels.map(
          ({id, parent_id, permission_overwrites, ...rest}) =>
            defaults.guildChannel({
              ...rest,
              id:
                id === undefined
                  ? SnowflakeUtil.generate()
                  : channelMap.get(id),
              parent_id:
                parent_id == null ? parent_id : channelMap.get(parent_id),
              permission_overwrites: roleMap
                ? permission_overwrites
                    ?.filter(
                      (
                        overwrite
                      ): overwrite is RequiredPick<typeof overwrite, 'id'> =>
                        overwrite.id !== undefined && roleMap!.has(overwrite.id)
                    )
                    .map(overwrite => ({
                      ...overwrite,
                      type: 'role',
                      id: roleMap!.get(overwrite.id)
                    }))
                : []
            })
        )
      }

      const data = {
        ..._data,
        channels: _channels,
        roles: _roles
      }

      // Gateway
      this.#emitPacket('GUILD_CREATE', data)

      return data
    }
  }

  channels(id: Snowflake) {
    return {
      // https://discord.com/developers/docs/resources/channel#get-channel
      get: async (): Promise<Channel> => {
        const channel =
          // eslint-disable-next-line unicorn/prefer-flat-map -- Collection so flatMap requires g.channels to be a Collection
          this.#guilds
            .map(g => g.channels)
            .flat()
            .find(c => c.id === id) ?? this.#dmChannels.get(id)
        if (!channel) error(errors.UNKNOWN_CHANNEL, `/channels/${id}`, 'get')
        return channel
      }
    }
  }

  guilds(id: Snowflake) {
    const guild = this.#guilds.get(id)
    const _path = (path?: string): string =>
      `/guilds/${id}${path === undefined ? '' : `/${path}`}`
    return {
      channels: {
        // https://discord.com/developers/docs/resources/guild#create-guild-channel
        post: async ({
          data: {
            name,
            type = ChannelType.GUILD_TEXT,
            topic,
            nsfw,
            bitrate,
            user_limit,
            parent_id,
            position,
            permission_overwrites,
            rate_limit_per_user
          },
          reason
        }: {
          data: CreateGuildChannelParams
          reason?: string
        }): Promise<GuildChannel> => {
          // Errors
          const path = _path('channels')
          const method: Method = 'post'
          const validTypes = [
            ChannelType.GUILD_TEXT,
            ChannelType.GUILD_VOICE,
            ChannelType.GUILD_CATEGORY,
            ChannelType.GUILD_STORE
          ]
          if (!name || !validTypes.includes(type)) {
            invalidFormBodyError(path, method, {
              ...(name ? {} : {name: [formBodyErrors.BASE_TYPE_REQUIRED]}),
              ...(validTypes.includes(type)
                ? {}
                : {type: [formBodyErrors.BASE_TYPE_CHOICES(validTypes)]})
            })
          }
          this.#checkPermissions(id, 'MANAGE_CHANNELS', path, method)

          // Data
          const data = defaults.guildChannel({
            type,
            position,
            permission_overwrites,
            name:
              type === ChannelType.GUILD_TEXT
                ? name.replace(/s+/gu, '-').toLowerCase()
                : name,
            parent_id,
            topic,
            nsfw,
            rate_limit_per_user,
            bitrate,
            user_limit,
            guild_id: id
          })
          guild!.channels.push(data)

          // Audit log
          type Change = ArrayType<AuditLog.ChannelCreateEntry['changes']>
          const keys: Change['key'][] = [
            'topic',
            'bitrate',
            'nsfw',
            'rate_limit_per_user'
          ]
          this.#addLog(id, {
            action_type: AuditLog.Event.CHANNEL_CREATE,
            target_id: data.id,
            user_id: this.#client.user.id,
            reason,
            changes: [
              {key: 'name', new_value: data.name},
              {key: 'type', new_value: data.type},
              {key: 'position', new_value: data.position},
              ...(data.permission_overwrites
                ? [
                    {
                      key: 'permission_overwrites',
                      new_value: data.permission_overwrites
                    } as const
                  ]
                : []),
              ...keys.flatMap(k =>
                (data as {[K in typeof k]?: unknown})[k] == null
                  ? []
                  : ({
                      key: k,
                      new_value: (data as {[K in typeof k]?: unknown})[k]
                    } as ArrayType<AuditLog.ChannelCreateEntry['changes']>)
              )
            ]
          })

          // Gateway
          this.#emitPacket('CHANNEL_CREATE', data)

          return data
        }
      },

      emojis: {
        // https://discord.com/developers/docs/resources/emoji#create-guild-emoji
        post: async ({
          data: {name, image, roles},
          reason
        }: {
          data: CreateGuildEmojiParams
          reason?: string
        }): Promise<GuildEmoji> => {
          // Errors
          const path = _path('emojis')
          const method: Method = 'post'
          const _errors = {
            ...(Buffer.byteLength(image) > 256_000
              ? {}
              : {
                  image: [formBodyErrors.BINARY_TYPE_MAX_SIZE('256.0 kb')]
                }),
            ...(name
              ? name.length < 2 || name.length > 32
                ? {name: [formBodyErrors.BASE_TYPE_BAD_LENGTH(2, 32)]}
                : {}
              : {name: [formBodyErrors.BASE_TYPE_REQUIRED]})
          }
          if (Object.keys(_errors).length)
            invalidFormBodyError(path, method, _errors)
          this.#checkPermissions(id, 'MANAGE_EMOJIS', path, method)

          // Data
          const data = defaults.guildEmoji({
            name,
            roles,
            user: this.#clientUser()
          })
          guild!.emojis.push(data)

          // Audit log
          this.#addLog(id, {
            action_type: AuditLog.Event.EMOJI_CREATE,
            target_id: data.id,
            user_id: this.#client.user.id,
            reason,
            changes: [{key: 'name', new_value: data.name}]
          })

          // Gateway
          this.#emitPacket('GUILD_EMOJIS_UPDATE', {
            guild_id: id,
            emojis: guild!.emojis
          })

          return data
        }
      },

      preview: {
        // https://discord.com/developers/docs/resources/guild#get-guild-preview
        get: async (): Promise<GuildPreview> => {
          if (!guild) error(errors.UNKNOWN_GUILD, _path('preview'), 'get')
          const {
            name,
            icon,
            splash,
            features,
            description,
            discovery_splash,
            approximate_member_count,
            approximate_presence_count
          } = guild
          return {
            id,
            name,
            icon,
            splash,
            features,
            description,
            discovery_splash,
            approximate_member_count,
            approximate_presence_count,
            emojis: guild.emojis.map(({user, ...e}) => e)
          }
        }
      }
    }
  }

  invites(code: string) {
    return {
      // https://discord.com/developers/docs/resources/invite#get-invite
      get: async (_: {query: {with_counts?: boolean}}): Promise<Invite> =>
        this.#invites.get(code) ??
        error(errors.UNKNOWN_INVITE, `/invites/${code}`, 'get')
    }
  }

  webhooks(id: Snowflake, token?: string) {
    const path = `/webhooks/${id}${token === undefined ? '' : `/${token}`}`
    return {
      // https://discord.com/developers/docs/resources/webhook#get-webhook
      // https://discord.com/developers/docs/resources/webhook#get-webhook-with-token
      get: async (): Promise<Webhook> => {
        const webhook = this.#webhooks.get(id)
        if (!webhook) error(errors.UNKNOWN_WEBHOOK, path, 'get')

        if (token === undefined && webhook.guild_id !== undefined) {
          const guild = this.#client.guilds.cache.get(webhook.guild_id)
          if (
            guild?.me &&
            (this.#client.channels.cache.get(webhook.channel_id) as
              | TextChannel
              | NewsChannel
              | undefined)
              ?.permissionsFor(guild.me)
              ?.has('MANAGE_WEBHOOKS') !== true
          )
            error(errors.MISSING_PERMISSIONS, path, 'get')
          return webhook
        }

        if ('token' in webhook && token !== webhook.token)
          error(errors.INVALID_WEBHOOK_TOKEN, path, 'get')

        const {user, ..._webhook} = webhook
        return _webhook
      }
    }
  }

  // TODO: make this a private accessor once TypeScript supports it
  #clientUser = (): ClientUser => {
    const {
      id,
      username,
      discriminator,
      avatar,
      bot,
      system,
      locale,
      mfaEnabled,
      verified
    } = this.#client.user
    return {
      id,
      username,
      discriminator,
      avatar,
      bot,
      system,
      locale,
      mfa_enabled: mfaEnabled,
      verified
    }
  }

  #addLog = (guildId: Snowflake, entry: DOmit<AuditLog.Entry, 'id'>): void => {
    this.#guilds
      .get(guildId)
      ?.auditLogEntries.push(defaults.auditLogEntry<AuditLog.Entry>(entry))
  }

  #checkPermissions = (
    guildId: Snowflake,
    permissions: PermissionResolvable,
    path: string,
    method: Method
  ): void => {
    if (
      this.#client.guilds.cache.get(guildId)?.me?.hasPermission(permissions) !==
      true
    )
      error(errors.MISSING_PERMISSIONS, path, method)
  }

  #emitPacket = <T extends Packet['t']>(
    type: T,
    data: Extract<Packet, {t: T}>['d']
  ): void => {
    // eslint-disable-next-line dot-notation -- handlePacket is private
    this.#client.ws['handlePacket'](
      {t: type, d: data},
      this.#client.ws.shards.first()
    )
  }
}
