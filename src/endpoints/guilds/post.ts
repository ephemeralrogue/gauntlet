import {ChannelType, GatewayDispatchEvents} from 'discord-api-types/v8'
import {Method, error, errors, formBodyErrors} from '../../errors'
import * as convert from '../../convert'
import * as defaults from '../../defaults'
import {snowflake, timestamp} from '../../utils'
import type {
  APIGuildCreatePartialChannel,
  APIGuildCreateRole,
  RESTPostAPIGuildsJSONBody,
  RESTPostAPIGuildsResult,
  Snowflake
} from 'discord-api-types/v8'
import type {EmitPacket} from '../../Backend'
import type {
  DataGuild,
  DataGuildChannel,
  DataRole,
  ResolvedClientData,
  ResolvedData
} from '../../Data'
import type {FormBodyError, FormBodyErrors} from '../../errors'
import type {KeysMatching, RequireKeys} from '../../utils'

export type GuildsPost = (options: {
  data: RESTPostAPIGuildsJSONBody
}) => Promise<RESTPostAPIGuildsResult>

const validGuildChannelTypes = new Set([
  ChannelType.GUILD_TEXT,
  ChannelType.GUILD_VOICE,
  ChannelType.GUILD_CATEGORY
])

const validAFKTimeouts = new Set([60, 300, 900, 1800, 3600])

type AnyID = Snowflake | number

export const checkClientGuildCount = (
  data: ResolvedData,
  clientData: ResolvedClientData
) => (path: string, method: Method): void => {
  if (
    data.guilds.filter(({members}) =>
      members.some(({id}) => id === clientData.userID)
    ).size >= 10
  )
    error(errors.MAXIMUM_GUILDS, path, method)
}

export const getNameErrors = (name: string): FormBodyErrors | undefined =>
  name.length < 2 || name.length > 100
    ? {name: {_errors: [formBodyErrors.BASE_TYPE_BAD_LENGTH(2, 100)]}}
    : undefined

const checkErrors = (data: ResolvedData, clientData: ResolvedClientData) => {
  const _checkClientGuildCount = checkClientGuildCount(data, clientData)
  // TODO: refactor so it's <= 20 statements
  // TODO: icon validation?
  return (guild: RESTPostAPIGuildsJSONBody) => {
    const {name, channels, afk_timeout} = guild
    const path = '/guilds'
    const method = Method.POST

    _checkClientGuildCount(path, method)

    const channelErrors = channels?.reduce<FormBodyErrors>(
      (errs, {name: channelName, type}, i) => {
        const noName = !channelName
        const nameTooLong = channelName.length > 100
        const invalidType =
          type !== undefined && !validGuildChannelTypes.has(type)
        return noName || nameTooLong || invalidType
          ? {
              ...errs,
              [i]: {
                ...(noName || nameTooLong
                  ? {
                      name: {
                        _errors: [
                          noName
                            ? formBodyErrors.BASE_TYPE_REQUIRED
                            : formBodyErrors.BASE_TYPE_BAD_LENGTH(1, 100)
                        ]
                      }
                    }
                  : {}),
                ...(invalidType
                  ? {
                      type: {
                        _errors: [
                          formBodyErrors.BASE_TYPE_CHOICES(
                            validGuildChannelTypes
                          )
                        ]
                      }
                    }
                  : {})
              }
            }
          : {}
      },
      {}
    )

    const errs: FormBodyErrors = {
      ...(afk_timeout !== undefined && !validAFKTimeouts.has(afk_timeout)
        ? {
            afk_timeout: {
              _errors: [formBodyErrors.BASE_TYPE_CHOICES(validAFKTimeouts)]
            }
          }
        : {}),
      ...(channelErrors && Object.keys(channelErrors).length
        ? {channels: channelErrors}
        : {}),
      ...getNameErrors(name)
    }
    if (Object.keys(errs).length)
      error(errors.INVALID_FORM_BODY, path, method, errs)

    if (channels) {
      for (const [i, {parent_id}] of channels.entries()) {
        if (parent_id != null) {
          const parent = channels.find(({id}) => id === parent_id)
          if (!parent) {
            error(errors.INVALID_FORM_BODY, path, method, {
              channels: {
                _errors: [
                  formBodyErrors.GUILD_CREATE_CHANNEL_ID_INVALID(
                    'parent_id',
                    parent_id
                  )
                ]
              }
            })
          }
          if (parent.type !== ChannelType.GUILD_CATEGORY) {
            error(errors.INVALID_FORM_BODY, path, method, {
              channels: {_errors: [formBodyErrors.CHANNEL_PARENT_INVALID_TYPE]}
            })
          }
          if (channels.indexOf(parent) > i) {
            error(errors.INVALID_FORM_BODY, path, method, {
              channels: {
                _errors: [
                  formBodyErrors.GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST
                ]
              }
            })
          }
        }
      }
    }

    const checkChannel = (
      key: KeysMatching<RESTPostAPIGuildsJSONBody, AnyID | undefined>,
      type: ChannelType,
      invalidTypeError: FormBodyError
    ) => {
      const channelID = guild[key]
      if (channelID !== undefined) {
        const channel = channels?.find(({id}) => id === channelID)
        if (!channel) {
          error(errors.INVALID_FORM_BODY, path, method, {
            channels: {
              _errors: [
                formBodyErrors.GUILD_CREATE_CHANNEL_ID_INVALID(key, channelID)
              ]
            }
          })
        }
        if ((channel.type ?? ChannelType.GUILD_TEXT) !== type) {
          error(errors.INVALID_FORM_BODY, path, method, {
            channels: {_errors: [invalidTypeError]}
          })
        }
      }
    }

    // afk_channel_id and system_channel_id are ignored if there aren't any channels
    if (channels?.length ?? 0) {
      checkChannel(
        'afk_channel_id',
        ChannelType.GUILD_VOICE,
        formBodyErrors.GUILD_CREATE_AFK_CHANNEL_NOT_GUILD_VOICE
      )
      checkChannel(
        'system_channel_id',
        ChannelType.GUILD_TEXT,
        formBodyErrors.GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT
      )
    }
  }
}

const roleFromGuildCreateRole = (
  {
    name,
    color,
    hoist,
    permissions,
    mentionable,
    ...rest
  }: Omit<APIGuildCreateRole, 'id'>,
  id: Snowflake
): DataRole =>
  defaults.dataRole({
    ...rest,
    id,
    ...(name == null ? {} : {name}),
    ...(color == null ? {} : {color}),
    ...(hoist == null ? {} : {hoist}),
    ...(permissions == null ? {} : {permissions: BigInt(permissions)}),
    ...(mentionable == null ? {} : {mentionable})
  })

export const createGuild = (
  data: ResolvedData,
  clientData: ResolvedClientData,
  emitPacket: EmitPacket
) => (guild: RESTPostAPIGuildsJSONBody) => {
  const {
    name,
    region,
    icon,
    verification_level,
    default_message_notifications,
    explicit_content_filter,
    roles,
    channels,
    afk_channel_id,
    afk_timeout,
    system_channel_id,
    system_channel_flags
  } = guild
  const base = defaults.dataGuild({
    name,
    icon,
    region,
    afk_timeout,
    verification_level,
    default_message_notifications,
    explicit_content_filter,
    system_channel_flags,
    owner_id: clientData.userID,
    application_id: clientData.application.id,
    members: [{id: clientData.userID, joined_at: timestamp()}]
  })

  type IDMap = ReadonlyMap<number | string, Snowflake>

  type ResolveRolesResult = [DataRole[], IDMap]
  const [resolvedRoles, roleMap]: ResolveRolesResult =
    roles?.length ?? 0
      ? ((): ResolveRolesResult => {
          const map: IDMap = new Map([
            [roles![0]!.id, base.id],
            ...roles!.slice(1).map(({id}) => [id, snowflake()] as const)
          ])
          return [
            [
              roleFromGuildCreateRole(
                {...roles![0]!, name: '@everyone'},
                base.id
              ),
              ...roles!
                .slice(1)
                .map(role => roleFromGuildCreateRole(role, map.get(role.id)!))
            ],
            map
          ]
        })()
      : [[defaults.dataRole({id: base.id, name: '@everyone'})], new Map()]

  type ResolveChannelResult = [DataGuildChannel[], Snowflake | null, IDMap]
  const [resolvedChannels, systemChannelID, channelMap]: ResolveChannelResult =
    channels?.length ?? 0
      ? ((): ResolveChannelResult => {
          const map: IDMap = new Map(
            channels!
              .filter(
                (
                  channel
                ): channel is RequireKeys<APIGuildCreatePartialChannel, 'id'> =>
                  channel.id !== undefined
              )
              .map(({id}) => [id, snowflake()])
          )
          return [
            channels!.map(({id, parent_id, permission_overwrites, ...rest}) =>
              defaults.dataGuildChannel({
                ...rest,
                ...(id === undefined ? {} : {id: map.get(id)}),
                ...(parent_id == null ? {} : {parent_id: map.get(parent_id)}),
                ...(permission_overwrites
                  ? {
                      permission_overwrites: permission_overwrites
                        .filter(overwrite => roleMap.has(overwrite.id))
                        .map(overwrite =>
                          defaults.overwrite({
                            ...overwrite,
                            id: roleMap.get(overwrite.id)!
                          })
                        )
                    }
                  : {})
              })
            ),
            system_channel_id === undefined
              ? null
              : map.get(system_channel_id)!,
            map
          ]
        })()
      : [...defaults.dataGuildChannels(), new Map()]

  const guildData: DataGuild = {
    ...base,
    roles: resolvedRoles,
    channels: resolvedChannels,
    afk_channel_id:
      afk_channel_id === undefined ? null : channelMap.get(afk_channel_id)!,
    system_channel_id: systemChannelID
  }
  data.guilds.set(guildData.id, guildData)

  const apiGuild = convert.guild(data)(guildData)
  const gatewayGuild = convert.guildCreateGuild(data, clientData)(
    guildData,
    apiGuild
  )
  emitPacket(GatewayDispatchEvents.GuildCreate, gatewayGuild)
  return apiGuild
}

// https://discord.com/developers/docs/resources/guild#create-guild
export default (
  data: ResolvedData,
  clientData: ResolvedClientData,
  emitPacket: EmitPacket
): GuildsPost => {
  const _checkErrors = checkErrors(data, clientData)
  const _createGuild = createGuild(data, clientData, emitPacket)
  return async ({data: guild}) => {
    _checkErrors(guild)
    return _createGuild(guild)
  }
}
