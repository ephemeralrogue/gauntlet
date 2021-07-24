import messages from './messages'
import type {Messages} from './messages'
import type {Backend, EmitPacket, HasIntents} from '../../Backend'
import type {Snowflake} from '../../types'

// TODO [typescript@>=4.4] Change string to Snowflake (https://github.com/microsoft/TypeScript/pull/26797)
export type Channels = Record<string /* Snowflake */, {messages: Messages}>

export const channels = (
  backend: Backend,
  applicationId: Snowflake,
  hasIntents: HasIntents,
  emitPacket: EmitPacket
): Channels =>
  new Proxy(
    {},
    {
      get: (_, id: Snowflake) => ({
        messages: messages(backend, applicationId, hasIntents, emitPacket)(id)
      })
    }
  )
