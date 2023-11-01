import {error, errors} from '../../../../../errors'
import type {Request} from '../../../../../errors'
import type {Channel, Message, Snowflake} from '../../../../../types'

export const getMessage = (
  messageId: Snowflake,
  request: Request,
  channel: Channel
): Message => {
  const message =
    'messages' in channel ? channel.messages.get(messageId) : undefined
  if (!message) error(request, errors.UNKNOWN_MESSAGE)
  return message
}
