import Discord from 'discord.js'
import defaults from '../../defaults'
import {applyToClass, mergeDefault} from '../../util'
import type {Client} from '../../client'
import type * as Data from '../../data'
import type {Override} from '../../util'
import type {Base} from '..'

export class Emoji extends Discord.Emoji implements Base {
  static applyToClass = applyToClass(Emoji)
  client!: Client

  constructor(client: Client, data?: Partial<Data.StandardEmoji>) {
    super(client, mergeDefault(defaults.emoji, data))
  }

  toData(): Override<Data.StandardEmoji, {[K in 'id' | 'name']: string | null}> {
    return {
      id: null,
      name: this.name,
      animated: this.animated
    }
  }
}
