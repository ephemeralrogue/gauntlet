import {clientUserID} from './utils'
import type {
  APIApplication,
  APIChannel,
  APIEmoji,
  APIGuild,
  APIGuildMember,
  APIMessage,
  APIOverwrite,
  APIRole,
  APITemplate,
  Snowflake
} from 'discord-api-types'
import type {
  D,
  GatewayPresenceUpdate,
  ResolvedClientData,
  RD,
  ResolvedData
} from './types'
import type {Override} from './utils'

export const oauth2Application = (
  {integration_applications}: ResolvedData,
  {application}: ResolvedClientData
): APIApplication => ({
  ...application,
  ...integration_applications.get(application.id)!
})

export const addGuildID = (dataGuild: RD.Guild) => <T>(
  dataChannel: T
): Override<T, {guild_id: Snowflake}> => ({
  ...dataChannel,
  guild_id: dataGuild.id
})

export const guildEmoji = ({users}: ResolvedData) => ({
  id,
  name,
  roles,
  user_id,
  require_colons,
  managed,
  animated,
  available
}: D.GuildEmoji): APIEmoji => ({
  id,
  name,
  roles,
  user: users.get(user_id)!,
  require_colons,
  managed,
  animated,
  available
})

export const guildMember = ({users}: ResolvedData) => (
  dataGuild: RD.Guild,
  includePending = false
) => ({
  id,
  nick,
  roles,
  joined_at,
  premium_since,
  pending
}: D.GuildMember): APIGuildMember => {
  const {deaf, mute} = dataGuild.voice_states.find(
    ({user_id}) => user_id === id
  ) ?? {deaf: false, mute: false}
  return {
    user: users.get(id)!,
    nick,
    roles,
    joined_at,
    premium_since,
    deaf,
    mute,
    ...(includePending ? {pending} : {})
  }
}

export const role = ({permissions, ...rest}: D.Role): APIRole => ({
  ...rest,
  permissions: `${permissions}` as const
})

export const overwrite = ({
  allow,
  deny,
  ...rest
}: D.Overwrite): APIOverwrite => ({
  allow: `${allow}` as const,
  deny: `${deny}` as const,
  ...rest
})

export const guildChannel = (
  dataGuild: RD.Guild
): ((channel: RD.GuildChannel) => APIChannel) => {
  const _addGuildID = addGuildID(dataGuild)
  return ({messages, permission_overwrites, ...rest}): APIChannel =>
    _addGuildID({
      permission_overwrites: permission_overwrites.map(overwrite),
      ...rest
    })
}

export const guildPresence = ({users}: ResolvedData) => (
  dataGuild: RD.Guild
): ((dataPresence: D.GuildPresence) => GatewayPresenceUpdate) => {
  const _addGuildID = addGuildID(dataGuild)
  return ({user_id, ...rest}): GatewayPresenceUpdate =>
    _addGuildID({user: users.get(user_id)!, ...rest})
}

/**
 * Converts a `DataGuild` into an `APIGuild`. This does not include fields only
 * sent in `GUILD_CREATE`, Get Current User Guilds, Get Guild without
 * `with_counts`, and in an `APIInvite`.
 *
 * @param data The backend data.
 * @returns A function for converting a guild object in the backend
 * representation into a guild for returning from the mocked API.
 */
export const guild = (
  data: ResolvedData
): ((dataGuild: RD.Guild) => APIGuild) => {
  const convertGuildEmoji = guildEmoji(data)
  return ({
    id,
    name,
    icon,
    splash,
    discovery_splash,
    owner_id,
    region,
    afk_channel_id,
    afk_timeout,
    widget_enabled,
    widget_channel_id,
    verification_level,
    default_message_notifications,
    explicit_content_filter,
    roles,
    emojis,
    features,
    mfa_level,
    application_id,
    system_channel_id,
    system_channel_flags,
    rules_channel_id,
    max_presences,
    max_members,
    vanity_url_code,
    description,
    banner,
    premium_tier,
    premium_subscription_count,
    preferred_locale,
    public_updates_channel_id,
    max_video_channel_users,
    nsfw
  }): APIGuild => ({
    id,
    name,
    icon,
    splash,
    discovery_splash,
    owner_id,
    region,
    afk_channel_id,
    afk_timeout,
    widget_enabled,
    widget_channel_id,
    verification_level,
    default_message_notifications,
    explicit_content_filter,
    roles: roles.map(role),
    emojis: emojis.map(convertGuildEmoji),
    features,
    mfa_level,
    application_id,
    system_channel_id,
    system_channel_flags,
    rules_channel_id,
    max_presences,
    max_members,
    vanity_url_code,
    description,
    banner,
    premium_tier,
    premium_subscription_count,
    preferred_locale,
    public_updates_channel_id,
    max_video_channel_users,
    nsfw
  })
}

/**
 * {@linkcode guild} but includes fields only sent in `GUILD_CREATE`.
 *
 * @param data The backend data.
 * @param clientData The backend client data.
 * @returns A function for converting a guild object in the backend
 * representation into a guild for returning from the mocked API.
 */
export const guildCreateGuild = (
  data: ResolvedData,
  clientData: ResolvedClientData
): ((dataGuild: RD.Guild, convertedGuild?: APIGuild) => APIGuild) => {
  const convertGuild = guild(data)
  const convertGuildMember = guildMember(data)
  const convertGuildPresence = guildPresence(data)
  return (dataGuild, convertedGuild): APIGuild => {
    const {large, unavailable, members, channels, presences} = dataGuild
    const userID = clientUserID(data, clientData)
    return {
      ...(convertedGuild ?? convertGuild(dataGuild)),
      joined_at: members.find(({id}) => id === userID)?.joined_at,
      large,
      unavailable,
      member_count: members.size,
      members: members.map(convertGuildMember(dataGuild, true)),
      channels: channels.map(guildChannel(dataGuild)),
      presences: presences.map(convertGuildPresence(dataGuild))
    }
  }
}

export const template = (data: ResolvedData) => (dataGuild: RD.Guild) => (
  dataTemplate: D.GuildTemplate
): APITemplate => ({
  ...dataTemplate,
  creator: data.users.get(dataTemplate.creator_id)!,
  source_guild_id: dataGuild.id
})

export const message = (data: ResolvedData, channelID: Snowflake) => ({
  application_id,
  author_id,
  mentions,
  mention_channels,
  stickers,
  message_reference,
  referenced_message,
  ...rest
}: D.Message): APIMessage => ({
  ...rest,
  application:
    application_id === undefined
      ? undefined
      : data.integration_applications.get(application_id)!,
  author: data.users.get(author_id)!,
  channel_id: channelID,
  mentions: mentions.map(id => data.users.get(id)!),
  mention_channels: mention_channels?.map(({id, guild_id}) => {
    const {name, type} = data.guilds
      .get(guild_id)!
      .channels.find(chan => chan.id === id)!
    return {id, guild_id, name, type}
  }),
  stickers: stickers?.map(id => data.stickers.get(id)!),
  message_reference,
  referenced_message: referenced_message
    ? message(data, message_reference!.channel_id)(referenced_message)
    : undefined
})
