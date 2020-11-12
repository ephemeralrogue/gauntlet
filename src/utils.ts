import {SnowflakeUtil} from 'discord.js'
import type {Snowflake} from 'discord-api-types/v8'

declare global {
  interface ArrayConstructor {
    isArray(arg: unknown | readonly unknown[]): arg is readonly unknown[]
  }

  interface ObjectConstructor {
    entries<K extends PropertyKey, V>(o: Readonly<Record<K, V>>): [K, V][]
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

// eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
type ObjectPartialDeep<T extends object> = {[K in keyof T]?: PartialDeep<T[K]>}

/** Deep `Partial`. */
type PartialDeep<T> = T extends readonly (infer U)[]
  ? number extends T['length']
    ? T extends unknown[]
      ? PartialDeep<U>[] // ordinary mutable array
      : readonly PartialDeep<U>[] // ordinary readonly array
    : ObjectPartialDeep<T> // tuple
  : T extends AnyFunction
  ? T
  : T extends object
  ? ObjectPartialDeep<T>
  : T

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
      ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, clone(v)]))
      : x) as U
  return _clone(object)
}

export const timestamp = (date?: Date | number): string =>
  (date instanceof Date
    ? date
    : typeof date == 'number'
    ? new Date(date)
    : new Date()
  ).toISOString()

export const snowflake = SnowflakeUtil.generate as () => Snowflake
