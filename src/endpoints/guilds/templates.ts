import * as convert from '../../convert.ts';
import {
  Method,
  error,
  errors,
  mkRequest
} from '../../errors/index.ts';
import {
  checkClientGuildCount,
  createGuild,
  getNameErrors
} from './post.ts';
import type {
  RESTGetAPITemplateResult,
  RESTPostAPITemplateCreateGuildJSONBody
} from 'discord-api-types/v9';
import type {
  Backend,
  EmitPacket,
  HasIntents
} from '../../Backend.ts';
import type { Request } from '../../errors/index.ts';
import type {
  Guild,
  GuildTemplate,
  Snowflake
} from '../../types/index.ts';
import type { RESTPostAPITemplateCreateGuildResult } from '../../types/patches.ts';

export type GuildsTemplates = (code: string) => {
  get: () => Promise<RESTGetAPITemplateResult>
  post: (options: {
    data: RESTPostAPITemplateCreateGuildJSONBody
  }) => Promise<RESTPostAPITemplateCreateGuildResult>
}

const getTemplate = (
  { guilds }: Backend,
  request: Request,
  code: string
): [Guild, GuildTemplate] => {
  const result = guilds
    .map(guild => [guild, guild.template] as const)
    .find((res): res is [Guild, GuildTemplate] => res[1]?.code === code)
  if (!result) error(request, errors.UNKNOWN_GUILD_TEMPLATE)
  return result
}

export default (
  backend: Backend,
  applicationId: Snowflake,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
): GuildsTemplates =>
  code => {
    const path = `/guilds/templates/${code}`
    return {
      // https://discord.com/developers/docs/resources/template#get-template
      get: async () => {
        const [guild, template] = getTemplate(
          backend,
          mkRequest(path, Method.GET),
          code
        )
        return convert.template(backend)(guild, template)
      },
      // https://discord.com/developers/docs/resources/template#create-guild-from-template
      post: async ({ data: { name, icon } }) => {
        const request = mkRequest(path, Method.POST)
        const [, template] = getTemplate(backend, request, code)
        checkClientGuildCount(backend, applicationId, request)
        const nameErrors = getNameErrors(name)
        if (nameErrors) error(request, errors.INVALID_FORM_BODY, nameErrors)
        return createGuild(backend, applicationId, hasIntents, emitPacket, {
          ...template.serialized_source_guild,
          name,
          ...(icon === undefined ? {} : { icon })
        })
      }
    }
  }
