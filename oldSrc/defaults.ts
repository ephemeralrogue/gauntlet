import {SnowflakeUtil} from 'discord.js'
import * as Data from './data'
import {timestamp} from './util'

const inviteCodes: string[] = []
const generateInviteCode = (): string => {
  const code = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 5)
  if (inviteCodes.includes(code)) return generateInviteCode()
  inviteCodes.push(code)
  return code
}

const emoji: Data.Emoji = {
  id: null,
  // fire emoji
  name: '\u{1f525}',
  animated: false
}

const guildAuditLog: Data.AuditLog = {
  webhooks: [],
  users: [],
  audit_log_entries: [],
  integrations: []
}

const messageReaction: Data.Reaction = {
  count: 1,
  me: false,
  emoji
}

const voiceRegion: Data.VoiceRegion = {
  id: 'us-east',
  name: 'US East',
  vip: false,
  optimal: false,
  deprecated: false,
  custom: false
}

let discriminator = 0

export default {
  get ban(): Data.Ban {
    return {
      reason: null,
      user: this.user
    }
  },

  get channel(): Data.ChannelBase {
    return {
      id: SnowflakeUtil.generate(),
      type: Data.ChannelType.GUILD_TEXT
    }
  },
  get guildChannelBase(): Data.GuildChannelBase {
    return {
      ...this.channel,
      guild_id: SnowflakeUtil.generate(),
      type: Data.ChannelType.GUILD_TEXT,
      position: 0,
      name: 'general',
      parent_id: null
    }
  },
  get guildChannel(): Data.GuildChannel {
    return this.textChannel
  },
  get categoryChannel(): Data.CategoryChannel {
    return {
      ...this.guildChannelBase,
      type: Data.ChannelType.GUILD_CATEGORY
    }
  },
  get storeChannel(): Data.StoreChannel {
    return {
      ...this.guildChannelBase,
      type: Data.ChannelType.GUILD_STORE
    }
  },
  get voiceChannel(): Data.VoiceChannel {
    return {
      ...this.guildChannelBase,
      type: Data.ChannelType.GUILD_VOICE
    }
  },
  get textChannel(): Data.TextChannel {
    return {
      ...this.channel,
      ...this.guildChannelBase,
      type: Data.ChannelType.GUILD_TEXT,
      topic: null,
      last_message_id: null
    }
  },
  get newsChannel(): Data.NewsChannel {
    return {
      ...this.textChannel,
      type: Data.ChannelType.GUILD_NEWS
    }
  },
  get dmChannel(): Data.DMChannel {
    return {
      ...this.channel,
      type: Data.ChannelType.DM,
      last_message_id: null,
      recipients: [this.user]
    }
  },
  get partialGroupDMChannel(): Data.PartialGroupDMChannel {
    return {
      ...this.channel,
      type: Data.ChannelType.GROUP_DM,
      name: null
    }
  },

  get clientApplication(): Data.ClientApplication {
    return {
      id: SnowflakeUtil.generate(),
      name: 'Baba O-Riley',
      icon: null,
      description: 'Test',
      bot_public: false,
      bot_require_code_grant: false,
      owner: {
        id: SnowflakeUtil.generate(),
        username: 'i own a bot',
        discriminator: '1738',
        avatar: null
      },
      verify_key: Buffer.from('application verify key').toString('base64'),
      team: null
    }
  },
  get clientApplicationAsset(): Data.ClientApplicationAsset {
    return {
      id: SnowflakeUtil.generate(),
      name: 'asset_name',
      type: Data.ClientApplicationAssetType.SMALL
    }
  },

  emoji,
  get guildEmoji(): Data.GuildEmoji {
    return {
      id: SnowflakeUtil.generate(),
      name: null,
      roles: [],
      user: this.user,
      require_colons: true,
      managed: false,
      animated: false
    }
  },

  get guild(): Data.Guild {
    const id = SnowflakeUtil.generate()
    return {
      id,
      name: 'Discord Developers',
      icon: null,
      splash: null,
      owner_id: SnowflakeUtil.generate(),
      region: 'us-east',
      afk_channel_id: null,
      afk_timeout: 300,
      verification_level: Data.VerificationLevel.NONE,
      default_message_notifications: Data.DefaultMessageNotificationLevel.ALL_MESSAGES,
      explicit_content_filter: Data.ExplicitContentFilterLevel.DISABLED,
      roles: [{...this.role, id}],
      emojis: [],
      features: [],
      mfa_level: Data.MFALevel.NONE,
      application_id: null,
      system_channel_id: null,
      system_channel_flags: 0,
      rules_channel_id: null,
      vanity_url_code: null,
      description: null,
      banner: null,
      premium_tier: Data.PremiumTier.NONE,
      public_updates_channel_id: null
    }
  },
  get guildPreview(): Data.GuildPreview {
    return {
      id: SnowflakeUtil.generate(),
      name: 'Discord Testers',
      icon: null,
      splash: null,
      discovery_splash: null,
      emojis: [],
      features: [],
      approximate_member_count: 1,
      approximate_presence_count: 0,
      description: null
    }
  },

  guildAuditLog,
  get guildAuditLogEntry(): Data.AuditLogEntry {
    return {
      target_id: SnowflakeUtil.generate(),
      action_type: Data.AuditLogEvent.GUILD_UPDATE,
      user_id: SnowflakeUtil.generate(),
      id: SnowflakeUtil.generate(),
      changes: [{
        key: 'afk_channel_id',
        old_value: SnowflakeUtil.generate()
      }]
    }
  },

  get guildMember(): Data.GuildMember {
    return {
      user: this.user,
      roles: [],
      joined_at: timestamp(),
      deaf: false,
      mute: false
    }
  },

  get integration(): Data.Integration {
    return {
      id: SnowflakeUtil.generate(),
      name: 'integration name',
      type: 'youtube',
      enabled: false,
      syncing: false,
      role_id: SnowflakeUtil.generate(),
      expire_behavior: Data.IntegrationExpireBehavior.REMOVE_ROLE,
      expire_grace_period: 1,
      user: this.user,
      account: {
        id: SnowflakeUtil.generate(),
        name: 'account name'
      },
      synced_at: timestamp()
    }
  },

  get invite(): Data.Invite {
    return {
      code: generateInviteCode(),
      channel: {
        id: SnowflakeUtil.generate(),
        type: Data.ChannelType.GUILD_TEXT,
        name: 'illuminati'
      }
    }
  },
  get inviteWithMetadata(): Data.InviteWithMetadata {
    return {
      ...this.invite,
      uses: 0,
      max_uses: 1,
      max_age: 1800,
      temporary: false,
      created_at: timestamp()
    }
  },

  get message(): Data.Message {
    return {
      id: SnowflakeUtil.generate(),
      channel_id: SnowflakeUtil.generate(),
      author: {
        id: SnowflakeUtil.generate(),
        username: 'Mason',
        discriminator: '9999',
        avatar: null
      },
      timestamp: timestamp(),
      edited_timestamp: null,
      tts: false,
      mention_everyone: false,
      mentions: [],
      mention_roles: [],
      attachments: [],
      embeds: [],
      pinned: false,
      type: Data.MessageType.DEFAULT
    }
  },

  messageReaction,

  get permissionOverwrites(): Data.PermissionOverwrite {
    return {
      id: SnowflakeUtil.generate(),
      type: 'role',
      allow: Data.PermissionsFlags.NONE,
      deny: Data.PermissionsFlags.NONE
    }
  },

  get presence(): Data.Presence {
    return {
      user: this.user,
      game: null,
      status: 'offline',
      activities: [],
      client_status: {}
    }
  },
  get activity(): Data.Activity {
    return {
      name: 'Twitch',
      type: Data.ActivityType.STREAMING,
      created_at: Date.now(),
      timestamps: {}
    }
  },

  get role(): Data.Role {
    return {
      id: SnowflakeUtil.generate(),
      name: '@everyone',
      color: 0,
      hoist: false,
      position: 0,
      permissions: Data.PermissionsFlags.NONE,
      managed: false,
      mentionable: false
    }
  },

  get teamMember(): Data.TeamMember {
    return {
      membership_state: Data.MembershipState.INVITED,
      permissions: ['*'],
      team_id: SnowflakeUtil.generate(),
      user: this.user
    }
  },
  get team(): Data.Team {
    const id = SnowflakeUtil.generate()
    const owner = this.user
    return {
      icon: null,
      id,
      members: [{
        membership_state: Data.MembershipState.ACCEPTED,
        permissions: ['*'],
        team_id: id,
        user: owner
      }],
      owner_user_id: owner.id
    }
  },

  get user(): Data.UserBase {
    return {
      id: SnowflakeUtil.generate(),
      username: 'Nelly',
      discriminator: (discriminator++).toString().padStart(4, '0'),
      avatar: null
    }
  },
  get clientUser(): Data.ClientUser {
    return {
      id: SnowflakeUtil.generate(),
      username: 'bot username',
      discriminator: '0000',
      bot: true,
      avatar: null
    }
  },

  voiceRegion,
  get voiceState(): Data.VoiceState {
    return {
      channel_id: null,
      user_id: SnowflakeUtil.generate(),
      session_id: SnowflakeUtil.generate(),
      deaf: false,
      mute: false,
      self_deaf: false,
      self_mute: false,
      suppress: false
    }
  },

  get webhook(): Data.Webhook {
    return {
      id: SnowflakeUtil.generate(),
      type: Data.WebhookType.INCOMING,
      channel_id: SnowflakeUtil.generate(),
      name: 'test webhook',
      avatar: null,
      token: ''
    }
  }
}
