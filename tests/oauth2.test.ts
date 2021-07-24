import {ClientApplication, User} from 'discord.js'
import {expectNotToBeNull, withClient, withClientF} from './utils'
import './matchers'

describe('fetchApplication', () => {
  test(
    'default application',
    withClientF(async client => {
      expectNotToBeNull(client.application)
      await expect(client.application.fetch()).toResolve()
    })
  )

  test('custom application', async () => {
    const applicationId = '0'
    const name = 'Application Name'
    const ownerUsername = 'app owner'
    await withClient(
      async client => {
        expectNotToBeNull(client.application)
        const application = await client.application.fetch()
        expect(application).toBeInstanceOf(ClientApplication)
        expect(application.name).toBe(name)
        expect(application.owner).toBeInstanceOf(User)
        expect((application.owner as User).username).toBe(ownerUsername)
      },
      {
        data: {applications: [{id: applicationId, name}]},
        clientData: {
          application: {id: applicationId, owner: {username: ownerUsername}}
        }
      }
    )
  })
})
