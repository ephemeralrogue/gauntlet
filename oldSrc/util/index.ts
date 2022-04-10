import {Constants, DiscordAPIError} from 'discord.js'
import {Util} from './Util'
// eslint-disable-next-line node/prefer-global/url-search-params -- I'm typing the global var here
import type {URLSearchParams as _URLSearchParams} from 'url'
import type Discord from 'discord.js'
import type * as Data from '../data'
import type {DMChannel, GuildChannel, GuildChannelBase, GuildMember} from '../structures'

type PermissionResolvable = Discord.PermissionResolvable

// eslint-disable-next-line @typescript-eslint/naming-convention -- destructuring
const {ChannelTypes} = Constants

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- URLSearchParams is a class
  const URLSearchParams: typeof _URLSearchParams
}

type Id<T> = unknown & {[K in keyof T]: T[K]}
// {} is required for it to be this type to be
// eslint-disable-next-line @typescript-eslint/ban-types -- inherited and Record<string, unknown> causes errors
export type Constructable<T = {}> = Discord.Constructable<T>
export type ArrayType<T extends any[]> = T extends (infer U)[] ? U : never
export type ValueOf<T> = T[keyof T]
export type Override<T, U> = Omit<T, keyof U> & U
export type PartialKey<T, K extends keyof T> = Override<T, Partial<Pick<T, K>>>
export type DeepPartial<T> = {[K in keyof T]?: DeepPartial<T[K]>}

// object is used in Discord.js' type signature and Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/ban-types -- causes errors because some types don't have index signatures
export const mergeDefault = <T extends object, U extends object>(
  def: T, given: U = {} as U
): Id<{[K in keyof U]-?: undefined extends U[K] ? K extends keyof T ? (Exclude<U[K], undefined> | T[K]) : U[K] : U[K]} &
Omit<T, keyof U>> =>
  Util.mergeDefault(def, given) as
  Id<{[K in keyof U]-?: undefined extends U[K] ? K extends keyof T ? (Exclude<U[K], undefined> | T[K]) : U[K] : U[K]} &
  Omit<T, keyof U>>

export const sanitiseChannelName = (name: string, type: GuildChannelBase['type'] | number): string =>
  (
    (['text', 'dm', ChannelTypes.TEXT, ChannelTypes.CATEGORY] as (typeof type)[]).includes(type)
      ? name.replace(/\s+/ug, '-').toLowerCase()
      : name
  ).trim()

const errors = {
  // Normally 404 for but 400 when trying to move a member into a voice channel
  UNKNOWN_CHANNEL: [10003, 'Unknown Channel', 400],
  UNKNOWN_GUILD: [10004, 'Unknown Guild', 404],
  UNKNOWN_INTEGRATION: [10005, 'Unknown Integration', 404],
  UNKNOWN_INVITE: [10006, 'Unknown Invite', 404],
  UNKNOWN_MESSAGE: [10008, 'Unknown Message', 404],
  UNKNOWN_EMOJI: [10014, 'Unknown Emoji', 404],
  UNKNOWN_BAN: [10026, 'Unknown Ban', 404],
  MAX_GUILDS: [30001, 'Maximum number of guilds reached (10)', 400],
  MAX_PINS: [30003, 'Maximum number of pins reached (50)', 400],
  NO_VOICE: [40032, 'Target user is not connected to voice.', 400],
  MISSING_ACCESS: [50001, 'Missing Access', 403],
  DM_CHANNEL: [50003, 'Cannot execute action on a DM channel', 403],
  EDIT_OTHER_USERS_MESSAGE: [50005, 'Cannot edit a message authored by another user', 403],
  MISSING_PERMISSIONS: [50013, 'Missing Permissions', 403],
  SYSTEM_MESSAGE: [50021, 'Cannot execute action on a system message', 400],
  MESSAGE_TOO_OLD: [50034, 'You can only bulk delete messages that are under 14 days old.', 400],
  INVALID_FORM_BODY: [50035, 'Invalid Form Body', 400]
} as const

export type ErrorCode = keyof typeof errors
export type Method = 'get' | 'put' | 'patch' | 'post' | 'delete'

export const timestamp = (date?: number | Date): Data.Timestamp =>
  (date instanceof Date ? date : typeof date == 'number' ? new Date(date) : new Date()).toISOString()

export const apiError: (error: ErrorCode, path: string, method: Method, extra?: Record<string, any>) => never = (
  error: keyof typeof errors, path: string, method: Method, extra?: Record<string, any>
): never => {
  const [code, message, status] = errors[error]
  throw new DiscordAPIError(path, {code, message, ...extra ? {errors: extra} : {}}, method, status)
}

export const throwPermissionsError = (
  me: GuildMember | null | undefined, permissions: PermissionResolvable, path: string, method: Method
): void => {
  if (!me?.hasPermission(permissions)) apiError('MISSING_PERMISSIONS', path, method)
}

export const channelThrowPermissionsError = (
  channel: DMChannel | GuildChannelBase | GuildChannel,
  permissions: PermissionResolvable,
  path: string,
  method: Method,
  throwOnDm = false
): void => {
  if (throwOnDm && !('guild' in channel)) apiError('DM_CHANNEL', path, method)
  if ('guild' in channel && channel.guild.me && !channel.permissionsFor(channel.guild.me)?.has(permissions))
    apiError('MISSING_PERMISSIONS', path, method)
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- Base is a class
export const applyToClass = <T extends Constructable>(Base: T) =>
  <U extends Constructable>(
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Class is a class
    Class: U
  ): new (...args: ConstructorParameters<U>) => InstanceType<T> & InstanceType<U> => {
    const className = `${Base.name}Mixin`
    // eslint-disable-next-line @typescript-eslint/naming-convention -- _Class is a class
    const _Class = {[className]: class extends Class {}}[className]
    const existing = Object.getOwnPropertyNames(_Class.prototype)
    Object.getOwnPropertyNames(Base.prototype).forEach(name => {
      if (!existing.includes(name))
        Object.defineProperty(_Class.prototype, name, Object.getOwnPropertyDescriptor(Base.prototype, name)!)
    })
    return _Class as unknown as new (...args: ConstructorParameters<U>) => InstanceType<T> & InstanceType<U>
  }

export * from './Util'
