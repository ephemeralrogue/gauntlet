import Discord from 'discord.js'
import * as Data from '../data'
import defaults from '../defaults'
import {mergeDefault} from '../util'
import {Team} from './Team'
import type {ClientApplicationAsset} from 'discord.js'
import type {Client} from '../client'
import type {Base, User} from '.'

export class ClientApplication extends Discord.ClientApplication implements Base {
  client!: Client
  owner!: User | Team | null

  _assets: ClientApplicationAsset[] = []

  constructor(client: Client, data?: Partial<Data.ClientApplication>) {
    super(client, mergeDefault(defaults.clientApplication, data))
  }

  /** Gets the client's rich presence assets. */
  async fetchAssets(data: Data.ClientApplicationAsset[] = []): Promise<ClientApplicationAsset[]> {
    const assets = data.map(asset => ({
      ...mergeDefault(defaults.clientApplicationAsset, asset),
      type: Data.ClientApplicationAssetType[asset.type] as keyof typeof Data.ClientApplicationAssetType
    }))
    this._assets = assets
    return assets
  }

  // This is mocked so that the mocked Team is used
  protected _patch(data: Data.ClientApplication): void {
    this.id = data.id
    this.name = data.name
    this.description = data.description
    // TODO: fix Discord.js' types for ClientApplication#icon (can be nullable)
    this.icon = data.icon!
    this.cover = data.cover_image ?? null
    this.rpcOrigins = data.rpc_origins ?? []
    this.botRequireCodeGrant = typeof data.bot_require_code_grant === 'undefined' ? null : data.bot_require_code_grant
    this.botPublic = typeof data.bot_public === 'undefined' ? null : data.bot_public
    this.owner = data.team ? new Team(this.client, data.team) : this.client.users.add(data.owner)
  }
}
