import {
  OverwriteType,
  PermissionFlagsBits
} from 'discord-api-types/v9';
import * as convert from '../../../convert.ts';
import * as defaults from '../../../defaults/index.ts';
import {
  Method,
  error,
  errors,
  formBodyErrors,
  mkRequest
} from '../../../errors/index.ts';
import { clientUserId } from '../../../utils.ts';
import {
  getPermissions,
  hasPermissions
} from '../../utils.ts';
import type {
  APIGuildCreateOverwrite,
  RESTDeleteAPIGuildTemplateResult,
  RESTGetAPIGuildTemplatesResult,
  RESTPatchAPIGuildTemplateJSONBody,
  RESTPatchAPIGuildTemplateResult,
  RESTPostAPIGuildTemplatesJSONBody,
  RESTPostAPIGuildTemplatesResult
} from 'discord-api-types/v9'
import type { Backend } from '../../../Backend.ts';
import type {
  Guild,
  GuildChannel,
  Snowflake
} from '../../../types/index.ts';
import type {
  FormBodyErrors,
  Request
} from '../../../errors/index.ts';
import type { UnUnion } from '../../../utils.ts';

type GuildsIdTemplatesFn = (code: string) => {
  delete: () => Promise<RESTDeleteAPIGuildTemplateResult>
  patch: (options: {
    data: RESTPatchAPIGuildTemplateJSONBody
  }) => Promise<RESTPatchAPIGuildTemplateResult>
  // put: () => Promise<RESTPutAPIGuildTemplateSyncResult>
}

interface GuildsIdsTemplatesObject {
  get: () => Promise<RESTGetAPIGuildTemplatesResult>
  post: (options: {
    data: RESTPostAPIGuildTemplatesJSONBody
  }) => Promise<RESTPostAPIGuildTemplatesResult>
}

export interface GuildsIdTemplates
  extends GuildsIdTemplatesFn,
  GuildsIdsTemplatesObject { }

const checkTemplateInput = (
  request: Request,
  name: string | undefined,
  description: string | null | undefined
): void => {
  const errs: FormBodyErrors = {
    ...(description != null && description.length > 120
      ? {
        description: {
          _errors: [formBodyErrors.BASE_TYPE_MAX_LENGTH(120)]
        }
      }
      : {}),
    ...(name !== undefined && (!name || name.length > 100)
      ? { name: { _errors: [formBodyErrors.BASE_TYPE_BAD_LENGTH(1, 100)] } }
      : {})
  }
  if (Object.keys(errs).length) error(request, errors.INVALID_FORM_BODY, errs)
}

export default (backend: Backend, applicationId: Snowflake) => {
  const convertTemplate = convert.template(backend)
  return (id: Snowflake): GuildsIdTemplates => {
    const basePath = `/guilds/${id}/templates`
    const getGuildAndCheckPermissions = (
      request: Request,
      userId = clientUserId(backend, applicationId)
    ): Guild => {
      const guild = backend.guilds.get(id)
      if (!guild) error(request, errors.UNKNOWN_GUILD)
      const member = guild.members.get(userId)
      if (
        member &&
        hasPermissions(
          getPermissions(guild, member),
          PermissionFlagsBits.ManageGuild
        )
      )
        error(request, errors.MISSING_PERMISSIONS)
      return guild
    }

    return Object.assign<GuildsIdTemplatesFn, GuildsIdsTemplatesObject>(
      code => {
        const path = `${basePath}/${code}`
        return {
          // https://discord.com/developers/docs/resources/template#delete-guild-template
          delete: async () => {
            const request = mkRequest(path, Method.DELETE)
            const guild = getGuildAndCheckPermissions(request)
            if (guild.template?.code !== code)
              error(request, errors.UNKNOWN_GUILD_TEMPLATE)
            const { template } = guild
            delete guild.template
            return convertTemplate(guild, template)
          },

          // https://discord.com/developers/docs/resources/template#modify-guild-template
          patch: async options => {
            const {
              data: { name, description }
            } = options
            const request = mkRequest(path, Method.PATCH, options)
            checkTemplateInput(request, name, description)
            const guild = getGuildAndCheckPermissions(request)
            if (guild.template?.code !== code)
              error(request, errors.UNKNOWN_GUILD_TEMPLATE)
            if (name !== undefined) guild.template.name = name
            if (description ?? '') guild.template.description = description!
            return convertTemplate(guild, guild.template)
          }
        }
      },
      {
        // https://discord.com/developers/docs/resources/template#get-guild-templates
        get: async () => {
          const guild = getGuildAndCheckPermissions(
            mkRequest(basePath, Method.GET)
          )
          return guild.template ? [convertTemplate(guild, guild.template)] : []
        },

        // https://discord.com/developers/docs/resources/template#create-guild-template
        post: async options => {
          const {
            data: { name, description = null }
          } = options
          const request = mkRequest(basePath, Method.POST, options)
          checkTemplateInput(request, name, description)

          const userId = clientUserId(backend, applicationId)
          const guild = getGuildAndCheckPermissions(request, userId)
          if (guild.template) error(request, errors.ALREADY_HAS_TEMPLATE)

          const {
            region,
            icon,
            verification_level,
            default_message_notifications,
            explicit_content_filter,
            preferred_locale,
            afk_timeout,
            roles,
            channels,
            afk_channel_id,
            system_channel_id,
            system_channel_flags
          } = guild
          const rolesMap: ReadonlyMap<Snowflake, number> = new Map(
            [...roles.values()].map((role, i) => [role.id, i])
          )
          const channelsMap: ReadonlyMap<Snowflake, number> = new Map(
            [...channels.values()].map((channel, i) => [channel.id, i])
          )
          guild.template = defaults.guildTemplate({
            name,
            description: description ?? '' ? description : null,
            creator_id: userId,
            serialized_source_guild: {
              name: guild.name,
              description: guild.description,
              region,
              icon_hash: icon,
              verification_level,
              default_message_notifications,
              explicit_content_filter,
              preferred_locale,
              afk_timeout,
              roles: roles.map(({ managed, position, tags, ...role }) => ({
                ...role,
                id: rolesMap.get(role.id),
                permissions: `${role.permissions}` as const
              })),
              channels: channels.map(
                ({
                  position,
                  last_message_id,
                  last_pin_timestamp,
                  ...channel
                }: UnUnion<GuildChannel>) => ({
                  ...channel,
                  id: channelsMap.get(channel.id)!,
                  parent_id:
                    channel.parent_id == null
                      ? channel.parent_id
                      : channelsMap.get(channel.parent_id),
                  permission_overwrites: channel.permission_overwrites
                    ?.filter(({ type }) => type === OverwriteType.Role)
                    .map<APIGuildCreateOverwrite>(
                      ({ id: overwriteId, allow, deny, ...rest }) => ({
                        id: rolesMap.get(overwriteId)!,
                        allow: `${allow}` as const,
                        deny: `${deny}` as const,
                        ...rest
                      })
                    )
                })
              ),
              afk_channel_id:
                afk_channel_id == null
                  ? null
                  : channelsMap.get(afk_channel_id)!,
              system_channel_id:
                system_channel_id == null
                  ? null
                  : channelsMap.get(system_channel_id)!,
              system_channel_flags
            }
          })
          // eslint-disable-next-line unicorn/consistent-destructuring -- just set guild.template above
          return convertTemplate(guild, guild.template)
        }
      }
    )
  }
}
