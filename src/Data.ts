import type {Snowflake} from 'discord.js'
import type {
  AuditLog,
  ClientApplication,
  ClientUser,
  DMChannel,
  FullGuild,
  GuildChannel,
  GuildPreview,
  InviteWithMetadata,
  VoiceRegion,
  Webhook
} from './discord'
import type {
  CollectionResolvable,
  DeepPartial,
  DOmit,
  Override,
  PartialCollectionResolvable
} from './utils'

export type ResolvedGuild = Override<
  GuildPreview,
  Omit<FullGuild, 'unavailable'>
> & {auditLogEntries: AuditLog.Entry[]}

export type DataGuild = DeepPartial<
  Omit<
    Override<
      Omit<ResolvedGuild, 'member_count'>,
      {channels: DOmit<GuildChannel, 'guild_id'>[]}
    >,
    'auditLogEntries'
  >
> & {
  auditLogEntries?: DOmit<AuditLog.Entry, 'id'>[]
}

export default interface Data {
  application?: ClientApplication
  user?: ClientUser

  dmChannels?: PartialCollectionResolvable<Snowflake, DMChannel, 'id'>
  guilds?: CollectionResolvable<Snowflake, DataGuild, 'id'>
  invites?: PartialCollectionResolvable<string, InviteWithMetadata, 'code'>
  webhooks?: PartialCollectionResolvable<Snowflake, Webhook, 'id'>
  voiceRegions?: PartialCollectionResolvable<string, VoiceRegion, 'id'>
}
