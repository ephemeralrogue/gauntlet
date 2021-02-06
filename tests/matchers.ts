declare global {
  namespace jest {
    interface Matchers<R, T> {
      toStrictEqualMapEntries(
        expectedEntries: T extends Map<infer K, infer V>
          ? Iterable<readonly [K, V]>
          : never
      ): R
    }
  }
}

expect.extend({
  toStrictEqualMapEntries<K, V>(
    this: jest.MatcherContext,
    received: Map<K, V>,
    expectedEntries: Iterable<readonly [K, V]>
  ) {
    const expected = new Map(expectedEntries)
    const pass = ((): boolean => {
      if (received.size !== expected.size) return false
      for (const [key, value] of expected) {
        if (
          !received.has(key) ||
          !this.equals(received.get(key), value, undefined, true)
        )
          return false
      }
      return true
    })()

    const matcherHintOptions: jest.MatcherHintOptions = {
      isNot: this.isNot,
      promise: this.promise
    }
    const message = (not: boolean) => (): string => `${this.utils.matcherHint(
      'toStrictEqualMapEntries',
      undefined,
      'expectedEntries',
      matcherHintOptions
    )}

Expected: ${not ? 'not ' : ''}${this.utils.printExpected(expected)}
Received: ${this.utils.printReceived(received)}`
    return {
      pass,
      message: pass ? message(true) : message(false)
    }
  }
})

export {}
