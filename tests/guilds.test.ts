import * as Discord from 'discord.js';
import * as DM from '../src'

describe('initial guilds', () => {
  test('basic guild', async () => {
    const userId = '0'
    const guildId = '1'
    const backend = new DM.Backend()
    const app = backend.addApplication({ bot: { id: userId } })
    backend.addGuildWithBot({ id: guildId, owner_id: app.bot.id }, {}, app)
    const client = new Discord.Client({ intents: ['GUILDS'] })
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', async guild => {
        expect(guild.id).toBe(guildId)
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get(userId)).toBeDefined()
        expect(guild.ownerId).toBe(userId)
        expect((await guild.fetchOwner()).id).toBe(userId)
        resolve()
      })
    })
    DM.mockClient(client, backend, app.id)
    await promise
  })
})
