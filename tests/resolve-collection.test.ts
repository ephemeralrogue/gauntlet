import {Collection} from 'discord.js'
import {resolveCollection} from '../src/resolve-collection'
import {snowflake} from '../src/utils'
import type {Snowflake} from 'discord-api-types/v8'
import type {
  CollectionResolvable,
  DataPartialDeep,
  Defaults
} from '../src/resolve-collection'
import './matchers'

interface Test {
  id: Snowflake
  a: string
  b: string
  c: {d: string}
  e: {f: string}[]
}

const defaults: Defaults<Test> = partial => ({
  id: snowflake(),
  a: 'a',
  b: 'b',
  ...partial,
  c: {d: 'c.d', ...partial?.c},
  e: partial?.e?.map(e => ({f: 'e.f', ...e})) ?? []
})

describe('resolveCollection', () => {
  const test2: DataPartialDeep<Test> = {id: '42', b: '2b'}

  const data: readonly (readonly [
    name: string,
    resolvable: CollectionResolvable<Snowflake, Test, 'id'>
  ])[] = [
    [
      'Collection',
      new Collection([
        ['1', {a: '1a'}],
        ['2', test2]
      ])
    ],
    [
      'array',
      [
        {id: '1', a: '1a'},
        {id: '2', b: '2b'}
      ]
    ],
    [
      'entries',
      [
        ['1', {a: '1a'}],
        ['2', {b: '2b'}]
      ]
    ],
    ['mixed', [{id: '1', a: '1a'}, ['2', {b: '2b'}]]]
  ]
  test.each(data)('works for %s', (_, resolvable) =>
    expect(
      resolveCollection<Snowflake, Test, 'id'>(resolvable, 'id', defaults)
    ).toStrictEqualMapEntries([
      ['1', expect.objectContaining({id: '1', a: '1a', b: 'b'})],
      ['2', expect.objectContaining({id: '2', b: '2b', a: 'a'})]
    ])
  )
})
