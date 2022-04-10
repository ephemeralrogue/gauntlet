import Discord from 'discord.js'
import type {Client} from '../client'

export interface Base extends Discord.Base {
  client: Client
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- class
export const Base = Discord.Base as new (client: Client) => Base
