import {application} from './oauth2'
import {user} from './user'
import {createDefaults as d} from './utils'
import type {FullApplication} from '../types'

export const fullApplication = d<FullApplication>(app => ({
  ...application(app),
  bot: user(app.bot)
}))
