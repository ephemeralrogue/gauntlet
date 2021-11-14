import type * as D from 'discord.js'

// constructor is private
declare const WebSocketShard: new (manager: D.WebSocketManager, id: number) => D.WebSocketShard
export = WebSocketShard
