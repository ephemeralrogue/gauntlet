import { application } from './oauth2.ts';
import { user } from './user.ts';
import { createDefaults as d } from './utils.ts';
import type { FullApplication } from '../types/index.ts';

export const fullApplication = d<FullApplication>(app => ({
  ...application(app),
  bot: user(app.bot)
}))
