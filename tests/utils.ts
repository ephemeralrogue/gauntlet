import * as D from 'discord.js'
import * as DM from '../src'
import type {ClientData, Data} from '../src'

export const testWithClient = ({
  name,
  data,
  clientData,
  fn
}: {
  name: string
  data?: Data
  clientData?: ClientData
  fn: (client: D.Client) => Promise<void>
}): void =>
  /* eslint-disable jest/expect-expect, jest/valid-title -- helper fn */
  describe(name, () => {
    test('mockClient', async () => {
      const client = new D.Client()
      DM.mockClient(client, clientData, new DM.Backend(data))
      await fn(client)
    })

    test('new DM.Client()', async () =>
      fn(new DM.Client(undefined, clientData, new DM.Backend(data))))
  })
/* eslint-enable jest/expect-expect, jest/valid-title -- helper fn */
