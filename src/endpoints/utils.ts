import {PermissionFlagsBits} from 'discord-api-types/v9'
import type {Backend} from '../Backend'
import type {
  Channel,
  Guild,
  GuildChannel,
  GuildMember,
  NewsChannel,
  Snowflake,
  TextChannel
} from '../types'

// const ALL_PERMISSIONS =
//   PermissionFlagsBits.AddReactions |
//   PermissionFlagsBits.Administrator |
//   PermissionFlagsBits.AttachFiles |
//   PermissionFlagsBits.BanMembers |
//   PermissionFlagsBits.ChangeNickname |
//   PermissionFlagsBits.Connect |
//   PermissionFlagsBits.CreateInstantInvite |
//   PermissionFlagsBits.DeafenMembers |
//   PermissionFlagsBits.EmbedLinks |
//   PermissionFlagsBits.KickMembers |
//   PermissionFlagsBits.ManageChannels |
//   PermissionFlagsBits.ManageEmojis |
//   PermissionFlagsBits.ManageGuild |
//   PermissionFlagsBits.ManageMessages |
//   PermissionFlagsBits.ManageNicknames |
//   PermissionFlagsBits.ManageRoles |
//   PermissionFlagsBits.MnaageWebhooks |
//   PermissionFlagsBits.MentionEveryone |
//   PermissionFlagsBits.MoveMembers |
//   PermissionFlagsBits.MuteMembers |
//   PermissionFlagsBits.PrioritySpeaker |
//   PermissionFlagsBits.ReadMessageHistory |
//   PermissionFlagsBits.SendMessages |
//   PermissionFlagsBits.SendTTSMessages |
//   PermissionFlagsBits.SendTTSMessages |
//   PermissionFlagsBits.Stream |
//   PermissionFlagsBits.UseExternalEmojis |
//   PermissionFlagsBits.UseVAD |
//   PermissionFlagsBits.ViewAuditLog |
//   PermissionFlagsBits.ViewChannel |
//   PermissionFlagsBits.ViewGuildInsights

/**
 * Gets the permissions of a guild member. The `Administrator` permission is not
 * taken into account.
 *
 * @param guild The guild that the member is in.
 * @param member The guild member.
 * @param channel The channel to check permissions in.
 * @returns The permissions of `member` in `channel`.
 */
export const getPermissions = (
  guild: Guild,
  member: GuildMember,
  channel?: GuildChannel
): bigint => {
  const everyoneRole = guild.roles.get(guild.id)!
  const memberRoles = new Set(member.roles)
  const roles = guild.roles.filter(({id}) => memberRoles.has(id))
  const basePerms = roles.reduce(
    (acc, role) => acc | role.permissions,
    everyoneRole.permissions
  )
  if (basePerms & PermissionFlagsBits.Administrator) return basePerms
  if (!channel) return basePerms

  const permissionOverwrites = (
    'permission_overwrites' in channel
      ? channel
      : (guild.channels.get(channel.parent_id) as NewsChannel | TextChannel)
  ).permission_overwrites
  const everyoneOverwrites = permissionOverwrites.get(guild.id)
  const [allow, deny] = permissionOverwrites.reduce(
    ([all, den], overwrite) =>
      memberRoles.has(overwrite.id)
        ? [all, den]
        : [all | overwrite.allow, den | overwrite.deny],
    [0n, 0n]
  )
  const overwritePerms =
    ((everyoneOverwrites
      ? (basePerms & ~everyoneOverwrites.deny) | everyoneOverwrites.allow
      : basePerms) &
      ~deny) |
    allow

  const memberOverwrite = permissionOverwrites.get(member.id)
  return memberOverwrite
    ? (overwritePerms & ~memberOverwrite.deny) | memberOverwrite.allow
    : overwritePerms
}

/**
 * Checks if some permissions have another set of permissions. The
 * `Administrator` permission is taken into account.
 *
 * @param x The permissions to check.
 * @param y The expected permissions.
 * @returns Whether `x` has `y`.
 */
export const hasPermissions = (x: bigint, y: bigint): boolean =>
  x & PermissionFlagsBits.Administrator ? true : !!(x & y)

export const getChannel =
  ({dmChannels, guilds}: Backend) =>
  (id: Snowflake): [guild: Guild | undefined, channel: Channel | undefined] => {
    const dmChannel = dmChannels.get(id)
    if (dmChannel) return [undefined, dmChannel]
    for (const [, guild] of guilds) {
      const channel = guild.channels.get(id)
      if (channel) return [guild, channel]
    }
    return [undefined, undefined]
  }
