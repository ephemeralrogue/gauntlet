import DiscordWebSocketManager from '../../../node_modules/discord.js/src/client/websocket/WebSocketManager'
import type {WebSocketShard} from 'discord.js'
import type * as Data from '../../data'
import type {Client} from '..'

// eslint-disable-next-line @typescript-eslint/naming-convention -- WebSocketManager is a class
export const WebSocketManager = class extends DiscordWebSocketManager {
  // eslint-disable-next-line dot-notation -- handlePacket is a private method
  _handlePacket = this['handlePacket']
} as new (client: Client) => DiscordWebSocketManager & {
  _handlePacket(packet?: Data.Packet, shard?: WebSocketShard): boolean
}

export type WebSocketManager = InstanceType<typeof WebSocketManager>
