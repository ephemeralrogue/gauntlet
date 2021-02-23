import {VoiceRegion} from 'discord.js'
import {withClient} from './utils'

describe('fetchVoiceRegions', () => {
  test(
    'default voice regions',
    withClient(async client => {
      const voiceRegions = await client.fetchVoiceRegions()
      for (const [, region] of voiceRegions)
        expect(region).toBeInstanceOf(VoiceRegion)
    })
  )

  test(
    'custom voice regions',
    withClient(
      async client => {
        const voiceRegions = await client.fetchVoiceRegions()
        for (const [, region] of voiceRegions)
          expect(region).toBeInstanceOf(VoiceRegion)
        expect(voiceRegions.get('id1')?.name).toBe('name 1')
        expect(voiceRegions.get('id2')?.name).toBe('name 2')
      },
      {
        data: {
          voice_regions: [
            {id: 'id1', name: 'name 1'},
            {id: 'id2', name: 'name 2'}
          ]
        }
      }
    )
  )
})
