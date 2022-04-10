import type WS from 'ws'

type Tail<T extends any[]> = ((...args: T) => any) extends (x: any, ...rest: infer U) => any ? U : never

declare module 'discord.js' {
  let discordSort: typeof Util['discordSort']
  let escapeMarkdown: typeof Util['escapeMarkdown']
  let fetchRecommendedShards: typeof Util['fetchRecommendedShards']
  let resolveColor: typeof Util['resolveColor']
  let resolveString: typeof Util['resolveString']
  let splitMessage: typeof Util['splitMessage']

  // eslint-disable-next-line @typescript-eslint/no-namespace -- augmenting module
  namespace WebSocket {
    // eslint-disable-next-line no-shadow, @typescript-eslint/naming-convention -- needed
    let WebSocket: typeof WS
    let encoding: 'etf' | 'json'
    let pack: ((data: any) => Buffer) | typeof JSON.stringify
    let unpack: (data: WS.Data, type?: 'json') => any
    let create: (gateway: string, query?: Record<string, string>, ...args: Tail<ConstructorParameters<typeof WS>>) => WS
    let CONNECTING: number
    let OPEN: number
    let CLOSING: number
    let CLOSED: number
  }
}

export {Client, WebhookClient} from './client'

export {
  ChannelManager, GuildChannelManager, GuildEmojiManager, GuildEmojiRoleManager, GuildManager, GuildMemberManager,
  MessageManager, ReactionManager, ReactionUserManager, RoleManager, PresenceManager, UserManager, VoiceStateManager
} from './managers'

export {
  Activity, Base, BaseGuildEmoji, CategoryChannel, Channel, ClientApplication, ClientPresence, ClientUser, Collector,
  DMChannel, Emoji, Guild, GuildAuditLogs, GuildAuditLogsEntry, GuildAuditLogsTarget, GuildChannel, GuildEmoji, GuildMember,
  GuildMemberEditData, GuildPreview, GuildPreviewEmoji, Integration, Invite, Message, MessageCollector, MessageMentions,
  MessageReaction, NewsChannel, PartialGroupDMChannel, PermissionOverwrites, Presence, PresenceData, ReactionCollector,
  ReactionEmoji, Role, StoreChannel, Team, TeamMember, TextBasedChannel, TextChannel, User, VoiceChannel, VoiceRegion,
  VoiceState, Webhook
} from './structures'
export * from './structures'

export {Util} from './util'

export {default as TestUser} from './TestUser'

export * from 'discord.js'
