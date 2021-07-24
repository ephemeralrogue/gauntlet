import {
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildMFALevel,
  GuildNSFWLevel,
  GuildPremiumTier,
  GuildVerificationLevel
} from 'discord-api-types/v9'
import {snowflake, timestamp} from '../utils'
import {auditLogEntry} from './audit-log'
import {
  DEFAULT_GUILD_NAME,
  DEFAULT_GUILD_PREFERRED_LOCALE,
  DEFAULT_INTEGRATION_NAME
} from './constants'
import {dataGuildEmoji} from './emoji'
import {dataGuildChannel, dataGuildChannels} from './channel'
import {dataGuildPresence} from './gateway'
import {partialApplication} from './oauth2'
import {dataRole} from './permissions'
import {sticker} from './sticker'
import {dataGuildTemplate} from './template'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {
  APIGuildIntegration,
  APIGuildIntegrationApplication,
  APIGuildWelcomeScreen,
  APIGuildWelcomeScreenChannel,
  APIIntegrationAccount,
  APIPartialGuild
} from 'discord-api-types/v9'
import type {D} from '../types'
// eslint-disable-next-line import/max-dependencies -- type imports
import type {NonEmptyArray} from '../utils'

const welcomeScreenChannel = d<APIGuildWelcomeScreenChannel>(_channel => ({
  channel_id: snowflake(),
  description: 'Follow for official Discord API updates',
  emoji_id: null,
  emoji_name: null,
  ..._channel
}))

const welcomeScreen = d<APIGuildWelcomeScreen>(screen => ({
  description: null,
  ...screen,
  welcome_channels: screen?.welcome_channels?.map(welcomeScreenChannel) ?? []
}))

export const partialGuild = d<APIPartialGuild>(guild => ({
  id: snowflake(),
  name: DEFAULT_GUILD_NAME,
  icon: null,
  splash: null,
  ...guild,
  welcome_screen: guild?.welcome_screen
    ? welcomeScreen(guild.welcome_screen)
    : undefined
}))

const integrationAccount = d<APIIntegrationAccount>(_account => ({
  id: snowflake(),
  name: 'Integration Account Name',
  ..._account
}))

export const integrationApplication = d<APIGuildIntegrationApplication>(
  application => ({
    ...partialApplication(application),
    bot: application?.bot ? user(application.bot) : undefined
  })
)

export const integration = d<APIGuildIntegration>(_integration => ({
  id: snowflake(),
  name: DEFAULT_INTEGRATION_NAME,
  type: 'twitch',
  enabled: false,
  ..._integration,
  user: _integration?.user ? user(_integration.user) : undefined,
  account: integrationAccount(_integration?.account),
  application: _integration?.application
    ? integrationApplication(_integration.application)
    : undefined
}))

const dataGuildMember = d<D.GuildMember>(member => ({
  id: snowflake(),
  nick: null,
  roles: [],
  joined_at: timestamp(),
  premium_since: null,
  pending: false,
  ...member
}))

const dataGuildVoiceState = d<D.GuildVoiceState>(voiceState => ({
  channel_id: null,
  user_id: snowflake(),
  // TODO: investigate proper session_id
  session_id: snowflake(),
  deaf: false,
  mute: false,
  self_deaf: false,
  self_mute: false,
  self_stream: false,
  self_video: false,
  // TODO: find out what suppress actually does (muting another user doesn't
  // seem to make this true)
  suppress: false,
  request_to_speak_timestamp: null,
  ...voiceState
}))

export const dataGuild = d<D.Guild>(guild => {
  /** Includes extra properties from `Guild` not in `APIPartialGuild`. */
  const partial = partialGuild(guild)
  const _members = guild?.members?.map(dataGuildMember)
  const members: NonEmptyArray<D.GuildMember> =
    _members?.length ?? 0
      ? (_members as NonEmptyArray<D.GuildMember>)
      : [dataGuildMember()]
  const roles = guild?.roles?.map(dataRole) ?? []
  return {
    discovery_splash: null,
    owner_id: members[0].id,
    region: 'us-west',
    afk_channel_id: null,
    afk_timeout: 300,
    widget_enabled: false,
    verification_level: GuildVerificationLevel.None,
    default_message_notifications: GuildDefaultMessageNotifications.AllMessages,
    explicit_content_filter: GuildExplicitContentFilter.Disabled,
    features: [],
    mfa_level: GuildMFALevel.None,
    application_id: null,
    system_channel_id: null,
    system_channel_flags: 0,
    rules_channel_id: null,
    max_members: 100_000,
    vanity_url_code: null,
    description: null,
    banner: null,
    premium_tier: GuildPremiumTier.None,
    preferred_locale: DEFAULT_GUILD_PREFERRED_LOCALE,
    max_video_channel_users: 25,
    public_updates_channel_id: null,
    nsfw_level: GuildNSFWLevel.Default,
    ...partial,
    members,
    roles: [
      ...roles,
      // @everyone role
      ...(roles.some(({id, name}) => id === partial.id || name === '@everyone')
        ? []
        : [dataRole({id: partial.id, name: '@everyone'})]),
      ...[...new Set(members.flatMap(member => member.roles))]
        .filter(roleId => !roles.some(({id}) => id === roleId))
        .map(id => dataRole({id}))
    ],
    emojis: guild?.emojis?.map(dataGuildEmoji) ?? [],
    voice_states: guild?.voice_states?.map(dataGuildVoiceState) ?? [],
    channels: guild?.channels?.map(dataGuildChannel) ?? dataGuildChannels()[0],
    presences: guild?.presences?.map(dataGuildPresence) ?? [],
    audit_log_entries: guild?.audit_log_entries?.map(auditLogEntry) ?? [],
    integrations: guild?.integrations?.map(integration) ?? [],
    template: guild?.template ? dataGuildTemplate(guild.template) : undefined,
    stickers: guild?.stickers?.map(sticker) ?? []
  }
})
