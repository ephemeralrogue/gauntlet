import {_testWithClient, testWithClient} from './utils'
import type * as D from 'discord.js'
import type {MatchObjectGuild, DeepPartialOmit} from './utils'

type MatchObjectTemplate = DeepPartialOmit<D.GuildTemplate, 'valueOf'>

describe('get template', () => {
  describe('basic', () => {
    const code = 'abc'
    const guildName = 'Guild name'
    const templateName = 'Template name'
    const templateDescription = 'Template description'
    _testWithClient(
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
})

describe('create guild from template', () => {
  describe('basic template', () => {
    const code = 'abc'
    const name = 'Guild name'
    const afkTimeout = 60
    _testWithClient(
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

  describe('simple template', () => {
    const templateName = 'Template name'
    _testWithClient(
      async client => {
        const templates = await client.guilds.cache
          .get(guildID)!
          .fetchTemplates()
        expect(templates.size).toBe(1)
        expect(templates.first()!.name).toBe(templateName)
      },
      {
        data: {guilds: {[guildID]: {template: {name: templateName}}}}
      }
    )
  })
})

const getTemplate = async (
  client: D.Client,
  guildID: string
): Promise<D.GuildTemplate> =>
  (await client.guilds.cache.get(guildID)!.fetchTemplates()).first()!

describe('modify guild template', () => {
  describe('success', () => {
    const guildID = '1'
    const oldName = 'old name'
    const newName = 'new name'
    const description = 'description'
    _testWithClient(
      async client =>
        expect(
          await (await getTemplate(client, guildID)).edit({name: newName})
        ).toMatchObject<MatchObjectTemplate>({name: newName, description}),
      {data: {guilds: {[guildID]: {template: {name: oldName, description}}}}}
    )
  })
})

describe('delete guild template', () => {
  describe('success', () => {
    const guildID = '1'
    const name = 'template name'
    _testWithClient(
      async client => {
        expect((await (await getTemplate(client, guildID)).delete()).name).toBe(
          name
        )
      },
      {data: {guilds: {[guildID]: {template: {name}}}}}
    )
  })
})
