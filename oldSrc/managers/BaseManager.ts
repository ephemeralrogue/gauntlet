import Discord from 'discord.js'
import {applyToClass} from '../util'
import type {Collection, Constructable, Snowflake} from 'discord.js'
import type LimitedCollection from '../../node_modules/discord.js/src/util/LimitedCollection'
import type {Client} from '../client'

/*
 * I can't get this working with generics (like C extends typeof Collection). TS just gives errors in the default export of
 * ./util that the constructor paramter types aren't assignable to each other because one is any[] and another has a fixed
 * length, so any[] is missing property 0, 1, 2, etc.
 * The only other collection that is used is LimitedCollection in MessageManager anyway.
 */
export interface BaseManager<Holds extends Constructable<unknown>, R> {
  new (
    client: Client,
    iterable: Iterable<Record<string, any>> | undefined,
    holds: Holds,
    cacheType?: typeof Collection
  ): Discord.BaseManager<Snowflake, InstanceType<Holds>, R>
  new (
    client: Client,
    iterable: Iterable<Record<string, any>> | undefined,
    holds: Holds,
    cacheType?: typeof LimitedCollection,
    ...cacheOptions: ConstructorParameters<typeof LimitedCollection>
  ): Discord.BaseManager<Snowflake, InstanceType<Holds>, R>
}

/*
 * All the managers extends BaseManager because BaseManager sets holds as a readonly field. If it were to extend Discord's
 * handler directly, it wouldn't be able to override the holds to be the mocked holds class.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention -- BaseManager is a class
const BaseManager = Discord.BaseManager as unknown as {
  new<Holds extends Constructable<unknown>, R> (
    client: Client,
    iterable: Iterable<Record<string, any>> | undefined,
    holds: Holds,
    cacheType?: typeof Collection
  ): Discord.BaseManager<Snowflake, InstanceType<Holds>, R>
  new<Holds extends Constructable<unknown>, R> (
    client: Client,
    iterable: Iterable<Record<string, any>> | undefined,
    holds: Holds,
    cacheType?: typeof LimitedCollection,
    ...cacheOptions: ConstructorParameters<typeof LimitedCollection>
  ): Discord.BaseManager<Snowflake, InstanceType<Holds>, R>
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- Class is a class
export default <T, Holds extends Constructable<unknown>, R>(Class: Constructable<T>):
new (...args: ConstructorParameters<BaseManager<Holds, R>>) =>
T => applyToClass(Class)(BaseManager)
