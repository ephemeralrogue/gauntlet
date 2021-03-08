import {randomString, snowflake} from '../utils'
import {team} from './teams'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {
  APIApplication,
  APIGuildIntegrationApplication
} from 'discord-api-types/v8'
import type {ClientDataApplication} from '../types'
import type {CommonProperties} from '../utils'

type PartialApplication = CommonProperties<
  APIApplication,
  APIGuildIntegrationApplication
>

export const partialApplication = d<PartialApplication>(application => ({
  id: snowflake(),
  name: 'Baba O-Riley',
  icon: null,
  description: 'Test',
  summary: 'This is a game',
  ...application
}))

export const clientDataApplication = d<ClientDataApplication>(application => ({
  id: snowflake(),
  bot_public: false,
  bot_require_code_grant: false,
  // 64 chars
  verify_key: randomString(),
  flags: 0,
  ...application,
  owner: user(application?.owner),
  team: application?.team ? team(application.team) : null
}))

export const clientApplication = d<APIApplication>(application => ({
  ...partialApplication(application),
  ...clientDataApplication(application)
}))
