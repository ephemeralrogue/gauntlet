import {PermissionFlagsBits} from 'discord-api-types/v9'
import * as convert from '../../../../../convert'
import {Method, error, errors, mkRequest} from '../../../../../errors'
import {clientUserId} from '../../../../../utils'
import {hasPermissions} from '../../../../utils'
import {getAndCheckPermissions, getChannel} from '../errors'
import {getMessage} from './utils'
import type {
  RESTGetAPIChannelMessageResult,
  Snowflake
} from 'discord-api-types/v9'
import type {Backend} from '../../../../../Backend'
import type {GuildChannel} from '../../../../../types'

export type MessagesGet = () => Promise<RESTGetAPIChannelMessageResult>

// https://discord.com/developers/docs/resources/channel#get-channel-message
export default (backend: Backend, applicationId: Snowflake) =>
  (channelId: Snowflake, messageId: Snowflake): MessagesGet =>
  async (): Promise<RESTGetAPIChannelMessageResult> => {
    const request = mkRequest(`/channels/${channelId}/messages`, Method.GET)

    const [guild, channel] = getChannel(backend, channelId, request)
    if (guild) {
      const permissions = getAndCheckPermissions(
        request,
        clientUserId(backend, applicationId),
        guild,
        channel as GuildChannel
      )
      if (!hasPermissions(permissions, PermissionFlagsBits.ReadMessageHistory))
        error(request, errors.MISSING_ACCESS)
    }

    return convert.message(
      backend,
      channelId
    )(getMessage(messageId, request, channel))
  }
