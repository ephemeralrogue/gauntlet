import type {Snowflake} from 'discord.js'

/** https://discord.com/developers/docs/resources/user#user-object-user-flags */
const enum UserFlags {
  NONE,
  DISCORD_EMPLOYEE = 1 << 0,
  DISCORD_PARTNER = 1 << 1,
  HYPESQUAD_EVENTS = 1 << 2,
  BUG_HUNTER_LEVEL_1 = 1 << 3,
  HOUSE_BRAVERY = 1 << 6,
  HOUSE_BRILLIANCE = 1 << 7,
  HOUSE_BALANCE = 1 << 8,
  EARLY_SUPPORTER = 1 << 9,
  TEAM_USER = 1 << 10,
  SYSTEM = 1 << 12,
  BUG_HUNTER_LEVEL_2 = 1 << 14
}

// /** https://discord.com/developers/docs/resources/user#user-object-premium-types */
/* const enum PremiumTypes {
  NITRO_CLASSIC = 1,
  NITRO
} */

export interface UserBase {
  id: Snowflake
  username: string
  discriminator: string
  avatar: string | null
  bot?: boolean
  system?: boolean
  locale?: string
  // email?: string
  // flags?: UserFlags
  // premium_type?: PremiumTypes
  public_flags?: UserFlags
}

export interface ClientUser extends UserBase {
  mfa_enabled?: boolean
  verified?: boolean
}

/** https://discord.com/developers/docs/resources/user#user-object */
export type User = UserBase | ClientUser

export interface ModifyCurrentUserParams {
  username?: string
  avatar?: string
}
