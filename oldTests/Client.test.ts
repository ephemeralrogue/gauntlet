import {TypeError} from '../node_modules/discord.js/src/errors'
import {Client, ClientApplication, GuildPreview, Invite, SnowflakeUtil, Webhook} from '../oldSrc'
import type {Snowflake} from 'discord.js'

let client: Client
beforeEach(() => client = new Client())

describe('fetchApplication', () => {
  test('default application', async () => expect(await client.fetchApplication()).toBeInstanceOf(ClientApplication))

  test('custom application', async () => {
    client = new Client({}, {application: {name: 'app name', description: 'app description'}})
    const application = await client.fetchApplication()
    expect(application).toBeInstanceOf(ClientApplication)
    expect(application.name).toBe('app name')
    expect(application.description).toBe('app description')
  })
})

describe('fetchGuildPreview', () => {
  const checkPreview = (preview: GuildPreview, id: Snowflake): void => {
    expect(preview).toBeInstanceOf(GuildPreview)
    expect(preview.id).toBe(id)
  }

  describe('no data in client constructor', () => {
    test('no data', async () => {
      const id = SnowflakeUtil.generate()
      const preview = await client.fetchGuildPreview(id)
      checkPreview(preview, id)
    })

    test('data as parameter', async () => {
      const id = SnowflakeUtil.generate()
      const preview = await client.fetchGuildPreview(id, {name: 'guild name'})
      checkPreview(preview, id)
      expect(preview.name).toBe('guild name')
    })
  })

  describe('data in client constructor', () => {
    test('no data in parameter', async () => {
      const id = SnowflakeUtil.generate()
      client = new Client({}, {guildPreviews: [{id, name: 'guild name'}]})
      const preview = await client.fetchGuildPreview(id)
      checkPreview(preview, id)
      expect(preview.name).toBe('guild name')
    })

    test('data in parameter', async () => {
      const id = SnowflakeUtil.generate()
      client = new Client({}, {guildPreviews: [{id, name: 'guild name'}]})
      const preview = await client.fetchGuildPreview(id, {name: 'new name'})
      checkPreview(preview, id)
      expect(preview.name).toBe('new name')
    })
  })

  test('throws on empty ID', async () =>
    expect(client.fetchGuildPreview('')).rejects.toThrow(new TypeError('INVALID_TYPE', 'guild', 'GuildResolvable'))
  )
})

describe('fetchInvite', () => {
  const checkInvite = (invite: Invite, code: string): void => {
    expect(invite).toBeInstanceOf(Invite)
    expect(invite.code).toBe(code)
  }

  describe('no data in client constructor', () => {
    test('no data', async () => {
      const code = 'abc'
      const invite = await client.fetchInvite(code)
      checkInvite(invite, code)
    })

    test('data as parameter', async () => {
      const code = 'abc'
      const invite = await client.fetchInvite(code, {channel: {name: 'channel name'}})
      checkInvite(invite, code)
      expect(invite.channel.name).toBe('channel name')
    })
  })
})

describe('fetchWebhook', () => {
  const checkWebhook = (webhook: Webhook, id: Snowflake): void => {
    expect(webhook).toBeInstanceOf(Webhook)
    expect(webhook.id).toBe(id)
  }

  describe('no data in client constructor', () => {
    test('no data', async () => {
      const id = SnowflakeUtil.generate()
      const webhook = await client.fetchWebhook(id)
      checkWebhook(webhook, id)
    })

    test('token', async () => {
      const id = SnowflakeUtil.generate()
      const webhook = await client.fetchWebhook(id, 'token')
      checkWebhook(webhook, id)
      expect(webhook.token).toBe('token')
    })

    test('data', async () => {
      const id = SnowflakeUtil.generate()
      const webhook = await client.fetchWebhook(id, undefined, {name: 'webhook name'})
      checkWebhook(webhook, id)
      expect(webhook.name).toBe('webhook name')
    })

    test('token and data', async () => {
      const id = SnowflakeUtil.generate()
      const webhook = await client.fetchWebhook(id, 'token', {name: 'webhook name'})
      checkWebhook(webhook, id)
      expect(webhook.token).toBe('token')
      expect(webhook.name).toBe('webhook name')
    })
  })
})
