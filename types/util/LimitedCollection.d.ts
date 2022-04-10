import {Collection} from 'discord.js'

declare class LimitedCollection<K, V> extends Collection<K, V> {
  // static get [Symbol.species](): typeof Collection
  maxSize: number
  constructor(maxSize?: number, iterable?: readonly (readonly [K, V])[] | null)
}

export = LimitedCollection
