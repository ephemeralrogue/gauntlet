import {
  randomString,
  snowflake
} from '../utils.ts';
import { team } from './teams.ts';
import { createDefaults as d } from './utils.ts';
import type {
  Application,
  GuildIntegrationApplication
} from '../types/index.ts';
import type { CommonProperties } from '../utils.ts';

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
  team: app.team ? team(app.team) : null
}))
