import {Client, TestUser, SnowflakeUtil} from '../oldSrc'
import type {Snowflake} from 'discord.js'

let client: Client
beforeEach(() => client = new Client())

describe('createTestUser', () => {
  const checkTestUser = (testUser: TestUser, id: Snowflake): void => {
    expect(testUser).toBeInstanceOf(TestUser)
    expect(testUser.id).toBe(id)
  }

  test('no guilds', () => {
    const id = SnowflakeUtil.generate()
    const testUser = client.createTestUser({id})
    checkTestUser(testUser, id)
  })

  test('multiple guilds', async () => {
    const guild = await client.guilds.create('test guild')
    const guild2 = await client.guilds.create('test guild 2')
    const id = SnowflakeUtil.generate()
    const testUser = await client.createTestUser({id}, guild, guild2)
    checkTestUser(testUser, id)
  })
})

describe('sending', () => {
  test('text channel', async () => {
    const guild = await client.guilds.create('test guild')
    const channel = await guild.channels.create('test channel')
    const testUser = client.createTestUser({username: 'test username', discriminator: '1234'})
    const testMember = await guild.addMember(testUser, {accessToken: 'access token'})
    const message = await testUser.sendIn(channel, 'test content')
    expect(channel.lastMessage).toBe(message)
    expect(message.member).toBe(testMember)
    expect(message.author).toBe(testUser)
  })
})
