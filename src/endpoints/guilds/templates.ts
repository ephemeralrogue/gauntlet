import * as convert from '../../convert'
import {Method, error, errors, mkRequest} from '../../errors'
import {checkClientGuildCount, createGuild, getNameErrors} from './post'
import type {
  RESTGetAPITemplateResult,
  RESTPostAPITemplateCreateGuildJSONBody,
  RESTPostAPITemplateCreateGuildResult
} from 'discord-api-types/v9'
import type {EmitPacket, HasIntents} from '../../Backend'
import type {Request} from '../../errors'
import type {D, ResolvedClientData, RD, ResolvedData} from '../../types'

export type GuildsTemplates = (code: string) => {
  get: () => Promise<RESTGetAPITemplateResult>
  post: (options: {
    data: RESTPostAPITemplateCreateGuildJSONBody
  }) => Promise<RESTPostAPITemplateCreateGuildResult>
}

const getTemplate =
  ({guilds}: ResolvedData) =>
  (request: Request, code: string): [RD.Guild, D.GuildTemplate] => {
    const result = guilds
      .map(guild => [guild, guild.template] as const)
      .find((res): res is [RD.Guild, D.GuildTemplate] => res[1]?.code === code)
    if (!result) error(request, errors.UNKNOWN_GUILD_TEMPLATE)
    return result
  }

export default (
  data: ResolvedData,
  clientData: ResolvedClientData,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
): GuildsTemplates => {
  const _convertTemplate = convert.template(data)
  const _getTemplate = getTemplate(data)
  const _checkClientGuildCount = checkClientGuildCount(data, clientData)
  const _createGuild = createGuild(data, clientData, hasIntents, emitPacket)
  return code => {
    const path = `/guilds/templates/${code}`
    return {
      // https://discord.com/developers/docs/resources/template#get-template
      get: async () => {
        const [guild, template] = _getTemplate(
          mkRequest(path, Method.GET),
          code
        )
        return _convertTemplate(guild)(template)
      },
      // https://discord.com/developers/docs/resources/template#create-guild-from-template
      post: async ({data: {name, icon}}) => {
        const request = mkRequest(path, Method.POST)
        const [, template] = _getTemplate(request, code)
        _checkClientGuildCount(request)
        const nameErrors = getNameErrors(name)
        if (nameErrors) error(request, errors.INVALID_FORM_BODY, nameErrors)
        return _createGuild({...template.serialized_source_guild, name, icon})
      }
    }
  }
}
