import * as Discord from 'discord.js'
import * as DM from '../src'
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
    const ownerId = '0'
    const applicationId = '1'
    const name = 'Application Name'
    const ownerUsername = 'app owner'
    await withClient(
      async client => {
        expectNotToBeNull(client.application)
        const application = await client.application.fetch()
        expect(application).toBeInstanceOf(Discord.ClientApplication)
        expect(application.name).toBe(name)
        expect(application.owner).toBeInstanceOf(Discord.User)
        expect((application.owner as Discord.User).username).toBe(ownerUsername)
      },
      {
        backend: new DM.Backend({
          applications: [{id: applicationId, name, owner_id: ownerId}],
          users: [{id: ownerId, username: ownerUsername}]
        }),
        applicationId
      }
    )
  })
})
