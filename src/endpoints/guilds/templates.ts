import {Method, error, errors} from '../../errors'
import * as convert from '../../convert'
import {checkClientGuildCount, createGuild, getNameErrors} from './post'
import type {EmitPacket} from '../../Backend'
import type {
  DataGuild,
  DataGuildTemplate,
  ResolvedClientData,
  ResolvedData
} from '../../Data'
import type {Guilds} from '..'

const getTemplate = ({guilds}: ResolvedData) => (
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
  emitPacket: EmitPacket
): Guilds['templates'] => {
  const _convertTemplate = convert.template(data)
  const _getTemplate = getTemplate(data)
  const _checkClientGuildCount = checkClientGuildCount(data, clientData)
  const _createGuild = createGuild(data, clientData, emitPacket)
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

/*
guild deleted: template deleted
- 404
is_dirty: null when first created and no changes
- changes to true when there is a change in the guild
- changes to false once synced
description empty: turns to null
{
  code: 50035,
  errors: {
    description: {
      _errors: [
        {
          code: 'BASE_TYPE_MAX_LENGTH',
          message: 'Must be 120 or fewer in length.'
        }
      ]
    },
    name: {
      _errors: [
        {
          code: 'BASE_TYPE_BAD_LENGTH',
          message: 'Must be between 1 and 100 in length.'
        }
      ]
    }
  },
  message: 'Invalid Form Body'
}

creating template
{ message: 'A server can only have a single template.', code: 30031 }
roles/channel ids change to numbers (roles start at 0 (for @everyone), channels start at 1)
*/
