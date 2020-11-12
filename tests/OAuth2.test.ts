import {ClientApplication, User} from 'discord.js'
import {testWithClient} from './utils'

describe('fetchApplication', () => {
  testWithClient({
    name: 'default application',
    fn: async client =>
      expect(await client.fetchApplication()).toBeInstanceOf(ClientApplication)
  })

  const name = 'Application Name'
  const ownerUsername = 'app owner'
  testWithClient({
    name: 'custom application',
    clientData: {application: {name, owner: {username: ownerUsername}}},
    fn: async client => {
      const application = await client.fetchApplication()
      expect(application).toBeInstanceOf(ClientApplication)
      expect(application.name).toBe(name)
      expect(application.owner).toBeInstanceOf(User)
      expect((application.owner as User).username).toBe(ownerUsername)
    }
  })
})
