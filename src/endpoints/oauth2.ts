import * as convert from '../convert'
import type {RESTGetAPIOAuth2CurrentApplicationResult} from 'discord-api-types/v9'
import type {Backend} from '../Backend'
import type {Snowflake} from '../types'

export interface OAuth2 {
  authorize: string
  applications: (_: '@me') => {
    get: () => Promise<RESTGetAPIOAuth2CurrentApplicationResult>
  }
}

export const oauth2 = (backend: Backend, applicationId: Snowflake): OAuth2 => ({
  authorize: '/oauth2/authorize',
  applications: () => ({
    // https://discord.com/developers/docs/topics/oauth2#get-current-application-information
    get: async () =>
      convert.application(backend, backend.applications.get(applicationId)!)
  })
})
