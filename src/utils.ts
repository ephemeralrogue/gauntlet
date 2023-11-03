import {
  Collection,
  SnowflakeUtil
} from 'discord.js'
import type { Backend } from './Backend.ts';
import type {
  PartialDeep,
  Snowflake
} from './types/index.ts';

declare global {
  interface ArrayConstructor {
    isArray(arg: unknown | readonly unknown[]): arg is readonly unknown[]
  }
}

declare module 'discord.js' {
  interface Client {
    sweepMessageInterval: NodeJS.Timeout
  }
}

export type AnyFunction =
  | ((...args: never[]) => unknown)
  | (new (...args: never[]) => unknown)

type DKeys<T> = T extends unknown ? keyof T : never
export type DOmit<T, K extends DKeys<T>> = T extends unknown
  ? Omit<T, K>
  : never

/**
 * An intersection between `T` and `U`, but the properties of `U` override the
 * properties of `T`.
 */
export type Override<T, U> = Omit<T, keyof U> & U
export type DOverride<T, U> = T extends unknown ? Override<T, U> : never

/** Make some keys required. */
export type RequireKeys<T, K extends keyof T> = T & {
  [P in keyof Pick<T, K>]-?: Exclude<T[P], undefined>
}

/** Get the keys matching a value in an object. */
export type KeysMatching<T extends object, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T]

type ObjectRemoveUndefined<T> = {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
  [K in keyof T]: Exclude<RemoveUndefined<T[K]>, undefined>
}

/** Removes `undefined` recursively from the values of an object. */
export type RemoveUndefined<T> = T extends readonly (infer U)[]
  ? number extends T['length']
  ? T extends unknown[]
  ? RemoveUndefined<U>[] // ordinary mutable array
  : readonly RemoveUndefined<U>[] // ordinary readonly array
  : { [K in keyof T]: RemoveUndefined<T[K]> } // tuple
  : T extends Collection<infer K, infer V>
  ? Collection<K, RemoveUndefined<V>>
  : T extends AnyFunction
  ? T
  : T extends object
  ? ObjectRemoveUndefined<T>
  : T

type ValueOf<T> = T[keyof T]

type Equals<T, U, True = true, False = false> = T extends U
  ? U extends T
  ? True
  : False
  : False

export type CommonProperties<T, U> = Pick<
  T,
  ValueOf<{ [K in Extract<keyof U, keyof T>]: Equals<T[K], U[K], K, never> }>
>

export type UnUnion<T> = Pick<T, keyof T> & {
  [K in T extends unknown ? keyof T : never]?: T extends unknown
  ? K extends keyof T
  ? T[K]
  : undefined
  : never
}

export type AttachmentURLs = Record<'proxy_url' | 'url', string>

const filterKeys = <T extends object>(
  object: T,
  predicate: (key: PropertyKey) => boolean
): unknown =>
  Object.fromEntries(Object.entries(object).filter(([k]) => predicate(k)))

export const pick = <T extends object, K extends keyof T>(
  object: T,
  keys: K | readonly K[]
): Pick<T, K> =>
  filterKeys(
    object,
    Array.isArray(keys)
      ? (key): boolean => (keys as readonly PropertyKey[]).includes(key)
      : (key): boolean => key === keys
  ) as Pick<T, K>

export const omit = <T extends object, K extends keyof T>(
  object: T,
  keys: K | readonly K[]
): Omit<T, K> =>
  filterKeys(
    object,
    Array.isArray(keys)
      ? (key): boolean => !(keys as readonly PropertyKey[]).includes(key)
      : (key): boolean => key !== keys
  ) as Omit<T, K>

/**
 * ```ts
 * Object.keys(object).length ? {[key]: object} : {}
 * ```
 */
export const o = <K extends PropertyKey, T extends object>(
  key: K,
  object: T
): Partial<Record<K, T>> =>
  Object.keys(object).length ? ({ [key]: object } as Record<K, T>) : {}

const isObject = <T>(x: T): x is T & object =>
  typeof x == 'object' && x !== null

const cloneImpl = <T>(x: T): T =>
  (Array.isArray(x)
    ? x.map(cloneImpl)
    : x instanceof Collection
      ? x.mapValues(cloneImpl)
      : isObject(x)
        ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cloneImpl(v)]))
        : x) as T

/**
 * Deep clones an object.
 *
 * @param object The object to clone.
 * @returns The cloned object.
 */
export const clone: <T extends object>(object: T) => T = cloneImpl

const removeUndefinedImpl = <T>(x: T): RemoveUndefined<T> =>
  (Array.isArray(x)
    ? x.map(removeUndefinedImpl)
    : x instanceof Collection
      ? x.mapValues(removeUndefinedImpl)
      : isObject(x)
        ? Object.fromEntries(
          Object.entries(x).reduce<[string, unknown][]>(
            (acc, [k, v]) =>
              v === undefined ? acc : [...acc, [k, removeUndefinedImpl(v)]],
            []
          )
        )
        : x) as RemoveUndefined<T>

export const removeUndefined: <T extends object>(
  object: T
) => RemoveUndefined<T> = removeUndefinedImpl

export const filterMap = <A extends readonly unknown[], T>(
  xs: { reduce<U>(fn: (accumulator: U, ...args: A) => U, initialValue: U): U },
  fn: (...args: A) => T | undefined
): T[] =>
  xs.reduce<T[]>((acc, ...args) => {
    const result = fn(...args)
    return result === undefined ? acc : [...acc, result]
  }, [])

export const arrayToCollection = <T extends object, U, K extends keyof U>(
  array: readonly T[] | undefined,
  key: K,
  fn: (value: T) => U
): Collection<U[K], U> =>
  new Collection<U[K], U>(
    array?.map(item => {
      const mapped = fn(item)
      return [mapped[key], mapped]
    })
  )

export type CollectionResolvable<T, K extends keyof T> =
  | Collection<T[K], PartialDeep<Omit<T, K>>>
  | readonly PartialDeep<T>[]
  | undefined

export type CollectionResolvableId<T extends { id: unknown }> =
  CollectionResolvable<T, 'id'>

const resolveCollection =
  <K extends PropertyKey>(key: K) =>
    <T extends Record<K, unknown>>(
      data: CollectionResolvable<T, K>,

      defaults: (value: PartialDeep<T>) => T
    ): Collection<T[K], T> =>
      data instanceof Collection
        ? data.mapValues((x, id) =>
          defaults({ ...x, [key]: id } as unknown as PartialDeep<T>)
        )
        : arrayToCollection<PartialDeep<T>, T, K>(data, key, defaults)

// TODO: fix inference so explicitly instantiating generic type params isn't
// required for these fns
export const resolveCollectionId = resolveCollection('id')
export const resolveCollectionUserId = resolveCollection('user_id')

export const toCollection: {
  <V extends object, K extends keyof V>(
    array: readonly V[],
    key: K
  ): Collection<V[K], V>
  <V extends Record<'id', unknown>>(array: readonly V[]): Collection<V['id'], V>
} = <V extends object, K extends keyof V>(
  array: readonly V[],
  key: K = 'id' as K
): Collection<V[K], V> => new Collection(array.map(x => [x[key], x]))

export const timestamp = (date?: Date | number): string =>
  (date instanceof Date
    ? date
    : typeof date == 'number'
      ? new Date(date)
      : new Date()
  ).toISOString()

export const randomString = (): string => Math.random().toString(36).slice(2)

export const snowflake = SnowflakeUtil.generate // as () => Snowflake

export const attachmentURLs = (
  channelId = snowflake(),
  messageId = snowflake(),
  fileName: string
): AttachmentURLs => ({
  url: `https://cdn.discordapp.com/attachments/${channelId}/${messageId}/${fileName}`,
  proxy_url: `https://media.discordapp.net/attachments/${channelId}/${messageId}/${fileName}`
})

export const clientUserId = (
  { applications }: Backend,
  applicationId: Snowflake
): Snowflake => applications.get(applicationId)!.bot.id
