import {VoiceRegion} from 'discord.js'
import {testWithClient} from './utils'

describe('fetchVoiceRegions', () => {
  testWithClient({
    name: 'default voice regions',
    fn: async client => {
      const voiceRegions = await client.fetchVoiceRegions()
      for (const [, region] of voiceRegions)
        expect(region).toBeInstanceOf(VoiceRegion)
    }
  })

  testWithClient({
    name: 'custom voice regions',
    data: {voiceRegions: {id1: {name: 'name 1'}, id2: {name: 'name 2'}}},
    fn: async client => {
      const voiceRegions = await client.fetchVoiceRegions()
      for (const [, region] of voiceRegions)
        expect(region).toBeInstanceOf(VoiceRegion)
      expect(voiceRegions.get('id1')?.name).toBe('name 1')
      expect(voiceRegions.get('id2')?.name).toBe('name 2')
    }
  })
})
