import {PermissionFlagsBits} from 'discord-api-types/v8'
import type {Snowflake} from 'discord-api-types/v8'
import type {
  DataGuildChannel,
  DataGuild,
  DataGuildMember,
  ResolvedData,
  DataChannel
} from '../types'

// const ALL_PERMISSIONS =
//   PermissionFlagsBits.ADD_REACTIONS |
//   PermissionFlagsBits.ADMINISTRATOR |
//   PermissionFlagsBits.ATTACH_FILES |
//   PermissionFlagsBits.BAN_MEMBERS |
//   PermissionFlagsBits.CHANGE_NICKNAME |
//   PermissionFlagsBits.CONNECT |
//   PermissionFlagsBits.CREATE_INSTANT_INVITE |
//   PermissionFlagsBits.DEAFEN_MEMBERS |
//   PermissionFlagsBits.EMBED_LINKS |
//   PermissionFlagsBits.KICK_MEMBERS |
//   PermissionFlagsBits.MANAGE_CHANNELS |
//   PermissionFlagsBits.MANAGE_EMOJIS |
//   PermissionFlagsBits.MANAGE_GUILD |
//   PermissionFlagsBits.MANAGE_MESSAGES |
//   PermissionFlagsBits.MANAGE_NICKNAMES |
//   PermissionFlagsBits.MANAGE_ROLES |
//   PermissionFlagsBits.MANAGE_WEBHOOKS |
//   PermissionFlagsBits.MENTION_EVERYONE |
//   PermissionFlagsBits.MOVE_MEMBERS |
//   PermissionFlagsBits.MUTE_MEMBERS |
//   PermissionFlagsBits.PRIORITY_SPEAKER |
//   PermissionFlagsBits.READ_MESSAGE_HISTORY |
//   PermissionFlagsBits.SEND_MESSAGES |
//   PermissionFlagsBits.SEND_TTS_MESSAGES |
//   PermissionFlagsBits.SEND_TTS_MESSAGES |
//   PermissionFlagsBits.STREAM |
//   PermissionFlagsBits.USE_EXTERNAL_EMOJIS |
//   PermissionFlagsBits.USE_VAD |
//   PermissionFlagsBits.VIEW_AUDIT_LOG |
//   PermissionFlagsBits.VIEW_CHANNEL |
//   PermissionFlagsBits.VIEW_GUILD_INSIGHTS

/**
 * Gets the permissions of a guild member. The `ADMINISTRATOR` permission is not
 * taken into account.
 *
 * @param guild The guild that the member is in.
 * @param member The guild member.
 * @param channel The channel to check permissions in.
 * @returns The permissions of `member` in `channel`.
 */
export const getPermissions = (
  guild: DataGuild,
  member: DataGuildMember,
  channel?: DataGuildChannel
): bigint => {
  const everyoneRole = guild.roles.find(({id}) => id === guild.id)!
  const memberRoles = new Set(member.roles)
  const roles = guild.roles.filter(({id}) => memberRoles.has(id))
  const basePerms = roles.reduce(
    (acc, role) => acc | role.permissions,
    everyoneRole.permissions
  )
  if (basePerms & PermissionFlagsBits.ADMINISTRATOR) return basePerms
  if (!channel) return basePerms

  const everyoneOverwrites = channel.permission_overwrites.find(
    ({id}) => id === guild.id
  )
  const [allow, deny] = channel.permission_overwrites.reduce(
    ([all, den], overwrite) =>
      memberRoles.has(overwrite.id)
        ? [all, den]
        : [all | overwrite.allow, den | overwrite.deny],
    [BigInt(0), BigInt(0)]
  )
  const overwritePerms =
    ((everyoneOverwrites
      ? (basePerms & ~everyoneOverwrites.deny) | everyoneOverwrites.allow
      : basePerms) &
      ~deny) |
    allow

  const memberOverwrite = channel.permission_overwrites.find(
    ({id}) => id === member.id
  )
  return memberOverwrite
    ? (overwritePerms & ~memberOverwrite.deny) | memberOverwrite.allow
    : overwritePerms
}

/**
 * Checks if some permissions have another set of permissions. The
 * `ADMINISTRATOR` permission is taken into account.
 *
 * @param x The permissions to check.
 * @param y The expected permissions.
 * @returns Whether `x` has `y`.
 */
export const hasPermissions = (x: bigint, y: bigint): boolean =>
  x & PermissionFlagsBits.ADMINISTRATOR ? true : !!(x & y)

export const getChannel = ({dm_channels, guilds}: ResolvedData) => (
  id: Snowflake
): [guild?: DataGuild, channel?: DataChannel] => {
  const dmChannel = dm_channels.get(id)
  if (dmChannel) return [undefined, dmChannel]
  for (const [, guild] of guilds)
    for (const chan of guild.channels) if (chan.id === id) return [guild, chan]
  return [undefined, undefined]
}
