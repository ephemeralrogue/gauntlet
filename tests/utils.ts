import * as D from 'discord.js'
import * as DM from '../src'
import type {AnyFunction} from '../src/utils'

export const expectNotToBeNull: <T>(
  actual: T
) => asserts actual is Exclude<T, null> = actual =>
  expect(actual).not.toBeNull()

/* eslint-disable @typescript-eslint/ban-types -- any object */
type ObjectDeepPartialOmit<T extends object, O extends PropertyKey> = {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive
  [K in keyof T as Exclude<K, O>]?: DeepPartialOmit<T[K], O>
}

export type DeepPartialOmit<
  T,
  O extends PropertyKey = never
> = T extends readonly (infer U)[]
  ? number extends T['length']
    ? T extends unknown[]
      ? DeepPartialOmit<U>[] // ordinary mutable array
      : readonly DeepPartialOmit<U>[] // ordinary readonly array
    : ObjectDeepPartialOmit<T, O> // tuple
  : T extends AnyFunction
  ? T
  : T extends Map<infer K, infer V>
  ? Map<DeepPartialOmit<K, O>, DeepPartialOmit<V, O>>
  : T extends object
  ? ObjectDeepPartialOmit<T, O>
  : T
/* eslint-enable @typescript-eslint/ban-types */

// Omitting valueOf because ({...}).valueOf() is Object, whereas
// (guild as D.Guild).valueOf() is string
export type MatchObjectGuild = DeepPartialOmit<D.Guild, 'valueOf'>

interface WithClientOptions {
  intents?: D.ClientOptions['intents']
  backend?: DM.Backend
  applicationId?: DM.Snowflake
}

const defaultIntents = new D.Intents([
  'GUILDS',
  'GUILD_MESSAGES',
  'GUILD_MESSAGE_REACTIONS',
  'DIRECT_MESSAGES',
  'DIRECT_MESSAGE_REACTIONS'
])

export const withClient = <T>(
  fn: (client: D.Client) => T,
  {intents = defaultIntents, backend, applicationId}: WithClientOptions = {}
): T => fn(new DM.Client({intents}, backend, applicationId))

export const withClientF =
  <T>(fn: (client: D.Client) => T, options?: WithClientOptions) =>
  (): T =>
    withClient(fn, options)
