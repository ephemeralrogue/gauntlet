import {Collection} from 'discord.js'
import {defaults} from '../defaults'
import type {DKeys, DOmit} from './utils'

export * from './utils'

export type ArrayType<T extends any[]> = T extends (infer U)[] ? U : never

type DKeysMatching<T, V> = {
  [K in DKeys<T>]: NonNullable<T[K]> extends V ? K : never
}[DKeys<T>]

export type DeepPartial<T> = {
  // T[K] could already be nullable, infer V is for distribution
  [K in keyof T]?: NonNullable<T[K]> extends infer V
    ? V extends (infer U)[]
      ? number extends V['length']
        ? DeepPartial<U>[] // Ordinary array
        : DeepPartial<V> // Tuple, make each element partial
      : V extends object
      ? DeepPartial<T[K]> // Object
      : T[K] // Primitive
    : never
}

export type CollectionResolvable<K, V, I extends DKeysMatching<V, K> = never> =
  | Collection<K, DOmit<V, I>>
  | (V | [K, DOmit<V, I>])[]
  | (K extends keyof any ? Record<K, DOmit<V, I>> : never)

export type PartialCollectionResolvable<
  K,
  V,
  I extends DKeysMatching<V, K> = never
> = CollectionResolvable<
  K,
  DeepPartial<V>,
  Extract<I, DKeysMatching<DeepPartial<V>, K>>
>

declare global {
  interface ObjectConstructor {
    entries<K extends string, V>(o: Record<K, V>): [K, V][]
  }
}

const _resolveCollection = <K, V, I extends DKeysMatching<V, K>>(
  resolvable: CollectionResolvable<K, V, I>,
  key: I
): Collection<K, V> =>
  resolvable instanceof Collection
    ? // Collection<K, Omit<V, K>>: add ids to values
      resolvable.mapValues(
        (item, _key) => (({...item, [key]: _key} as unknown) as V)
      )
    : // Create a new collection
      new Collection(
        Array.isArray(resolvable)
          ? // ([K, Omit<V, I>] | V)[]
            resolvable.map(item =>
              Array.isArray(item)
                ? // [K, Omit<V, I>]: add key to value
                  ([
                    item[0],
                    ({...item[1], [key]: item[0]} as unknown) as V
                  ] as const)
                : // V
                  ([(item[key] as unknown) as K, item] as const)
            )
          : // Record<K, Omit<V, I>>
            Object.entries<Extract<K, string>, DOmit<V, I>>(resolvable).map(
              ([_key, item]) =>
                [_key, ({...item, [key]: _key} as unknown) as V] as const
            )
      )

export const resolveCollection = <K, V, I extends DKeysMatching<V, K>, R>(
  resolvable: CollectionResolvable<K, V, I>,
  key: I,
  default_: DKeysMatching<typeof defaults, (partial?: V) => R>
): Collection<K, R> =>
  _resolveCollection(resolvable, key).mapValues(
    (defaults[default_] as unknown) as (
      this: typeof defaults,
      partial?: V
    ) => R,
    defaults
  )
