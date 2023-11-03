import type * as Discord from 'discord.js';

// constructor is private
declare const WebSocketShard: new (
  manager: Discord.WebSocketManager,
  id: number
) => Discord.WebSocketShard
export = WebSocketShard
