import {
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildMFALevel,
  GuildNSFWLevel,
  GuildPremiumTier,
  GuildVerificationLevel
} from 'discord-api-types/v9'
import {Collection} from 'discord.js'
import {snowflake, timestamp, toCollection} from '../utils'
import {auditLogEntry} from './audit-log'
import {
  DEFAULT_GUILD_NAME,
  DEFAULT_GUILD_PREFERRED_LOCALE,
  DEFAULT_INTEGRATION_NAME
} from './constants'
import {guildEmoji} from './emoji'
import {guildPresence} from './gateway'
import {guildChannel, guildChannels} from './channel'
import {partialApplication} from './oauth2'
import {role} from './permissions'
import {sticker} from './sticker'
import {guildTemplate} from './template'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {
  Guild,
  GuildIntegration,
  GuildIntegrationApplication,
  GuildMember,
  GuildVoiceState,
  GuildWelcomeScreen,
  GuildWelcomeScreenChannel,
  IntegrationAccount,
  PartialGuild
} from '../types'
// eslint-disable-next-line import/max-dependencies -- type imports
import type {NonEmptyArray} from '../utils'

const welcomeScreenChannel = d<GuildWelcomeScreenChannel>(_channel => ({
  channel_id: snowflake(),
  description: 'Follow for official Discord API updates',
  emoji_id: null,
  emoji_name: null,
  ..._channel
}))

const welcomeScreen = d<GuildWelcomeScreen>(screen => ({
  description: null,
  ...screen,
  welcome_channels: screen?.welcome_channels?.map(welcomeScreenChannel) ?? []
}))

export const partialGuild = d<PartialGuild>(guild => ({
  id: snowflake(),
  name: DEFAULT_GUILD_NAME,
  icon: null,
  splash: null,
  ...guild,
  welcome_screen: guild?.welcome_screen
    ? welcomeScreen(guild.welcome_screen)
    : undefined
}))

const integrationAccount = d<IntegrationAccount>(_account => ({
  id: snowflake(),
  name: 'Integration Account Name',
  ..._account
}))

export const integrationApplication = d<GuildIntegrationApplication>(
  application => ({
    ...partialApplication(application),
    bot: application?.bot ? user(application.bot) : undefined
  })
)

export const integration = d<GuildIntegration>(_integration => ({
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

export const guildMember = d<GuildMember>(member => ({
  id: snowflake(),
  nick: null,
  roles: [],
  joined_at: timestamp(),
  premium_since: null,
  pending: false,
  ...member
}))

const guildVoiceState = d<GuildVoiceState>(voiceState => ({
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

export const guild = d<Guild>(_guild => {
  /** Includes extra properties from `Guild` not in `PartialGuild`. */
  const partial = partialGuild(_guild)
  const _members = _guild?.members?.map(guildMember)
  const members: NonEmptyArray<GuildMember> =
    _members?.length ?? 0
      ? (_members as NonEmptyArray<GuildMember>)
      : [guildMember()]
  const roles = _guild?.roles?.mapValues(role) ?? new Collection()
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
    integration_ids: [],
    ...partial,
    members: toCollection(members),
    // eslint-disable-next-line unicorn/prefer-spread -- not array
    roles: roles.concat(
      toCollection([
        // @everyone role
        ...(roles.some(
          ({id, name}) => id === partial.id || name === '@everyone'
        )
          ? []
          : [role({id: partial.id, name: '@everyone'})]),
        ...[...new Set(members.flatMap(member => member.roles))]
          .filter(roleId => !roles.some(({id}) => id === roleId))
          .map(id => role({id}))
      ])
    ),
    emojis: _guild?.emojis?.mapValues(guildEmoji) ?? new Collection(),
    voice_states:
      _guild?.voice_states?.mapValues(guildVoiceState) ?? new Collection(),
    channels:
      _guild?.channels?.mapValues(guildChannel) ??
      toCollection(guildChannels()[0]),
    presences: _guild?.presences?.mapValues(guildPresence) ?? new Collection(),
    audit_log_entries:
      _guild?.audit_log_entries?.mapValues(auditLogEntry) ?? new Collection(),
    template: _guild?.template ? guildTemplate(_guild.template) : undefined,
    stickers: _guild?.stickers?.mapValues(sticker) ?? new Collection()
  }
})
