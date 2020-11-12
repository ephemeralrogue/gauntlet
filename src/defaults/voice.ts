import {_resolveCollection, resolveCollection} from '../resolve-collection'
import type {APIVoiceRegion} from 'discord-api-types/v8'
import type {Collection} from 'discord.js'
import type {CollectionResolvable, Defaults} from '../resolve-collection'

const defaultVoiceRegions: Collection<
  string,
  APIVoiceRegion
> = _resolveCollection<string, APIVoiceRegion, 'id'>(
  [
    {
      id: 'us-west',
      name: 'US West',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'us-east',
      name: 'US East',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'us-central',
      name: 'US Central',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'us-south',
      name: 'US South',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'singapore',
      name: 'Singapore',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'southafrica',
      name: 'South Africa',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'sydney',
      name: 'Sydney',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: true
    },
    {
      id: 'europe',
      name: 'Europe',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'brazil',
      name: 'Brazil',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'hongkong',
      name: 'Hong Kong',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'russia',
      name: 'Russia',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'japan',
      name: 'Japan',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'india',
      name: 'India',
      vip: false,
      custom: false,
      deprecated: false,
      optimal: false
    },
    {
      id: 'dubai',
      name: 'Dubai',
      vip: false,
      custom: false,
      deprecated: true,
      optimal: false
    },
    {
      id: 'amsterdam',
      name: 'Amsterdam',
      vip: false,
      custom: false,
      deprecated: true,
      optimal: false
    },
    {
      id: 'london',
      name: 'London',
      vip: false,
      custom: false,
      deprecated: true,
      optimal: false
    },
    {
      id: 'frankfurt',
      name: 'Frankfurt',
      vip: false,
      custom: false,
      deprecated: true,
      optimal: false
    },
    {
      id: 'eu-central',
      name: 'Central Europe',
      vip: false,
      custom: false,
      deprecated: true,
      optimal: false
    },
    {
      id: 'eu-west',
      name: 'Western Europe',
      vip: false,
      custom: false,
      deprecated: true,
      optimal: false
    }
  ],
  'id'
)

export const voiceRegion: Defaults<APIVoiceRegion> = region => ({
  id: 'voice-region-id',
  name: 'Voice Region Name',
  vip: false,
  optimal: false,
  deprecated: false,
  custom: false,
  ...region
})

export const voiceRegions = (
  regions?: CollectionResolvable<string, APIVoiceRegion, 'id'>
): Collection<string, APIVoiceRegion> =>
  regions
    ? resolveCollection<string, APIVoiceRegion, 'id'>(
        regions,
        'id',
        voiceRegion
      )
    : defaultVoiceRegions.clone()
