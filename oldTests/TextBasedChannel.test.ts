import {Client} from '../oldSrc'
import type {TextChannel} from '../oldSrc'

let client: Client
let channel: TextChannel

beforeEach(async () => {
  client = new Client()
  channel = await (await client.guilds.create('test guild')).channels.create('test channel')
})

describe('send', () => {
  test('string', async () => expect((await channel.send('test content')).content).toBe('test content'))
})

describe('awaitNextMessageFromClient', () => {
  test('client sent only message', async () => {
    const [awaited, sent] = await Promise.all([channel.awaitNextMessageFromClient(), channel.send('test content')])
    expect(awaited).toBe(sent)
  })

  test('filters out messages not sent by client', async () => {
    const testUser = await client.createTestUser({}, channel.guild)
    const [awaited,, sent] = await Promise.all([
      channel.awaitNextMessageFromClient(),
      testUser.sendIn(channel, 'from user'),
      channel.send('from client')
    ])
    expect(awaited).toBe(sent)
  })
})
