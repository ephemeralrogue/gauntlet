import type {HTTPAttachmentData} from 'discord.js'
import type {
  RESTPatchAPIChannelMessageJSONBody,
  RESTPatchAPIChannelMessageResult,
  Snowflake
} from 'discord-api-types/v9'
import type {Backend, EmitPacket, HasIntents} from '../../../../Backend'

export type MessagesPatch = (options: {
  data: RESTPatchAPIChannelMessageJSONBody
  files?: HTTPAttachmentData[]
}) => Promise<RESTPatchAPIChannelMessageResult>

export default (
    backend: Backend,
    applicationId: Snowflake,
    hasIntents: HasIntents,
    emitPacket: EmitPacket
  ) =>
  (channelId: Snowflake): MessagesPatch =>
  async (options): Promise<RESTPatchAPIChannelMessageResult> => {}
