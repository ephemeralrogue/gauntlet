import {SnowflakeUtil} from 'discord.js'
import type {Snowflake} from 'discord-api-types/v8'

declare global {
  interface ArrayConstructor {
    isArray(arg: unknown | readonly unknown[]): arg is readonly unknown[]
  }
}

export type NonEmptyArray<T> = [T, ...T[]]

/**
 * An intersection between `T` and `U`, but the properties of `U` override the
 * properties of `T`.
 */
export type Override<T, U> = Omit<T, keyof U> & U

/** Make some keys required. */
export type RequireKeys<T, K extends keyof T> = Required<Pick<T, K>> & T

/** Get the keys matching a value in an object. */
export type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T]

type ValueOf<T> = T[keyof T]

type Equals<T, U, True = true, False = false> = T extends U
  ? U extends T
    ? True
    : False
  : False

export type CommonProperties<T, U> = Pick<
  T,
  ValueOf<{[K in Extract<keyof U, keyof T>]: Equals<T[K], U[K], K, never>}>
>

export type AnyFunction =
  | ((...args: never[]) => unknown)
  | (new (...args: never[]) => unknown)

const isObject = <T>(x: T): x is T & object =>
  typeof x == 'object' && x !== null

/**
 * Deep clones an object.
 *
 * @param object The object to clone.
 * @returns The cloned object.
 */
export const clone = <T extends object>(object: T): T => {
  const _clone = <U>(x: U): U =>
    (Array.isArray(x)
      ? x.map(_clone)
      : typeof x == 'object' && ((x as unknown) as object | null)
      ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, _clone(v)]))
      : x) as U
  return _clone(object)
}

/**
 * Removes `undefined` values from an object.
 *
 * This doesn't have an `object` constraint on `T` because of issues like
 * `DataPartialDeep<T>` not being assignable to `object`.
 *
 * WARNING: This is technically ill-typed. For example:
 *
 * ```ts
 * interface A {
 *   a: undefined
 * }
 * const a: A = {a: undefined}
 * // has type A but at runtime is {}, which lacks the a property
 * const bad = removeUndefined(a)
 * ```
 *
 * @param object The object to remove undefined values form.
 * @returns The object without the undefined values, or simply `object` if
 * `object` is not an object (e.g. `undefined`).
 */
export const removeUndefined = <T>(object: T): T =>
  isObject(object)
    ? (Object.fromEntries(
        Object.entries(object).filter(([, v]) => v !== undefined)
      ) as T)
    : object

export const timestamp = (date?: Date | number): string =>
  (date instanceof Date
    ? date
    : typeof date == 'number'
    ? new Date(date)
    : new Date()
  ).toISOString()

export const snowflake = SnowflakeUtil.generate as () => Snowflake
