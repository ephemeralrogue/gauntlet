import Discord from 'discord.js'
import type {Channel, Collection, Role, Snowflake} from 'discord.js'

export class Util extends Discord.Util {
  static async setPosition<T extends Channel | Role>(
    item: T, position: number, relative: boolean | undefined, sorted: Collection<Snowflake, T>
  ): Promise<{id: Snowflake, position: number}[]> {
    const updatedItems = sorted.array()
    Util.moveElementInArray(updatedItems, item, position, relative)
    return updatedItems.map((r, i) => ({id: r.id, position: i}))
  }
}
