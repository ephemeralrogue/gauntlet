import {OverwriteType, PermissionFlagsBits} from 'discord-api-types/v8'
import * as convert from '../../../convert'
import * as defaults from '../../../defaults'
import {Method, error, errors, formBodyErrors} from '../../../errors'
import {clientUserID} from '../../../utils'
import {hasPermissions} from '../../utils'
import type {
  RESTDeleteAPIGuildTemplateResult,
  RESTGetAPIGuildTemplatesResult,
  RESTPatchAPIGuildTemplateJSONBody,
  RESTPatchAPIGuildTemplateResult,
  RESTPostAPIGuildTemplatesJSONBody,
  RESTPostAPIGuildTemplatesResult,
  Snowflake
} from 'discord-api-types/v8'
import type {DataGuild, ResolvedClientData, ResolvedData} from '../../../types'
import type {FormBodyErrors} from '../../../errors'

type GuildsIdTemplatesFn = (
  code: string
) => {
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
    GuildsIdsTemplatesObject {}

const checkTemplateInput = (
  name: string | undefined,
  description: string | null | undefined,
  path: string,
  method: Method
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
      ? {name: {_errors: [formBodyErrors.BASE_TYPE_BAD_LENGTH(1, 100)]}}
      : {})
  }
  if (Object.keys(errs).length)
    error(errors.INVALID_FORM_BODY, path, method, errs)
}

export default (data: ResolvedData, clientData: ResolvedClientData) => {
  const convertTemplate = convert.template(data)
  return (id: Snowflake): GuildsIdTemplates => {
    const basePath = `/guilds/${id}/templates`
    const getGuildAndCheckPermissions = (
      method: Method,
      {
        path = basePath,
        userID = clientUserID(data, clientData)
      }: {path?: string; userID?: Snowflake} = {}
    ): DataGuild => {
      const guild = data.guilds.get(id)
      if (!guild) error(errors.UNKNOWN_GUILD, path, method)
      const member = guild.members.find(m => m.id === userID)
      if (
        member &&
        hasPermissions(guild, member, PermissionFlagsBits.MANAGE_GUILD)
      )
        error(errors.MISSING_PERMISSIONS, path, method)
      return guild
    }

    return Object.assign<GuildsIdTemplatesFn, GuildsIdsTemplatesObject>(
      code => {
        const path = `${basePath}/${code}`
        return {
          // https://discord.com/developers/docs/resources/template#delete-guild-template
          delete: async () => {
            const method = Method.DELETE
            const guild = getGuildAndCheckPermissions(method, {path})
            if (guild.template?.code !== code)
              error(errors.UNKNOWN_GUILD_TEMPLATE, path, method)
            const {template} = guild
            guild.template = undefined
            return convertTemplate(guild)(template)
          },

          // https://discord.com/developers/docs/resources/template#modify-guild-template
          patch: async ({data: {name, description}}) => {
            const method = Method.PATCH
            checkTemplateInput(name, description, path, method)
            const guild = getGuildAndCheckPermissions(method, {path})
            if (guild.template?.code !== code)
              error(errors.UNKNOWN_GUILD_TEMPLATE, path, method)
            if (name !== undefined) guild.template.name = name
            if (description ?? '') guild.template.description = description!
            return convertTemplate(guild)(guild.template)
          }
        }
      },
      {
        // https://discord.com/developers/docs/resources/template#get-guild-templates
        get: async () => {
          const guild = getGuildAndCheckPermissions(Method.GET)
          return guild.template ? [convertTemplate(guild)(guild.template)] : []
        },

        // https://discord.com/developers/docs/resources/template#create-guild-template
        post: async ({data: {name, description = null}}) => {
          const method = Method.POST
          checkTemplateInput(name, description, basePath, method)

          const userID = clientUserID(data, clientData)
          const guild = getGuildAndCheckPermissions(method, {userID})
          if (guild.template)
            error(errors.ALREADY_HAS_TEMPLATE, basePath, method)

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
            roles.map((role, i) => [role.id, i])
          )
          const channelsMap: ReadonlyMap<Snowflake, number> = new Map(
            channels.map((channel, i) => [channel.id, i])
          )
          guild.template = defaults.dataGuildTemplate({
            name,
            description: description ?? '' ? description : null,
            creator_id: userID,
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
              roles: roles.map(({managed, position, tags, ...role}) => ({
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
                }) => ({
                  ...channel,
                  id: channelsMap.get(channel.id)!,
                  parent_id:
                    channel.parent_id == null
                      ? // TODO: change to null once https://github.com/discordjs/discord-api-types/pull/91 lands
                        undefined // null
                      : channelsMap.get(channel.parent_id),
                  permission_overwrites: channel.permission_overwrites
                    .filter(({type}) => type === OverwriteType.Role)
                    .map(overwrite => ({
                      ...overwrite,
                      id: rolesMap.get(overwrite.id)!
                    }))
                })
              ),
              // TODO: also change these two to null (see above regarding parent_id)
              afk_channel_id:
                afk_channel_id == null
                  ? undefined
                  : channelsMap.get(afk_channel_id)!,
              system_channel_id:
                system_channel_id == null
                  ? undefined
                  : channelsMap.get(system_channel_id)!,
              system_channel_flags
            }
          })
          // eslint-disable-next-line unicorn/consistent-destructuring -- just set guild.template above
          return convertTemplate(guild)(guild.template)
        }
      }
    )
  }
}
