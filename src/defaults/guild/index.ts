import {
  ChannelType,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildMFALevel,
  GuildNSFWLevel,
  GuildPremiumTier,
  GuildVerificationLevel
} from 'discord-api-types/v9'
import {Collection} from 'discord.js'
import {
  // resolveCollection,
  snowflake,
  timestamp,
  toCollection
} from '../../utils'
import {auditLogEntry} from '../audit-log'
import {
  DEFAULT_GUILD_PREFERRED_LOCALE,
  DEFAULT_INTEGRATION_NAME
} from '../constants'
import {guildEmoji} from '../emoji'
import {guildPresence} from '../gateway'
import {guildChannel, guildChannels} from '../channel'
import {partialApplication} from '../oauth2'
import {role} from '../permissions'
import {sticker} from '../sticker'
import {guildTemplate} from '../template'
import {user} from '../user'
import {createDefaults as d} from '../utils'
import {partialGuild} from './partial'
import type {
  Guild,
  GuildChannel,
  GuildIntegration,
  GuildIntegrationApplication,
  GuildMember,
  GuildVoiceState,
  IntegrationAccount,
  PartialDeep,
  Snowflake
} from '../../types'

export * from './partial'

const integrationAccount = d<IntegrationAccount>(_account => ({
  id: snowflake(),
  name: 'Integration Account Name',
  ..._account
}))

export const integrationApplication = d<GuildIntegrationApplication>(
  application => ({
    ...partialApplication(application),
    ...(application.bot ? {bot: user(application.bot)} : {})
  })
)

export const integration = d<GuildIntegration>(
  ({application, user: iUser, ...rest}) => ({
    id: snowflake(),
    name: DEFAULT_INTEGRATION_NAME,
    type: 'twitch',
    enabled: false,
    ...rest,
    ...(iUser ? {user: user(iUser)} : {}),
    account: integrationAccount(rest.account),
    ...(application ? {application: integrationApplication(application)} : {})
  })
)

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
  const _members = _guild.members?.map(guildMember)
  const members = toCollection(
    _members?.length ?? 0 ? _members! : [guildMember()]
  )
  const owner_id = _guild.owner_id ?? members.first()!.id
  // TODO: use resolveCollection instead of mapValues to get proper ID in values of map
  const emojis = _guild.emojis?.mapValues(guildEmoji) ?? new Collection()
  const roles = _guild.roles?.mapValues(role) ?? new Collection()
  const voice_states =
    _guild.voice_states?.mapValues(guildVoiceState) ?? new Collection()

  let channels: Guild['channels']
  let system_channel_id: Guild['system_channel_id']
  if (_guild.channels) {
    system_channel_id = _guild.system_channel_id ?? null
    const chans = _guild.channels.mapValues(guildChannel)
    const newChannel = (
      id: Snowflake | null | undefined,
      type?: ChannelType
    ): [Snowflake, GuildChannel][] =>
      id != null && !chans.has(id)
        ? [[id, guildChannel({id, type} as PartialDeep<GuildChannel>)]]
        : []
    // eslint-disable-next-line unicorn/prefer-spread -- not array
    channels = chans.concat(
      new Collection([
        ...newChannel(_guild.afk_channel_id, ChannelType.GuildVoice),
        ...newChannel(_guild.public_updates_channel_id, ChannelType.GuildText),
        ...newChannel(_guild.rules_channel_id, ChannelType.GuildText),
        ...newChannel(system_channel_id, ChannelType.GuildText),
        ...newChannel(_guild.widget_channel_id),
        ...[...chans.values()].flatMap(chan => [
          ...('messages' in chan
            ? chan.messages
                .filter(
                  ({thread_id}) =>
                    thread_id !== undefined && !chans.has(thread_id)
                )
                .map(
                  ({thread_id}) =>
                    [
                      thread_id!,
                      guildChannel({
                        id: thread_id,
                        type:
                          chan.type === ChannelType.GuildText
                            ? ChannelType.GuildPublicThread
                            : ChannelType.GuildNewsThread
                      })
                    ] as const
                )
            : []),
          ...('parent_id' in chan &&
          chan.parent_id !== null &&
          !chans.has(chan.parent_id)
            ? [
                [
                  chan.parent_id,
                  guildChannel({
                    id: chan.parent_id,
                    type:
                      chan.type === ChannelType.GuildPublicThread ||
                      chan.type === ChannelType.GuildPrivateThread
                        ? ChannelType.GuildText
                        : chan.type === ChannelType.GuildNews
                        ? ChannelType.GuildNewsThread
                        : ChannelType.GuildCategory
                  })
                ] as const
              ]
            : [])
        ])
      ])
    )
  } else {
    const [chans, systemChannelId] = guildChannels()
    channels = toCollection(chans)
    system_channel_id = systemChannelId
  }

  return {
    discovery_splash: null,
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
    owner_id,
    system_channel_id,
    // eslint-disable-next-line unicorn/prefer-spread -- not array
    members: members.concat(
      new Collection([
        // Owner
        ...(members.has(owner_id)
          ? []
          : [[owner_id, guildMember({id: owner_id})] as const]),
        // Voice states
        ...voice_states
          .filter(({user_id}) => !members.has(user_id))
          .map(({user_id}) => [user_id, guildMember({id: user_id})] as const)
      ])
    ),
    // eslint-disable-next-line unicorn/prefer-spread -- not array
    roles: roles.concat(
      toCollection([
        // @everyone role
        ...(roles.some(
          ({id, name}) => id === partial.id || name === '@everyone'
        )
          ? []
          : [role({id: partial.id, name: '@everyone'})]),
        ...[...new Set([...members.values()].flatMap(member => member.roles))]
          .filter(roleId => !roles.some(({id}) => id === roleId))
          .map(id => role({id}))
      ])
    ),
    // eslint-disable-next-line unicorn/prefer-spread -- not array
    emojis: emojis.concat(
      new Collection(
        partial.welcome_screen?.welcome_channels
          .filter(({emoji_id}) => emoji_id !== null && !emojis.has(emoji_id))
          .map(
            ({emoji_id}) => [emoji_id!, guildEmoji({id: emoji_id!})] as const
          )
      )
    ),
    voice_states,
    // eslint-disable-next-line unicorn/prefer-spread -- not array
    channels: channels.concat(
      new Collection([
        ...(partial.welcome_screen?.welcome_channels
          .filter(({channel_id}) => !channels.has(channel_id))
          .map(
            ({channel_id}) =>
              [channel_id, guildChannel({id: channel_id})] as const
          ) ?? []),
        ...voice_states
          .filter(
            ({channel_id}) => channel_id !== null && !channels.has(channel_id)
          )
          .map(
            ({channel_id}) =>
              [
                channel_id!,
                guildChannel({id: channel_id!, type: ChannelType.GuildVoice})
              ] as const
          )
      ])
    ),
    presences: _guild.presences?.mapValues(guildPresence) ?? new Collection(),
    audit_log_entries:
      _guild.audit_log_entries?.mapValues(auditLogEntry) ?? new Collection(),
    ...(_guild.template ? {template: guildTemplate(_guild.template)} : {}),
    stickers: _guild.stickers?.mapValues(sticker) ?? new Collection()
  }
})
