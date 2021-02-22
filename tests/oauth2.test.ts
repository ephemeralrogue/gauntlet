import {ClientApplication, User} from 'discord.js'
import {_withClient, withClient} from './utils'

describe('fetchApplication', () => {
  test(
    'default application',
    withClient(async client =>
      expect(await client.fetchApplication()).toBeInstanceOf(ClientApplication)
    )
  )

  test('custom application', async () => {
    const applicationID = '0'
    const name = 'Application Name'
    const ownerUsername = 'app owner'
    await _withClient(
      async client => {
        const application = await client.fetchApplication()
        expect(application).toBeInstanceOf(ClientApplication)
        expect(application.name).toBe(name)
        expect(application.owner).toBeInstanceOf(User)
        expect((application.owner as User).username).toBe(ownerUsername)
      },
      {
        data: {applications: {[applicationID]: {name}}},
        clientData: {
          application: {id: applicationID, owner: {username: ownerUsername}}
        }
      }
    )
  })
})
