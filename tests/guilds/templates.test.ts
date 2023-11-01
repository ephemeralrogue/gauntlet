import * as DM from '../../src'
import {guildWithBot, withClient, withClientF} from '../utils'
import type * as Discord from 'discord.js'
import type {DeepPartialOmit, MatchObjectGuild} from '../utils'
import '../matchers'

type MatchObjectTemplate = DeepPartialOmit<Discord.GuildTemplate, 'valueOf'>

const guildId = '0'

describe('get template', () => {
  test('success', async () => {
    const code = 'abc'
    const templateName = 'Template name'
    const templateDescription = 'Template description'
    await withClient(
      async client => {
        await expect(
          client.fetchGuildTemplate(code)
        ).resolves.toMatchObject<MatchObjectTemplate>({
          name: templateName,
          description: templateDescription
        })
      },
      {
        backend: new DM.Backend({
          guilds: [
            {
              template: {
                code,
                name: templateName,
                description: templateDescription
              }
            }
          ]
        })
      }
    )
  })

  test(
    'errors on invalid code',
    withClientF(async client =>
      expect(client.fetchGuildTemplate('foo')).toThrowAPIError(10_057)
    )
  )
})

describe('create guild from template', () => {
  test('basic template', async () => {
    const code = 'abc'
    const name = 'Guild name'
    const afkTimeout = 60
    const {backend, applicationId} = guildWithBot({
      template: {
        code,
        serialized_source_guild: {afk_timeout: afkTimeout}
      }
    })
    backend.addApplication()
    await withClient(
      async client => {
        const guild = await (
          await client.fetchGuildTemplate(code)
        ).createGuild(name)
        expect(guild).toMatchObject<MatchObjectGuild>({
          name,
          afkTimeout
        })
      },
      {backend, applicationId}
    )
  })

  test('errors on invalid name', async () => {
    const code = 'abc'
    await withClient(
      async client =>
        expect(
          (await client.fetchGuildTemplate(code)).createGuild('')
        ).toThrowAPIFormError(),
      guildWithBot({template: {code}})
    )
  })
})

describe('get guild templates', () => {
  test(
    'no templates',
    withClientF(async client => {
      expect(
        (await client.guilds.cache.get(guildId)!.fetchTemplates()).size
      ).toBe(0)
    }, guildWithBot({id: guildId}))
  )

  test('simple template', async () => {
    const templateName = 'Template name'
    await withClient(async client => {
      const templates = await client.guilds.cache.get(guildId)!.fetchTemplates()
      expect(templates.size).toBe(1)
      expect(templates.first()!.name).toBe(templateName)
    }, guildWithBot({id: guildId, template: {name: templateName}}))
  })
})

describe('create guild template', () => {
  test('success', async () => {
    const name = 'name'
    const description = 'description'
    await withClient(
      async client =>
        expect(
          client.guilds.cache.get(guildId)!.createTemplate(name, description)
        ).resolves.toMatchObject<MatchObjectTemplate>({name, description}),
      guildWithBot({id: guildId})
    )
  })
})

const getTemplate = async (client: Discord.Client): Promise<Discord.GuildTemplate> =>
  (await client.guilds.cache.get(guildId)!.fetchTemplates()).first()!

describe('modify guild template', () => {
  test('success', async () => {
    const oldName = 'old name'
    const newName = 'new name'
    const description = 'description'
    await withClient(
      async client =>
        expect(
          getTemplate(client).then(async template =>
            template.edit({name: newName})
          )
        ).resolves.toMatchObject<MatchObjectTemplate>({
          name: newName,
          description
        }),
      guildWithBot({id: guildId, template: {name: oldName, description}})
    )
  })
})

describe('delete guild template', () => {
  test('success', async () => {
    const name = 'template name'
    await withClient(async client => {
      expect((await (await getTemplate(client)).delete()).name).toBe(name)
    }, guildWithBot({id: guildId, template: {name}}))
  })
})
