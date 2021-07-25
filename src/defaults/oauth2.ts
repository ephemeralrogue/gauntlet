import {randomString, snowflake} from '../utils'
import {team} from './teams'
import {createDefaults as d} from './utils'
import type {Application, GuildIntegrationApplication} from '../types'
import type {CommonProperties} from '../utils'

type PartialApplication = CommonProperties<
  Application,
  GuildIntegrationApplication
>

export const partialApplication = d<PartialApplication>(application => ({
  id: snowflake(),
  name: 'Baba O-Riley',
  icon: null,
  description: 'Test',
  summary: 'This is a game',
  ...application
}))

export const application = d<Application>(app => ({
  bot_public: false,
  bot_require_code_grant: false,
  // 64 chars
  verify_key: randomString(),
  flags: 0,
  ...partialApplication(app),
  team: app?.team ? team(app.team) : null
}))
