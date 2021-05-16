import * as convert from '../convert'
import type {RESTGetAPIOauth2CurrentApplicationResult} from 'discord-api-types/v8'
import type {ResolvedClientData, ResolvedData} from '../types'

export interface OAuth2 {
  authorize: string
  applications: (_: '@me') => {
    get: () => Promise<RESTGetAPIOauth2CurrentApplicationResult>
  }
}

export const oauth2 = (
  data: ResolvedData,
  clientData: ResolvedClientData
): OAuth2 => ({
  authorize: '/oauth2/authorize',
  applications: () => ({
    // https://discord.com/developers/docs/topics/oauth2#get-current-application-information
    get: async () => convert.oauth2Application(data, clientData)
  })
})
