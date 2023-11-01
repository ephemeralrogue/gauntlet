import messages from './_id/messages'
import type {Messages} from './_id/messages'
import type {Backend, EmitPacket, HasIntents} from '../../Backend'
import type {Snowflake} from '../../types'

export type Channels = Record<Snowflake, {messages: Messages}>

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
