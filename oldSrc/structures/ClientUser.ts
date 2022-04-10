import Discord from 'discord.js'
import defaults from '../defaults'
import {mergeDefault} from '../util'
import {User} from './User'
import type {
  ActivityOptions, Base64Resolvable, BufferResolvable, PresenceData, PresenceStatusData, Snowflake
} from 'discord.js'
import type {Client} from '../client'
import type * as Data from '../data'
import type {Presence} from '.'

export class ClientUser extends User.applyToClass(Discord.ClientUser) {
  client!: Client
  _typing!: Map<Snowflake, {
    promise: Promise<void>
    count?: number
    interval?: NodeJS.Timeout
    resolve?: () => void
  }>

  setActivity!: {
    (options?: ActivityOptions): Promise<Presence>
    (name: string, options?: ActivityOptions): Promise<Presence>
  }

  setAFK!: (afk: boolean) => Promise<Presence>
  setAvatar!: (avatar: BufferResolvable | Base64Resolvable) => Promise<this>
  setPresence!: (data: PresenceData) => Promise<Presence>
  setStatus!: (status: PresenceStatusData, shardID?: number | number[]) => Promise<Presence>
  setUsername!: (username: string) => Promise<this>

  constructor(client: Client, data: Partial<Data.ClientUser> = {}) {
    super(client, mergeDefault(defaults.clientUser, data))
  }

  async edit(data: Data.ModifyCurrentUserParams): Promise<this> {
    const {updated} = this.client._actions.UserUpdate.handle({
      id: this.id,
      username: data.username ?? this.username,
      discriminator: this.discriminator,
      // TODO: images (avatar should be a base64 encoded string)
      avatar: data.avatar ?? this.avatar,
      bot: this.bot,
      system: this.system,
      mfa_enabled: this.mfaEnabled,
      locale: this.locale,
      verified: this.verified
    })
    return (updated as this | null) ?? this
  }

  toData(): Data.ClientUser {
    return {
      ...super.toData(),
      mfa_enabled: this.mfaEnabled,
      verified: this.verified
    }
  }
}
