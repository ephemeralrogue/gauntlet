import { clone } from '../utils.ts';
import type { RESTGetAPIGuildVoiceRegionsResult } from 'discord-api-types/v9';
import type { Backend } from '../Backend.ts';

export interface Voice {
  regions: { get: () => Promise<RESTGetAPIGuildVoiceRegionsResult> }
}

export const voice = (backend: Backend): Voice => ({
  regions: {
    // https://discord.com/developers/docs/topics/oauth2#get-current-application-information
    get: async () => backend.voiceRegions.map(clone)
  }
})
