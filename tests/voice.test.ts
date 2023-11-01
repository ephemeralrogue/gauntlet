import * as Discord from 'discord.js'
import * as DM from '../src'
import {withClientF} from './utils'

describe('fetchVoiceRegions', () => {
  test(
    'default voice regions',
    withClientF(async client => {
      const voiceRegions = await client.fetchVoiceRegions()
      for (const [, region] of voiceRegions)
        expect(region).toBeInstanceOf(Discord.VoiceRegion)
    })
  )

  test(
    'custom voice regions',
    withClientF(
      async client => {
        const voiceRegions = await client.fetchVoiceRegions()
        for (const [, region] of voiceRegions)
          expect(region).toBeInstanceOf(Discord.VoiceRegion)
        expect(voiceRegions.get('id1')?.name).toBe('name 1')
        expect(voiceRegions.get('id2')?.name).toBe('name 2')
      },
      {
        backend: new DM.Backend({
          voiceRegions: [
            {id: 'id1', name: 'name 1'},
            {id: 'id2', name: 'name 2'}
          ]
        })
      }
    )
  )
})
