import * as D from 'discord.js'
import * as DM from '../src'
import type {AnyFunction} from '../src/utils'

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

export const testWithClient = ({
  name,
  data,
  clientData,
  fn,
  testFn = test
}: {
  name: string
  data?: DM.Data
  clientData?: DM.ClientData
  fn: (client: D.Client) => Promise<void>
  testFn?: (name: string, fn?: jest.EmptyFunction) => void
}): void =>
  // eslint-disable-next-line jest/valid-title -- helper fn
  describe(name, () => {
    testFn('mockClient', async () => {
      const client = new D.Client()
      DM.mockClient(client, clientData, new DM.Backend(data))
      await fn(client)
    })

    testFn('new DM.Client()', async () =>
      fn(new DM.Client(undefined, clientData, new DM.Backend(data)))
    )
  })
