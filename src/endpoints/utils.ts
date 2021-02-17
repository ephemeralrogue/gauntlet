import {PermissionFlagsBits} from 'discord-api-types/v8'
import type {DataGuild, DataGuildMember} from '../Data'

/**
 * Checks if a guild member has some permissions. The `ADMINISTRATOR` permission
 * is taken into account. This does not take into account channel overrides.
 *
 * @param guild The guild that the member is in.
 * @param member The guild member.
 * @param permissions The permissions to check.
 * @returns Whether `member` has `permissions`.
 */
export const hasPermissions = (
  guild: DataGuild,
  member: DataGuildMember,
  permissions: bigint
): boolean =>
  member.roles.some(
    roleID =>
      guild.roles.find(role => role.id === roleID)!.permissions &
      (PermissionFlagsBits.ADMINISTRATOR | permissions)
  )
