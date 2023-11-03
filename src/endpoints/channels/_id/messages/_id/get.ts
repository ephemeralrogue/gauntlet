import { PermissionFlagsBits } from 'discord-api-types/v9';
import * as convert from '../../../../../convert.ts';
import {
  Method,
  error,
  errors,
  mkRequest
} from '../../../../../errors/index.ts';
import { clientUserId } from '../../../../../utils.ts';
import { hasPermissions } from '../../../../utils.ts';
import {
  getAndCheckPermissions,
  getChannel
} from '../errors.ts';
import { getMessage } from './utils.ts';
import type {
  RESTGetAPIChannelMessageResult,
  Snowflake
} from 'discord-api-types/v9';
import type { Backend } from '../../../../../Backend.ts';
import type { GuildChannel } from '../../../../../types/index.ts';

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
