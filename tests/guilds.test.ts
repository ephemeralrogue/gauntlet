import * as D from 'discord.js'
import * as DM from '../src'
import {testWithClient} from './utils'
import type {DeepPartialOmit} from './utils'

// Omitting valueOf because ({...}).valueOf() is Object, whereas
// (guild as D.Guild).valueOf() is string
type MatchObjectGuild = DeepPartialOmit<D.Guild, 'valueOf'>

describe('initial guilds', () => {
  test('basic guild', async () => {
    const client = new D.Client({intents: ['GUILDS']})
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', guild => {
        expect(guild.id).toBe('1')
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get('2')).toBeDefined()
        expect(guild.ownerID).toBe('2')
        expect(guild.owner?.id).toBe('2')
        resolve()
      })
    })
    DM.mockClient(
      client,
      {userID: '2'},
      new DM.Backend({users: {2: {}}, guilds: {1: {members: [{id: '2'}]}}})
    )
    await promise
  })

  test('guild member without user in data', async () => {
    const client = new D.Client({intents: ['GUILDS']})
    const promise = new Promise<void>(resolve => {
      client.on('guildCreate', guild => {
        expect(guild.id).toBe('1')
        expect(guild.members.cache.size).toBe(1)
        expect(guild.members.cache.get('2')).toBeDefined()
        expect(guild.ownerID).toBe('2')
        expect(guild.owner?.id).toBe('2')
        resolve()
      })
    })
    DM.mockClient(
      client,
      {userID: '2'},
      new DM.Backend({guilds: {1: {members: [{id: '2'}]}}})
    )
    await promise
  })
})

describe('create guild', () => {
  testWithClient('only name supplied', async client => {
    const name = 'name'
    expect(await client.guilds.create(name)).toMatchObject<MatchObjectGuild>({
      name,
      afkTimeout: 300,
      defaultMessageNotifications: 'ALL',
      explicitContentFilter: 'DISABLED',
      verificationLevel: 'NONE'
    })
  })

  testWithClient('overriding basic defaults', async client => {
    const name = 'name'
    const afkTimeout = 60
    const defaultMessageNotifications: D.DefaultMessageNotifications =
      'MENTIONS'
    const explicitContentFilter: D.ExplicitContentFilterLevel = 'ALL_MEMBERS'
    const verificationLevel: D.VerificationLevel = 'HIGH'
    const guild = await client.guilds.create(name, {
      afkTimeout,
      defaultMessageNotifications,
      explicitContentFilter,
      verificationLevel
    })
    expect(guild).toMatchObject<MatchObjectGuild>({
      name,
      afkTimeout,
      defaultMessageNotifications,
      explicitContentFilter,
      verificationLevel
    })
  })
})

describe('get template', () => {
  type MatchObjectTemplate = DeepPartialOmit<D.GuildTemplate, 'valueOf'>
  const code = 'abc'
  const guildName = 'Guild name'
  const templateName = 'Template name'
  const templateDescription = 'Template description'
  testWithClient(
    'basic',
    async client => {
      expect(
        await client.fetchGuildTemplate(code)
      ).toMatchObject<MatchObjectTemplate>({
        name: templateName,
        description: templateDescription,
        guild: {name: guildName}
      })
    },
    {
      data: {
        guilds: {
          1: {
            name: guildName,
            template: {
              code,
              name: templateName,
              description: templateDescription
            }
          }
        }
      }
    }
  )
})

describe('create guild from template', () => {
  const code = 'abc'
  const name = 'Guild name'
  const afkTimeout = 60
  testWithClient(
    'basic template',
    async client => {
      const guild = await (await client.fetchGuildTemplate(code)).createGuild(
        name
      )
      expect(guild).toMatchObject<MatchObjectGuild>({
        name,
        afkTimeout
      })
    },
    {
      data: {
        guilds: {
          1: {
            template: {
              code,
              serialized_source_guild: {afk_timeout: afkTimeout}
            }
          }
        }
      }
    }
  )
})

describe('get guild templates', () => {
  const guildID = '1'

  testWithClient(
    'no templates',
    async client => {
      expect(
        (await client.guilds.cache.get(guildID)!.fetchTemplates()).size
      ).toBe(0)
    },
    {data: {guilds: {[guildID]: {}}}}
  )

  const templateName = 'Template name'
  testWithClient(
    'simple template',
    async client => {
      const templates = await client.guilds.cache.get(guildID)!.fetchTemplates()
      expect(templates.size).toBe(1)
      expect(templates.first()!.name).toBe(templateName)
    },
    {
      data: {guilds: {[guildID]: {template: {name: templateName}}}}
    }
  )
})

describe('delete guild template', () => {
  const guildID = '1'
  const name = 'template name'
  testWithClient(
    'success',
    async client => {
      expect(
        (
          await (await client.guilds.cache.get(guildID)!.fetchTemplates())
            .first()!
            .delete()
        ).name
      ).toBe(name)
    },
    {data: {guilds: {[guildID]: {template: {name}}}}}
  )
})
