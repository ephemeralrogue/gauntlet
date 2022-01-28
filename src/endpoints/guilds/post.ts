import {ChannelType, GatewayDispatchEvents} from 'discord-api-types/v9'
import {Intents} from 'discord.js'
import {Method, error, errors, formBodyErrors, mkRequest} from '../../errors'
import * as convert from '../../convert'
import * as defaults from '../../defaults'
import {clientUserId, snowflake, timestamp, toCollection} from '../../utils'
import type {
  APIGuildCreateOverwrite,
  APIGuildCreatePartialChannel,
  APIGuildCreateRole,
  RESTPostAPIGuildsJSONBody
} from 'discord-api-types/v9'
import type {Backend, EmitPacket, HasIntents} from '../../Backend'
import type {
  Guild,
  GuildChannel,
  PartialDeep,
  Role,
  Snowflake
} from '../../types'
import type {APIGuild, RESTPostAPIGuildsResult} from '../../types/patches'
import type {FormBodyError, FormBodyErrors, Request} from '../../errors'
import type {KeysMatching, Override, RequireKeys} from '../../utils'

interface GuildsPostOptions {
  data: RESTPostAPIGuildsJSONBody
}

export type GuildsPost = (
  options: GuildsPostOptions
) => Promise<RESTPostAPIGuildsResult>

const validGuildCreateChannelTypes = new Set([
  ChannelType.GuildText,
  ChannelType.GuildVoice,
  ChannelType.GuildCategory
])

const validAFKTimeouts = new Set([60, 300, 900, 1800, 3600])

type AnyId = Snowflake | number

export const checkClientGuildCount = (
  backend: Backend,
  applicationId: Snowflake,
  request: Request
): void => {
  const userId = clientUserId(backend, applicationId)
  if (
    backend.guilds.filter(({members}) => members.some(({id}) => id === userId))
      .size >= 10
  )
    error(request, errors.MAXIMUM_GUILDS)
}

export const getNameErrors = (name: string): FormBodyErrors | undefined =>
  name.length < 2 || name.length > 100
    ? {name: {_errors: [formBodyErrors.BASE_TYPE_BAD_LENGTH(2, 100)]}}
    : undefined

const checkErrors = (
  backend: Backend,
  applicationId: Snowflake,
  options: GuildsPostOptions
): void => {
  const {data: guild} = options
  const {name, channels, afk_timeout} = guild
  const request = mkRequest('/guilds', Method.POST, options)

  checkClientGuildCount(backend, applicationId, request)

  const channelErrors = channels?.reduce<FormBodyErrors>(
    (errs, {name: channelName, type}, i) => {
      const noName = !channelName
      const nameTooLong = channelName.length > 100
      const invalidType =
        type !== undefined && !validGuildCreateChannelTypes.has(type)
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
                          validGuildCreateChannelTypes
                        )
                      ]
                    }
                  }
                : {})
            }
          }
        : errs
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
  if (Object.keys(errs).length) error(request, errors.INVALID_FORM_BODY, errs)

  if (channels) {
    for (const [i, {parent_id}] of channels.entries()) {
      if (parent_id != null) {
        const parent = channels.find(({id}) => id === parent_id)
        if (!parent) {
          error(request, errors.INVALID_FORM_BODY, {
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
        if (parent.type !== ChannelType.GuildCategory) {
          error(request, errors.INVALID_FORM_BODY, {
            channels: {_errors: [formBodyErrors.CHANNEL_PARENT_INVALID_TYPE]}
          })
        }
        if (channels.indexOf(parent) > i) {
          error(request, errors.INVALID_FORM_BODY, {
            channels: {
              _errors: [formBodyErrors.GUILD_CREATE_CHANNEL_CATEGORY_NOT_FIRST]
            }
          })
        }
      }
    }
  }

  const checkChannel = (
    key: KeysMatching<RESTPostAPIGuildsJSONBody, AnyId | null | undefined>,
    type: ChannelType,
    invalidTypeError: FormBodyError
  ) => {
    const channelId = guild[key]
    if (channelId != null) {
      const channel = channels?.find(({id}) => id === channelId)
      if (!channel) {
        error(request, errors.INVALID_FORM_BODY, {
          channels: {
            _errors: [
              formBodyErrors.GUILD_CREATE_CHANNEL_ID_INVALID(key, channelId)
            ]
          }
        })
      }
      if ((channel.type ?? ChannelType.GuildText) !== type) {
        error(request, errors.INVALID_FORM_BODY, {
          channels: {_errors: [invalidTypeError]}
        })
      }
    }
  }

  // afk_channel_id and system_channel_id are ignored if there aren't any channels
  if (channels?.length ?? 0) {
    checkChannel(
      'afk_channel_id',
      ChannelType.GuildVoice,
      formBodyErrors.GUILD_CREATE_AFK_CHANNEL_NOT_GUILD_VOICE
    )
    checkChannel(
      'system_channel_id',
      ChannelType.GuildText,
      formBodyErrors.GUILD_CREATE_SYSTEM_CHANNEL_NOT_GUILD_TEXT
    )
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
): Role =>
  defaults.role({
    ...rest,
    id,
    ...(name == null ? {} : {name}),
    ...(color == null ? {} : {color}),
    ...(hoist == null ? {} : {hoist}),
    ...(permissions == null ? {} : {permissions: BigInt(permissions)}),
    ...(mentionable == null ? {} : {mentionable})
  })

// Type annotation required
export const createGuild = (
  backend: Backend,
  applicationId: Snowflake,
  hasIntents: HasIntents,
  emitPacket: EmitPacket,
  guild: RESTPostAPIGuildsJSONBody
): APIGuild => {
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
  const userId = clientUserId(backend, applicationId)
  const base = defaults.guild({
    name,
    icon,
    region,
    afk_timeout,
    verification_level,
    default_message_notifications,
    explicit_content_filter,
    system_channel_flags,
    owner_id: userId,
    application_id: userId,
    members: toCollection([{id: userId, joined_at: timestamp()}])
  })

  type IdMap = ReadonlyMap<number | string, Snowflake>

  let resolvedRoles: readonly Role[]
  let roleMap: IdMap
  if (roles?.length ?? 0) {
    const map: IdMap = new Map([
      [roles![0]!.id, base.id],
      ...roles!.slice(1).map(({id}) => [id, snowflake()] as const)
    ])
    resolvedRoles = [
      roleFromGuildCreateRole({...roles![0]!, name: '@everyone'}, base.id),
      ...roles!
        .slice(1)
        .map(role => roleFromGuildCreateRole(role, map.get(role.id)!))
    ]
    roleMap = map
  } else {
    resolvedRoles = [defaults.role({id: base.id, name: '@everyone'})]
    roleMap = new Map()
  }

  let resolvedChannels: readonly GuildChannel[]
  let systemChannelId: Snowflake | null
  let channelMap: IdMap
  if (channels?.length ?? 0) {
    const map: IdMap = new Map(
      channels!
        .filter(
          (
            channel
          ): channel is RequireKeys<APIGuildCreatePartialChannel, 'id'> =>
            channel.id !== undefined
        )
        .map(({id}) => [id, snowflake()])
    )
    resolvedChannels = channels!.map(
      ({id, parent_id, permission_overwrites, ...rest}) =>
        defaults.guildChannel({
          ...rest,
          ...(id === undefined ? {} : {id: map.get(id)}),
          ...(parent_id == null ? {} : {parent_id: map.get(parent_id)}),
          ...(permission_overwrites
            ? {
                permission_overwrites: toCollection(
                  permission_overwrites
                    .filter(overwrite => roleMap.has(overwrite.id))
                    .map(
                      ({
                        id: overwriteId,
                        allow,
                        deny,
                        ...overwriteRest
                      }: // TODO: fix types in discord-api-types and discord-api-docs (allow/deny/type can be undefined)
                      Override<
                        APIGuildCreateOverwrite,
                        Partial<Pick<APIGuildCreateOverwrite, 'allow' | 'deny'>>
                      >) =>
                        defaults.overwrite({
                          id: roleMap.get(overwriteId)!,
                          allow: BigInt(allow ?? 0),
                          deny: BigInt(deny ?? 0),
                          ...overwriteRest
                        })
                    )
                )
              }
            : {})
        } as PartialDeep<GuildChannel>)
    )
    systemChannelId =
      system_channel_id == null ? null : map.get(system_channel_id)!
    channelMap = map
  } else {
    ;[resolvedChannels, systemChannelId] = defaults.guildChannels()
    channelMap = new Map()
  }

  const backendGuild: Guild = {
    ...base,
    roles: toCollection(resolvedRoles),
    channels: toCollection(resolvedChannels),
    afk_channel_id:
      afk_channel_id == null ? null : channelMap.get(afk_channel_id)!,
    system_channel_id: systemChannelId
  }
  backend.guilds.set(backendGuild.id, backendGuild)

  const apiGuild = convert.guild(backend)(backendGuild)
  if (hasIntents(Intents.FLAGS.GUILDS)) {
    emitPacket(
      GatewayDispatchEvents.GuildCreate,
      convert.guildCreateGuild(backend, applicationId)(backendGuild, apiGuild)
    )
  }
  return apiGuild
}

// https://discord.com/developers/docs/resources/guild#create-guild
export default (
    backend: Backend,
    applicationId: Snowflake,
    hasIntents: HasIntents,
    emitPacket: EmitPacket
  ): GuildsPost =>
  async options => {
    checkErrors(backend, applicationId, options)
    return createGuild(
      backend,
      applicationId,
      hasIntents,
      emitPacket,
      options.data
    )
  }
