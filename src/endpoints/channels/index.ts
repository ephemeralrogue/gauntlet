import messages from './messages'
import type {Snowflake} from 'discord-api-types/v8'
import type {Messages} from './messages'
import type {EmitPacket, HasIntents} from '../../Backend'
import type {ResolvedClientData, ResolvedData} from '../../types'

// https://github.com/microsoft/TypeScript/issues/43136
export type Channels = Record<string /* Snowflake */, {messages: Messages}>

export const channels = (
  data: ResolvedData,
  clientData: ResolvedClientData,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
): Channels =>
  new Proxy(
    {},
    {
      get: (_, id: Snowflake) => ({
        messages: messages(data, clientData, hasIntents, emitPacket)(id)
      })
    }
  )
