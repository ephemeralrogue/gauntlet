import type {Collection, Snowflake} from 'discord.js'
import DiscordVoiceStateManager from '../../../node_modules/discord.js/src/managers/VoiceStateManager'
import {VoiceState} from '../../structures/VoiceState'
import type {Client} from '../../client'
import type * as Data from '../../data'
import type {Guild} from '../../structures'
import manager from '../BaseManager'

type VoiceStateResolvable = VoiceState | Snowflake

export class VoiceStateManager extends manager<DiscordVoiceStateManager, typeof VoiceState, VoiceStateResolvable>(
  DiscordVoiceStateManager
) {
  readonly client!: Client
  cache!: Collection<Snowflake, VoiceState>
  holds!: typeof VoiceState
  guild!: Guild
  add!: (data?: Partial<Data.VoiceState>, cache?: boolean) => VoiceState
  // Discord.js typings are wrong
  // resolve!: (resolvable: Discord.VoiceState | Snowflake) => VoiceState | null
  resolve!: (resolvable: typeof VoiceState) => VoiceState | null

  constructor(guild: Guild, iterable?: Iterable<Data.VoiceState>) {
    super(guild.client, iterable, VoiceState)
  }
}
