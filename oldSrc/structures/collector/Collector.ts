import Discord from 'discord.js'
import type {Collection, CollectorFilter, CollectorOptions, Snowflake} from 'discord.js'
import type {Client} from '../../client'

export type CollectorEnd<T> = Parameters<(collected: Collection<Snowflake, T>, reason: string) => void>

export interface _Collector {
  readonly client: Client
}

export interface Collector<K, V> extends Discord.Collector<K, V> {
  readonly client: Client
}

declare abstract class C<K, V> extends Discord.Collector<K, V> {
  constructor(client: Client, filter: CollectorFilter, options?: CollectorOptions)
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- class
export const Collector = Discord.Collector as typeof C
