import {OverwriteType, PermissionFlagsBits} from 'discord-api-types/v8'
import * as convert from '../../../convert'
import * as defaults from '../../../defaults'
import {Method, error, errors, formBodyErrors} from '../../../errors'
import {hasPermissions} from '../../utils'
import type {
  RESTGetAPIGuildTemplatesResult,
  RESTPostAPIGuildTemplatesJSONBody,
  RESTPostAPIGuildTemplatesResult,
  Snowflake
} from 'discord-api-types/v8'
import type {DataGuild, ResolvedClientData, ResolvedData} from '../../../Data'
import type {FormBodyErrors} from '../../../errors'

type GuildsIdTemplatesFn = (
  code: string
) => {
  // delete: () => Promise<RESTDeleteAPIGuildTemplateResult>
  // patch: (options: {
  //   data: RESTPatchAPIGuildTemplateJSONBody
  // }) => Promise<RESTPatchAPIGuildTemplateResult>
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

const templatesFn = (
  _data: ResolvedData,
  _clientData: ResolvedClientData
): GuildsIdTemplatesFn => _code => ({})

export default (data: ResolvedData, clientData: ResolvedClientData) => {
  const _convertTemplate = convert.template(data)
  return (id: Snowflake): GuildsIdTemplates => {
    const path = `/guilds/${id}/templates`
    const getGuildAndCheckPermissions = (method: Method): DataGuild => {
      const guild = data.guilds.get(id)
      if (!guild) error(errors.UNKNOWN_GUILD, path, method)
      const member = guild.members.find(m => m.id === clientData.userID)
      if (
        member &&
        hasPermissions(guild, member, PermissionFlagsBits.MANAGE_GUILD)
      )
        error(errors.MISSING_PERMISSIONS, path, method)
      return guild
    }
    return Object.assign<GuildsIdTemplatesFn, GuildsIdsTemplatesObject>(
      templatesFn(data, clientData),
      {
        // https://discord.com/developers/docs/resources/template#get-guild-templates
        get: async () => {
          const guild = getGuildAndCheckPermissions(Method.GET)
          return guild.template ? [_convertTemplate(guild)(guild.template)] : []
        },
        // https://discord.com/developers/docs/resources/template#create-guild-template
        post: async ({data: {name, description = null}}) => {
          const method = Method.POST

          const errs: FormBodyErrors = {
            ...(description != null && description.length > 120
              ? {
                  description: {
                    _errors: [formBodyErrors.BASE_TYPE_MAX_LENGTH(120)]
                  }
                }
              : {}),
            ...(!name || name.length > 100
              ? {name: {_errors: [formBodyErrors.BASE_TYPE_BAD_LENGTH(1, 100)]}}
              : {})
          }
          if (Object.keys(errs).length)
            error(errors.INVALID_FORM_BODY, path, method, errs)

          const guild = getGuildAndCheckPermissions(method)
          if (guild.template) error(errors.ALREADY_HAS_TEMPLATE, path, method)

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
            description:
              description !== null && description ? description : null,
            creator_id: clientData.userID,
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
          return _convertTemplate(guild)(guild.template)
        }
      }
    )
  }
}
