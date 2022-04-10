import {Client, ClientUser, Constants} from 'discord.js'
import WebSocketShard from '../node_modules/discord.js/src/client/websocket/WebSocketShard'
import API from './API'
import {defaults} from './defaults'
import {
  DefaultMessageNotificationLevel,
  ExplicitContentFilterLevel,
  VerificationLevel
} from './discord'
import {resolveCollection} from './utils'
import type {
  Activity as DiscordActivity,
  ClientOptions,
  Collection,
  GuildMember as DiscordGuildMember,
  StoreChannel,
  TextChannel,
  User as DiscordUser,
  VoiceChannel,
  Snowflake
} from 'discord.js'
// eslint-disable-next-line import/no-named-default -- type imports
import type {default as Data, ResolvedGuild} from './Data'
import type {
  Activity,
  GuildChannel,
  GuildCreate,
  GuildMember,
  User
} from './discord'

export default class extends Client {
  user: ClientUser

  constructor(data: Data = {}, options?: ClientOptions) {
    // The restSweepInterval: 0 is to stop the RESTManager from setting an
    // interval
    super({...options, restSweepInterval: 0})

    const guilds: Collection<Snowflake, ResolvedGuild> = resolveCollection(
      data.guilds ?? [],
      'id',
      'dataGuild'
    )

    // Initialise the mocked API. This needs to be done with
    // Object.defineProperty because api is originally a getter
    Object.defineProperty(this, 'api', {
      value: new API(this, data, guilds),
      configurable: true
    })

    // Initialise the client user
    this.user = new ClientUser(this, defaults.clientUser(data.user))

    // Create a shard
    const shard = new WebSocketShard(this.ws, 0)
    this.ws.shards.set(0, shard)

    if (guilds.size) {
      // Make the guilds available
      guilds.forEach((guild, id): void => {
        const packet: GuildCreate = {
          t: 'GUILD_CREATE',
          d: {...guild, id, unavailable: false}
        }
        this.ws['handlePacket'](packet, shard)
      })
    }

    // Make the websocket manager ready to receive packets
    this.ws['triggerClientReady']()
  }
}

const user = (_user: DiscordUser): User => ({
  id: _user.id,
  username: _user.username,
  discriminator: _user.discriminator,
  avatar: _user.avatar,
  bot: _user.bot,
  system: _user.system,
  locale: _user.locale,
  public_flags: _user.flags?.bitfield,
  ...(_user instanceof ClientUser
    ? {
        mfa_enabled: _user.mfaEnabled,
        verified: _user.verified
      }
    : {})
})

const member = ({
  user: _user,
  nickname,
  roles,
  joinedAt,
  premiumSince,
  voice: {serverDeaf = false, serverMute = false}
}: DiscordGuildMember): GuildMember => ({
  user: user(_user),
  nick: nickname ?? undefined,
  roles: roles.cache.keyArray(),
  joined_at: (joinedAt ?? new Date()).toISOString(),
  premium_since: premiumSince?.toISOString(),
  deaf: serverDeaf,
  mute: serverMute
})

const activity = ({
  name,
  type,
  url,
  createdTimestamp,
  timestamps,
  applicationID,
  details,
  state,
  emoji,
  party,
  assets
}: DiscordActivity): Activity => ({
  name,
  type: Constants.ActivityTypes.indexOf(type),
  url,
  created_at: createdTimestamp,
  timestamps: {
    ...(timestamps?.start ? {start: timestamps.start.toISOString()} : {}),
    ...(timestamps?.end ? {end: timestamps.end.toISOString()} : {})
  },
  ...(applicationID === null ? {} : {application_id: applicationID}),
  details,
  state,
  ...(emoji
    ? {
        emoji: {
          name: emoji.name,
          ...(emoji.id === null ? {} : {id: emoji.id}),
          animated: emoji.animated
        }
      }
    : {}),
  ...(party
    ? {party: {...(party.id === null ? {} : {id: party.id}), size: party.size}}
    : {}),
  ...(assets
    ? {
        assets: {
          ...(assets.largeImage === null
            ? {}
            : {large_image: assets.largeImage}),
          ...(assets.largeText === null ? {} : {large_text: assets.largeText}),
          ...(assets.smallImage === null
            ? {}
            : {small_image: assets.smallImage}),
          ...(assets.smallText === null ? {} : {small_text: assets.smallText})
        }
      }
    : {}),
  flags
})

// eslint-disable-next-line max-lines-per-function
export const mockClient = (client: Client, data: Data = {}): Client => {
  client.options.restSweepInterval = 0

  if (!client.user)
    client.user = new ClientUser(client, defaults.clientUser(data.user))
  const guilds = client.guilds.cache
    .mapValues<ResolvedGuild>(
      ({
        id,
        name,
        icon,
        splash,
        features,
        description,
        emojis,
        discoverySplash,
        approximateMemberCount,
        approximatePresenceCount,
        members,
        ownerID,
        region,
        afkChannelID,
        afkTimeout,
        verificationLevel,
        defaultMessageNotifications,
        explicitContentFilter,
        roles,
        mfaLevel,
        applicationID,
        widgetEnabled,
        widgetChannelID,
        systemChannelID,
        systemChannelFlags,
        rulesChannelID,
        maximumPresences,
        maximumMembers,
        vanityURLCode,
        banner,
        premiumTier,
        premiumSubscriptionCount,
        preferredLocale,
        publicUpdatesChannelID,
        joinedAt,
        large,
        memberCount,
        voiceStates,
        channels,
        presences
      }) => ({
        id,
        name,
        icon,
        splash,
        features,
        description,
        emojis: emojis.cache.map(
          ({
            id: _id,
            name: _name,
            animated,
            roles: _roles,
            requiresColons,
            managed,
            author
          }) => ({
            id: _id,
            name: _name,
            animated,
            roles: _roles.cache.keyArray(),
            require_colons: requiresColons,
            managed,
            user: author
              ? user(author)
              : defaults.user({id: members.cache.first()!.id})
          })
        ),
        discovery_splash: discoverySplash,
        approximate_member_count: approximateMemberCount ?? 1,
        approximate_presence_count: approximatePresenceCount ?? 0,
        owner: ownerID === client.user!.id,
        owner_id: ownerID,
        region,
        afk_channel_id: afkChannelID,
        afk_timeout: afkTimeout,
        verification_level: VerificationLevel[verificationLevel],
        default_message_notifications:
          typeof defaultMessageNotifications == 'number'
            ? defaultMessageNotifications
            : {
                ALL: DefaultMessageNotificationLevel.ALL_MESSAGES,
                MENTIONS: DefaultMessageNotificationLevel.ONLY_MENTIONS
              }[defaultMessageNotifications],
        explicit_content_filter:
          ExplicitContentFilterLevel[explicitContentFilter],
        roles: roles.cache.map(
          ({
            id: _id,
            name: _name,
            color,
            hoist,
            position,
            permissions,
            managed,
            mentionable
          }) => ({
            id: _id,
            name: _name,
            color,
            hoist,
            position,
            permissions: permissions.bitfield,
            managed,
            mentionable
          })
        ),
        mfa_level: mfaLevel,
        application_id: applicationID,
        widget_enabled: widgetEnabled ?? undefined,
        widget_channel_id: widgetChannelID,
        system_channel_id: systemChannelID,
        system_channel_flags: systemChannelFlags.bitfield,
        rules_channel_id: rulesChannelID,
        max_presences: maximumPresences,
        max_members: maximumMembers ?? undefined,
        vanity_url_code: vanityURLCode,
        banner,
        premium_tier: premiumTier,
        premium_subscription_count: premiumSubscriptionCount ?? undefined,
        preferred_locale: preferredLocale,
        public_updates_channel_id: publicUpdatesChannelID,
        // max_video_channel_users
        joined_at: joinedAt.toISOString(),
        large,
        member_count: memberCount,
        voice_states: voiceStates.cache.map(
          ({
            channelID,
            id: user_id,
            member: _member,
            sessionID,
            serverDeaf = false,
            serverMute = false,
            selfDeaf = false,
            selfMute = false,
            selfVideo
          }) => ({
            guild_id: id,
            channel_id: channelID ?? null,
            user_id,
            member: _member ? member(_member) : undefined,
            session_id: sessionID ?? '',
            deaf: serverDeaf,
            mute: serverMute,
            self_deaf: selfDeaf,
            self_mute: selfMute,
            self_stream: selfVideo
          })
        ),
        members: members.cache.map(member),
        channels: channels.cache.map(
          channel =>
            (({
              id: channel.id,
              guild_id: id,
              position: channel.position,
              permission_overwrites: channel.permissionOverwrites.map(
                ({id: _id, type: _type, allow, deny}) => ({
                  id: _id,
                  type: _type,
                  allow: allow.bitfield,
                  deny: deny.bitfield
                })
              ),
              name: channel.name,
              parent_id: channel.parentID,
              type: ChannelType[channel.type],
              ...(channel.type === 'text' || channel.type === 'store'
                ? {nsfw: (channel as TextChannel | StoreChannel).nsfw}
                : {}),
              ...(((c): c is TextChannel => channel.type === 'text')(channel)
                ? {
                    last_message_id: channel.lastMessageID,
                    last_pin_timestamp: (channel.lastPinAt as Date | null)?.toISOString(),
                    topic: channel.topic,
                    nsfw: channel.nsfw,
                    rate_limit_per_user: channel.rateLimitPerUser
                  }
                : {}),
              ...(((c): c is VoiceChannel => c.type === 'voice')(channel)
                ? {bitrate: channel.bitrate, user_limit: channel.userLimit}
                : {})
            } as unknown) as GuildChannel)
        ),
        presences: presences.cache.map(({user: _user, userID, activities}) => ({
          user: _user ? user(_user) : defaults.user({id: userID}),
          game
        }))
      })
    )
    .concat(resolveCollection(data.guilds ?? [], 'id', 'dataGuild'))
  Object.defineProperty(this, 'api', {
    value: new API(client as Client & {user: ClientUser}, data, guilds),
    configurable: true
  })

  let shard: WebSocketShard
  if (client.ws.shards.size) shard = client.ws.shards.first()!
  else {
    shard = new WebSocketShard(client.ws, 0)
    client.ws.shards.set(0, shard)
  }
  if (guilds.size) {
    guilds.forEach((guild, id) => {
      const packet: GuildCreate = {
        t: 'GUILD_CREATE',
        d: {...guild, id, unavailable: false}
      }
      client.ws['handlePacket'](packet, shard)
    })
  }

  client.ws['triggerClientReady']()

  return client
}
