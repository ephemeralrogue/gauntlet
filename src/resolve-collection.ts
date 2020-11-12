import {Collection} from 'discord.js'
import type {AuditLogChange} from './types'
import type {AnyFunction, KeysMatching} from './utils'

type ObjectDataPartialDeep<T extends object> = {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
  [K in keyof T]?: DataPartialDeep<T[K]>
}

/** Deep `Partial`, but `AuditLogChange` isn't partialised. */
// I'm not bothering to resolve partial changes
export type DataPartialDeep<T> = T extends AuditLogChange
  ? T
  : T extends readonly (infer U)[]
  ? number extends T['length']
    ? T extends unknown[]
      ? DataPartialDeep<U>[] // ordinary mutable array
      : readonly DataPartialDeep<U>[] // ordinary readonly array
    : ObjectDataPartialDeep<T> // tuple
  : T extends AnyFunction
  ? T
  : T extends object
  ? ObjectDataPartialDeep<T>
  : T

/**
 * Anything that is resolvable to a Discord.js `Collection`.
 *
 * @template K The type of the keys.
 * @template PartialType The type used in `Collection`s, arrays of [key, value], and objects.
 * @template FullType The type to be used in arrays of values.
 */
type _CollectionResolvable<K, PartialType, FullType> =
  | Collection<K, PartialType>
  | readonly (FullType | readonly [K, PartialType])[]
  | (K extends PropertyKey ? Readonly<Record<K, PartialType>> : never)

/**
 * Anything, including partial data, that is resolvable to a Discord.js `Collection`.
 *
 * @template K The type of the keys.
 * @template V The type of the values.
 * @template I A key of the `V` whose value can be used as the collection key (e.g. `id`).
 */
export type CollectionResolvable<
  K,
  V,
  I extends KeysMatching<V, K> = never
> = _CollectionResolvable<K, DataPartialDeep<Omit<V, I>>, DataPartialDeep<V>>

export type Defaults<T> = (partial?: DataPartialDeep<T>) => T

/**
 * Resolves a `CollectionResolvable` to a collection.
 *
 * @param resolvable The object to be resolved.
 * @param key The property of the values to use as the collection key.
 * @param defaults The function to provide defaults to the resolvable.
 * @returns The resolved collection.
 */
export const resolveCollection = <
  K,
  V extends object,
  I extends KeysMatching<V, K>
>(
  resolvable: CollectionResolvable<K, V, I> | undefined,
  key: I,
  defaults: Defaults<V>
): Collection<K, V> =>
  resolvable instanceof Collection
    ? // Collection<K, Partial<Omit<K, V>>>
      resolvable.mapValues((x, k) =>
        defaults(({...x, [key]: k} as unknown) as DataPartialDeep<V>)
      )
    : // Create a new collection
      new Collection<K, V>(
        resolvable
          ? Array.isArray(resolvable)
            ? // readonly (Partial<V> | readonly [K, Partial<Omit<V, I>>])[]
              resolvable.map<readonly [K, V]>(item => {
                if (Array.isArray(item)) {
                  // readonly [K, Partial<Omit<V, I>>]: add id to value
                  return [
                    item[0],
                    defaults(({
                      ...item[1],
                      [key]: item[0]
                    } as unknown) as DataPartialDeep<V>)
                  ]
                }

                // Partial<V>
                const resolved = defaults(item)
                return [(resolved[key] as unknown) as K, resolved]
              })
            : // Record<K, Partial<Omit<V, I>>
              Object.entries(resolvable).map<readonly [K, V]>(
                ([_key, value]) => [
                  _key,
                  defaults(({
                    ...value,
                    [key]: _key
                  } as unknown) as DataPartialDeep<V>)
                ]
              )
          : // undefined
            undefined
      )

/**
 * Like `resolveCollection` but with the full, non-partial data.
 *
 * @param resolvable The object to be resolved.
 * @param key The property of the values to use as the collection key.
 * @returns The resolved collection.
 */
export const _resolveCollection = <
  K,
  V extends object,
  I extends KeysMatching<V, K>
>(
  resolvable: _CollectionResolvable<K, Omit<V, I>, V>,
  key: I
): Collection<K, V> =>
  resolveCollection(
    // TODO: fix this
    // @ts-ignore Expression produces a union type that is too complex to represent
    resolvable as CollectionResolvable<K, V, I>,
    key,
    value => value as V
  )
