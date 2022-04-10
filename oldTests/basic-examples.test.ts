import {Client} from '../oldSrc'

describe('commands', () => {
  test('ping', async () => {
    const client = new Client()
    client.on('message', async ({channel, content}) => {
      if (content === '!ping') await channel.send('Pong!')
    })

    const guild = await client.guilds.create('test guild')
    const testUser = await client.createTestUser({}, guild)
    const channel = await guild.channels.create('test channel')
    await testUser.sendIn(channel, '!ping')
    const message = await channel.awaitNextMessageFromClient()
    expect(message.content).toBe('Pong!')
  })
})
