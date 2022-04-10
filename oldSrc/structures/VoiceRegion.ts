import Discord from 'discord.js'
import defaults from '../defaults'
import {mergeDefault} from '../util'
import type * as Data from '../data'

export class VoiceRegion extends Discord.VoiceRegion {
  constructor(data?: Partial<Data.VoiceRegion>) {
    super(mergeDefault(defaults.voiceRegion, data))
  }
}
