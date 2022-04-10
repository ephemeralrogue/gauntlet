import type {Snowflake} from 'discord.js'
import type {Team} from './Team'
import type {User} from './User'

export enum ClientApplicationAssetType {
  SMALL = 1,
  BIG
}

export interface ClientApplication {
  id: Snowflake
  name: string
  icon: string | null
  description: string
  rpc_origins?: string[]
  bot_public: boolean
  bot_require_code_grant: boolean
  owner: Pick<User, 'id' | 'username' | 'avatar' | 'discriminator' | 'bot'>
  // summary: string
  verify_key: string
  team: Team | null
  // guild_id?: Snowflake
  // primary_sku_id?: Snowflake
  // slug?: string
  cover_image?: string
}

export interface ClientApplicationAsset {
  id: Snowflake
  name: string
  type: ClientApplicationAssetType
}
