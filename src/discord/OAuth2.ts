import type {Snowflake} from 'discord.js'
import type {Team} from './Team'
import type {User} from './User'

export enum ClientApplicationAssetType {
  SMALL = 1,
  BIG
}

/** https://discord.com/developers/docs/topics/oauth2#get-current-application-information-response-structure */
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

/** https://gist.github.com/SilverCory/99c99f2dbafb3cbdafe60edd9c9db121#type-asset */
export interface ClientApplicationAsset {
  id: Snowflake
  name: string
  type: ClientApplicationAssetType
}
