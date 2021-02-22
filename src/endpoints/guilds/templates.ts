import {Method, error, errors} from '../../errors'
import * as convert from '../../convert'
import {checkClientGuildCount, createGuild, getNameErrors} from './post'
import type {
  RESTGetAPITemplateResult,
  RESTPostAPITemplateCreateGuildJSONBody,
  RESTPostAPITemplateCreateGuildResult
} from 'discord-api-types/v8'
import type {EmitPacket, HasIntents} from '../../Backend'
import type {
  DataGuild,
  DataGuildTemplate,
  ResolvedClientData,
  ResolvedData
} from '../../Data'

export type GuildsTemplates = (
  code: string
) => {
  get: () => Promise<RESTGetAPITemplateResult>
  post: (options: {
    data: RESTPostAPITemplateCreateGuildJSONBody
  }) => Promise<RESTPostAPITemplateCreateGuildResult>
}

export const getTemplate = ({guilds}: ResolvedData) => (
  code: string,
  path: string,
  method: Method
): [DataGuild, DataGuildTemplate] => {
  const result = guilds
    .map(guild => [guild, guild.template] as const)
    .find((res): res is [DataGuild, DataGuildTemplate] => res[1]?.code === code)
  if (!result) error(errors.UNKNOWN_GUILD_TEMPLATE, path, method)
  return result
}

const templates = (
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
        const [guild, template] = _getTemplate(code, path, Method.GET)
        return _convertTemplate(guild)(template)
      },
      // https://discord.com/developers/docs/resources/template#create-guild-from-template
      post: async ({data: {name, icon}}) => {
        const method = Method.POST
        const [, template] = _getTemplate(code, path, method)
        _checkClientGuildCount(path, method)
        const nameErrors = getNameErrors(name)
        if (nameErrors)
          error(errors.INVALID_FORM_BODY, path, method, nameErrors)
        return _createGuild({...template.serialized_source_guild, name, icon})
      }
    }
  }
}
export default templates
