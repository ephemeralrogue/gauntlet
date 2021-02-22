import {VoiceRegion} from 'discord.js'
import {testWithClient} from './utils'

describe('fetchVoiceRegions', () => {
  testWithClient('default voice regions', async client => {
    const voiceRegions = await client.fetchVoiceRegions()
    for (const [, region] of voiceRegions)
      expect(region).toBeInstanceOf(VoiceRegion)
  })

  testWithClient(
    'custom voice regions',
    async client => {
      const voiceRegions = await client.fetchVoiceRegions()
      for (const [, region] of voiceRegions)
        expect(region).toBeInstanceOf(VoiceRegion)
      expect(voiceRegions.get('id1')?.name).toBe('name 1')
      expect(voiceRegions.get('id2')?.name).toBe('name 2')
    },
    {
      data: {voice_regions: {id1: {name: 'name 1'}, id2: {name: 'name 2'}}}
    }
  )
})
