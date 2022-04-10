// TODO: modularise

import {SnowflakeUtil} from 'discord.js'
import {
  ActivityType,
  ChannelType,
  DefaultMessageNotificationLevel,
  ExplicitContentFilterLevel,
  MembershipState,
  MFALevel,
  PermissionsFlags,
  PremiumTier,
  VerificationLevel,
  WebhookType
} from '../discord'
import {timestamp} from '../utils/utils'
import type {DataGuild, ResolvedGuild} from '../Data'
import type {
  Activity,
  ActivityEmoji,
  ActivityParty,
  AuditLog,
  CategoryChannel,
  Channel,
  ChannelBase,
  ClientApplication,
  ClientUser,
  DMChannel,
  Invite,
  InviteWithMetadata,
  FullGuild,
  Guild,
  GuildBase,
  GuildChannel,
  GuildChannelBase,
  GuildEmoji,
  GuildMember,
  GuildPreview,
  GuildPreviewEmoji,
  GuildTextChannelBase,
  NewsChannel,
  PartialGroupDMChannel,
  PermissionOverwrite,
  Presence,
  Role,
  StoreChannel,
  Team,
  TeamMember,
  TextChannel,
  TextChannelBase,
  UserBase,
  Webhook,
  VoiceChannel,
  VoiceRegion,
  VoiceState
} from '../discord'
import type {DeepPartial, DKeys, DOmit} from '../utils'

const EMOJI_NAME = 'LUL'

let discriminatorCounter = 0
let voiceRegionId = 0

const inviteCodes: string[] = []
const generateInviteCode = (): string => {
  const code =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 5)
  if (inviteCodes.includes(code)) return generateInviteCode()
  inviteCodes.push(code)
  return code
}

export default {
  // Audit Log
  auditLogEntry<T extends AuditLog.Entry>(
    entry?: DOmit<T, Extract<'id', DKeys<T>>>
  ): T {
    return {
      id: SnowflakeUtil.generate(),
      ...entry
    } as T
  },

  // Channel
  channelBase(channel?: DeepPartial<ChannelBase>): ChannelBase {
    return {
      id: SnowflakeUtil.generate(),
      ...channel
    }
  },
  guildChannelBase(channel?: DeepPartial<GuildChannelBase>): GuildChannelBase {
    return {
      ...this.channelBase(channel),
      guild_id: SnowflakeUtil.generate(),
      position: 0,
      name: 'general',
      parent_id: null,
      ...channel,
      permission_overwrites: channel?.permission_overwrites?.map(
        this.permissionOverwrite.bind(this)
      )
    }
  },
  categoryChannel(channel?: DeepPartial<CategoryChannel>): CategoryChannel {
    return {
      ...this.guildChannelBase(channel),
      type: ChannelType.GUILD_CATEGORY,
      parent_id: null
    }
  },
  storeChannel(channel?: DeepPartial<StoreChannel>): StoreChannel {
    return {
      ...this.guildChannelBase(channel),
      type: ChannelType.GUILD_STORE
    }
  },
  voiceChannel(channel?: DeepPartial<VoiceChannel>): VoiceChannel {
    return {
      ...this.guildChannelBase(channel),
      type: ChannelType.GUILD_VOICE
    }
  },
  textChannelBase(channel?: DeepPartial<TextChannelBase>): TextChannelBase {
    return {
      ...this.channelBase(channel),
      last_message_id: null,
      ...channel
    }
  },
  guildTextChannelBase(
    channel?: DeepPartial<GuildTextChannelBase>
  ): GuildTextChannelBase {
    const base = {
      ...this.textChannelBase(channel),
      ...this.guildChannelBase(channel),
      topic: null
    }
    return {
      ...base,
      ...channel,
      permission_overwrites: base.permission_overwrites
    }
  },
  textChannel(channel?: DeepPartial<TextChannel>): TextChannel {
    return {
      ...this.guildTextChannelBase(channel),
      type: ChannelType.GUILD_TEXT
    }
  },
  newsChannel(channel?: DeepPartial<NewsChannel>): NewsChannel {
    return {
      ...this.guildTextChannelBase(channel),
      type: ChannelType.GUILD_NEWS
    }
  },
  dmChannel(channel?: DeepPartial<DMChannel>): DMChannel {
    return {
      ...this.textChannelBase(channel),
      type: ChannelType.DM,
      ...channel,
      recipients: [this.user(channel?.recipients?.[0])]
    }
  },
  guildChannel(channel?: DeepPartial<GuildChannel>): GuildChannel {
    switch (channel?.type) {
      case ChannelType.GUILD_CATEGORY:
        return this.categoryChannel(channel)
      case ChannelType.GUILD_STORE:
        return this.storeChannel(channel)
      case ChannelType.GUILD_VOICE:
        return this.voiceChannel(channel)
      case ChannelType.GUILD_NEWS:
        return this.newsChannel(channel)
      default:
        return this.textChannel(channel as DeepPartial<TextChannel>)
    }
  },
  channel(channel?: DeepPartial<Channel>): Channel {
    switch (channel?.type) {
      case ChannelType.DM:
        return this.dmChannel(channel)
      default:
        return this.guildChannel(channel as DeepPartial<GuildChannel>)
    }
  },

  // Emoji
  guildPreviewEmoji(emoji?: DeepPartial<GuildPreviewEmoji>): GuildPreviewEmoji {
    return {
      id: SnowflakeUtil.generate(),
      name: EMOJI_NAME,
      roles: [],
      require_colons: true,
      managed: false,
      animated: false,
      ...emoji
    }
  },
  guildEmoji(emoji?: DeepPartial<GuildEmoji>): GuildEmoji {
    return {
      ...this.guildEmoji(emoji),
      user: this.user(emoji?.user)
    }
  },

  // Guild
  guildBase(guild?: DeepPartial<GuildBase>): GuildBase {
    return {
      id: SnowflakeUtil.generate(),
      name: 'Discord Developers',
      icon: null,
      splash: null,
      features: [],
      description: null,
      ...guild
    }
  },
  guildPreview(preview?: DeepPartial<GuildPreview>): GuildPreview {
    return {
      ...this.guildBase(preview),
      emojis: preview?.emojis?.map(this.guildPreviewEmoji.bind(this)) ?? [],
      discovery_splash: null,
      approximate_member_count: 1,
      approximate_presence_count: 0
    }
  },
  guild(guild?: DeepPartial<Guild>): Guild {
    const base = this.guildBase(guild)
    const roles = guild?.roles?.map(this.role.bind(this))
    return {
      ...base,
      owner_id: SnowflakeUtil.generate(),
      region: 'us-east',
      afk_channel_id: null,
      afk_timeout: 300,
      verification_level: VerificationLevel.NONE,
      default_message_notifications:
        DefaultMessageNotificationLevel.ALL_MESSAGES,
      explicit_content_filter: ExplicitContentFilterLevel.DISABLED,
      mfa_level: MFALevel.NONE,
      application_id: null,
      system_channel_id: null,
      system_channel_flags: 0,
      rules_channel_id: null,
      vanity_url_code: null,
      banner: null,
      premium_tier: PremiumTier.NONE,
      preferred_locale: 'en-US',
      public_updates_channel_id: null,
      ...guild,
      roles: roles?.find(r => r.id === base.id)
        ? roles
        : [...(roles ?? []), this.role({id: base.id, name: '@everyone'})],
      emojis: guild?.emojis?.map(this.guildEmoji.bind(this)) ?? []
    }
  },
  fullGuild(guild?: DeepPartial<FullGuild>): FullGuild {
    const joinedAt = timestamp()
    const {roles, emojis, ..._guild} = guild ?? {}
    const members = guild?.members?.map(this.guildMember.bind(this)) ?? [
      {...this.guildMember(), joined_at: joinedAt}
    ]
    return {
      ...this.guild(guild),
      joined_at: joinedAt,
      large: false,
      unavailable: false,
      ..._guild,
      members,
      member_count: members.length,
      voice_states: guild?.voice_states?.map(this.voiceState.bind(this)) ?? [],
      channels: guild?.channels?.map(this.guildChannel.bind(this)) ?? [],
      presences: guild?.presences?.map(this.presence.bind(this)) ?? []
    }
  },
  dataGuild(guild?: DataGuild): ResolvedGuild {
    const {unavailable, ..._guild} = this.fullGuild(
      guild as DeepPartial<FullGuild> | undefined
    )
    const base = {
      ...this.guildPreview(guild),
      ..._guild
    }
    return {
      ...base,
      channels: base.channels.map(c => ({...c, guild_id: base.id})),
      auditLogEntries:
        guild?.auditLogEntries?.map(e =>
          this.auditLogEntry<AuditLog.Entry>(e)
        ) ?? []
    }
  },
  guildMember(member?: DeepPartial<GuildMember>): GuildMember {
    return {
      joined_at: timestamp(),
      deaf: false,
      mute: false,
      roles: [],
      ...member,
      user: this.user(member?.user)
    }
  },
  role(role?: DeepPartial<Role>): Role {
    return {
      id: SnowflakeUtil.generate(),
      name: 'new role',
      color: 0,
      hoist: false,
      position: 0,
      permissions:
        PermissionsFlags.CREATE_INSTANT_INVITE |
        PermissionsFlags.ADD_REACTIONS |
        PermissionsFlags.STREAM |
        PermissionsFlags.VIEW_CHANNEL |
        PermissionsFlags.SEND_MESSAGES |
        PermissionsFlags.EMBED_LINKS |
        PermissionsFlags.ATTACH_FILES |
        PermissionsFlags.READ_MESSAGE_HISTORY |
        PermissionsFlags.MENTION_EVERYONE |
        PermissionsFlags.USE_EXTERNAL_EMOJIS |
        PermissionsFlags.CONNECT |
        PermissionsFlags.SPEAK |
        PermissionsFlags.USE_VAD |
        PermissionsFlags.CHANGE_NICKNAME,
      managed: false,
      mentionable: false,
      ...role
    }
  },

  // Invite
  partialGroupDMChannel(
    channel?: DeepPartial<PartialGroupDMChannel>
  ): PartialGroupDMChannel {
    return {
      ...this.channelBase(channel),
      type: ChannelType.GROUP_DM,
      name: null,
      ...channel
    }
  },
  invite(invite?: DeepPartial<Invite>): Invite {
    const {id: inviterId, username, avatar, discriminator} = this.user(
      invite?.inviter
    )
    const _invite = {
      code: generateInviteCode(),
      ...invite,
      inviter: {id: inviterId, username, avatar, discriminator},
      target_user: {id: SnowflakeUtil.generate(), ...invite?.target_user}
    }
    if (
      ((
        i?: DeepPartial<Invite>
      ): i is Extract<DeepPartial<Invite>, {guild?: unknown}> =>
        (i &&
          ('guild' in i ||
            (i.channel?.type !== undefined &&
              i.channel.type !== ChannelType.GROUP_DM))) === true)(invite)
    ) {
      const {
        id: guildId,
        name,
        splash,
        description,
        icon,
        features,
        verification_level,
        vanity_url_code
      } = this.guild(invite.guild)
      return {
        ..._invite,
        channel: this.guildChannel(invite.channel),
        guild: {
          id: guildId,
          name,
          splash,
          description,
          icon,
          features,
          verification_level,
          vanity_url_code
        }
      }
    }
    return {
      ..._invite,
      channel: this.partialGroupDMChannel(invite?.channel)
    }
  },
  inviteWithMetadata(
    invite?: DeepPartial<InviteWithMetadata>
  ): InviteWithMetadata {
    return {
      ...this.invite(invite),
      uses: 0,
      max_uses: 1,
      max_age: 1800,
      temporary: false,
      created_at: timestamp()
    }
  },

  // Permissions
  permissionOverwrite(
    overwrite?: DeepPartial<PermissionOverwrite>
  ): PermissionOverwrite {
    return {
      id: SnowflakeUtil.generate(),
      type: 'role',
      allow: PermissionsFlags.NONE,
      deny: PermissionsFlags.NONE,
      ...overwrite
    }
  },

  // Presence
  activityEmoji(emoji?: DeepPartial<ActivityEmoji>): ActivityEmoji {
    return {
      name: EMOJI_NAME,
      ...emoji
    }
  },
  activityParty(party?: DeepPartial<ActivityParty>): ActivityParty {
    return {
      ...party,
      ...(party?.size ? {size: [party.size[0] ?? 0, party.size[1] ?? 1]} : {})
    } as ActivityParty
  },
  activity(activity?: DeepPartial<Activity>): Activity {
    return {
      name: 'Twitch',
      type: ActivityType.STREAMING,
      created_at: Date.now(),
      timestamps: {},
      ...activity,
      emoji:
        activity?.emoji === null ? null : this.activityEmoji(activity?.emoji),
      party: this.activityParty(activity?.party)
    }
  },
  presence(presence?: DeepPartial<Presence>): Presence {
    return {
      status: 'offline',
      client_status: {},
      ...presence,
      game: presence?.game ? this.activity(presence.game) : null,
      user: this.user(presence?.user),
      activities: presence?.activities?.map(this.activity.bind(this)) ?? []
    }
  },

  // Team
  team(team?: DeepPartial<Team>): Team {
    const id = SnowflakeUtil.generate()
    const owner = SnowflakeUtil.generate()
    return {
      icon: null,
      id,
      owner_user_id: owner,
      ...team,
      members: team?.members?.map(m => ({
        ...this.teamMember(m),
        team_id: id
      })) ?? [
        this.teamMember({
          membership_state: MembershipState.ACCEPTED,
          user: {id: owner}
        })
      ]
    }
  },
  teamMember(member?: DeepPartial<TeamMember>): TeamMember {
    const {id, username, discriminator, avatar} = this.user(member?.user)
    return {
      membership_state: MembershipState.INVITED,
      team_id: SnowflakeUtil.generate(),
      ...member,
      permissions: ['*'],
      user: {id, username, discriminator, avatar}
    }
  },

  // User
  user(user?: DeepPartial<UserBase>): UserBase {
    return {
      id: SnowflakeUtil.generate(),
      username: 'Nelly',
      discriminator: (discriminatorCounter++).toString().padStart(4, '0'),
      avatar: null,
      ...user
    }
  },
  clientUser(user?: DeepPartial<ClientUser>): ClientUser {
    return {
      ...this.user(user),
      bot: true
    }
  },

  // Webhook
  webhook(webhook?: DeepPartial<Webhook>): Webhook {
    return {
      id: SnowflakeUtil.generate(),
      type: WebhookType.INCOMING,
      channel_id: SnowflakeUtil.generate(),
      name: 'test webhook',
      avatar: null,
      token: '',
      ...webhook,
      ...(webhook?.user ? {user: this.user(webhook)} : {})
    } as Webhook
  },

  // Voice
  voiceState(state?: DeepPartial<VoiceState>): VoiceState {
    return {
      channel_id: null,
      user_id: SnowflakeUtil.generate(),
      session_id: SnowflakeUtil.generate(),
      deaf: false,
      mute: false,
      self_deaf: false,
      self_mute: false,
      suppress: false,
      ...state,
      ...(state?.member ? {member: this.guildMember(state.member)} : {})
    } as VoiceState
  },
  voiceRegion(region?: DeepPartial<VoiceRegion>): VoiceRegion {
    return {
      id: `us-west-${voiceRegionId++}`,
      name: 'US West',
      vip: false,
      optimal: false,
      deprecated: false,
      custom: false,
      ...region
    }
  },

  clientApplication(
    application?: DeepPartial<ClientApplication>
  ): ClientApplication {
    const {id, username, discriminator, avatar} = this.user(application?.owner)
    return {
      id: SnowflakeUtil.generate(),
      name: 'Baba O-Riley',
      icon: null,
      description: 'Test',
      bot_public: false,
      bot_require_code_grant: false,
      verify_key: Buffer.from('application verify key').toString('base64'),
      ...application,
      owner: {id, username, discriminator, avatar},
      team: application?.team ? this.team(application.team) : null
    }
  }
}
