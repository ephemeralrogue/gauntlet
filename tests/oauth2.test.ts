import {ClientApplication, User} from 'discord.js'
import {withClient, withClientF} from './utils'

describe('fetchApplication', () => {
  test(
    'default application',
    withClientF(async client =>
      expect(await client.application?.fetch()).toBeInstanceOf(
        ClientApplication
      )
    )
  )

  test('custom application', async () => {
    const applicationID = '0'
    const name = 'Application Name'
    const ownerUsername = 'app owner'
    const expectInstanceOf: <T, U extends T>(
      actual: T,
      expected: new (...args: never[]) => U
    ) => asserts actual is U = (actual, expected) =>
      expect(actual).toBeInstanceOf(expected)
    await withClient(
      async client => {
        const application = await client.application?.fetch()
        expectInstanceOf(application, ClientApplication)
        expect(application).toBeInstanceOf(ClientApplication)
        expect(application.name).toBe(name)
        expect(application.owner).toBeInstanceOf(User)
        expect((application.owner as User).username).toBe(ownerUsername)
      },
      {
        data: {applications: [{id: applicationID, name}]},
        clientData: {
          application: {id: applicationID, owner: {username: ownerUsername}}
        }
      }
    )
  })
})
