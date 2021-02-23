import {_withClient, withClient} from '../utils'
import type * as D from 'discord.js'
import type * as DM from '../../src'
import type {
  DeepPartialOmit,
  MatchObjectGuild,
  WithClientOptions
} from '../utils'
import '../matchers'

type MatchObjectTemplate = DeepPartialOmit<D.GuildTemplate, 'valueOf'>

const appID = '1'
const userID = '2'
const guildID = '3'

const clientInGuilds = (
  ...guilds: readonly Omit<DM.DataPartialDeep<DM.DataGuild>, 'members'>[]
): WithClientOptions => ({
  data: {
    applications: [{id: appID, bot: {id: userID}}],
    guilds: guilds.map(guild => ({...guild, members: [{id: userID}]}))
  },
  clientData: {
    application: {id: appID}
  }
})

describe('get template', () => {
  test('success', async () => {
    const code = 'abc'
    const templateName = 'Template name'
    const templateDescription = 'Template description'
    await _withClient(
      async client => {
        expect(
          await client.fetchGuildTemplate(code)
        ).toMatchObject<MatchObjectTemplate>({
          name: templateName,
          description: templateDescription,
          guild: {id: guildID}
        })
      },
      clientInGuilds({
        id: guildID,
        template: {
          code,
          name: templateName,
          description: templateDescription
        }
      })
    )
  })

  test(
    'errors on invalid code',
    withClient(async client =>
      expect(client.fetchGuildTemplate('foo')).toThrowAPIError(10_057)
    )
  )
})

describe('create guild from template', () => {
  test('basic template', async () => {
    const code = 'abc'
    const name = 'Guild name'
    const afkTimeout = 60
    await _withClient(
      async client => {
        const guild = await (await client.fetchGuildTemplate(code)).createGuild(
          name
        )
        expect(guild).toMatchObject<MatchObjectGuild>({
          name,
          afkTimeout
        })
      },
      clientInGuilds(
        // Make sure that it works with multiple guilds
        {},
        {
          template: {
            code,
            serialized_source_guild: {afk_timeout: afkTimeout}
          }
        }
      )
    )
  })

  test('errors on invalid name', async () => {
    const code = 'abc'
    await _withClient(
      async client =>
        expect(
          (await client.fetchGuildTemplate(code)).createGuild('')
        ).toThrowAPIFormError(),
      clientInGuilds({template: {code}})
    )
  })
})

describe('get guild templates', () => {
  test(
    'no templates',
    withClient(async client => {
      expect(
        (await client.guilds.cache.get(guildID)!.fetchTemplates()).size
      ).toBe(0)
    }, clientInGuilds({id: guildID}))
  )

  test('simple template', async () => {
    const templateName = 'Template name'
    await _withClient(async client => {
      const templates = await client.guilds.cache.get(guildID)!.fetchTemplates()
      expect(templates.size).toBe(1)
      expect(templates.first()!.name).toBe(templateName)
    }, clientInGuilds({id: guildID, template: {name: templateName}}))
  })
})

describe('create guild template', () => {
  test('success', async () => {
    const name = 'name'
    const description = 'description'
    await _withClient(
      async client =>
        expect(
          await client.guilds.cache
            .get(guildID)!
            .createTemplate(name, description)
        ).toMatchObject<MatchObjectTemplate>({name, description}),
      clientInGuilds({id: guildID})
    )
  })
})

const getTemplate = async (client: D.Client): Promise<D.GuildTemplate> =>
  (await client.guilds.cache.get(guildID)!.fetchTemplates()).first()!

describe('modify guild template', () => {
  test('success', async () => {
    const oldName = 'old name'
    const newName = 'new name'
    const description = 'description'
    await _withClient(
      async client =>
        expect(
          await (await getTemplate(client)).edit({name: newName})
        ).toMatchObject<MatchObjectTemplate>({name: newName, description}),
      clientInGuilds({id: guildID, template: {name: oldName, description}})
    )
  })
})

describe('delete guild template', () => {
  test('success', async () => {
    const name = 'template name'
    await _withClient(async client => {
      expect((await (await getTemplate(client)).delete()).name).toBe(name)
    }, clientInGuilds({id: guildID, template: {name}}))
  })
})
