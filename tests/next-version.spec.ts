import { describe, expect, it } from 'vitest'
import { compareVersions, latestTagVersion, nextVersion, parseVersion } from '../scripts/next-version'

describe('nextVersion', () => {
  it('bumps the patch number of the newest tag when package.json matches it', () => {
    expect(nextVersion('0.1.1', ['v0.1.0', 'v0.1.1'])).toBe('0.1.2')
  })

  it('bumps from the newest tag when package.json is behind it', () => {
    expect(nextVersion('0.1.1', ['v0.1.0', 'v0.1.1', 'v0.1.4'])).toBe('0.1.5')
  })

  it('uses package.json as-is when it is ahead by a patch (main at 0.1.2, newest tag v0.1.1)', () => {
    expect(nextVersion('0.1.2', ['v0.1.0', 'v0.1.1'])).toBe('0.1.2')
  })

  it('uses a hand-set minor bump as-is, then auto-increments from it', () => {
    expect(nextVersion('0.2.0', ['v0.1.7'])).toBe('0.2.0')
    expect(nextVersion('0.2.0', ['v0.1.7', 'v0.2.0'])).toBe('0.2.1')
  })

  it('uses a hand-set major bump as-is, then auto-increments from it', () => {
    expect(nextVersion('1.0.0', ['v0.9.3'])).toBe('1.0.0')
    expect(nextVersion('1.0.0', ['v0.9.3', 'v1.0.0'])).toBe('1.0.1')
  })

  it('releases package.json as-is when there are no release tags', () => {
    expect(nextVersion('0.1.0', [])).toBe('0.1.0')
    expect(nextVersion('0.1.0', ['not-a-version', 'v1.0.0-beta.1'])).toBe('0.1.0')
  })

  it('compares numerically, not as text', () => {
    expect(nextVersion('0.1.9', ['v0.1.9', 'v0.1.10'])).toBe('0.1.11')
    expect(nextVersion('0.10.0', ['v0.9.0'])).toBe('0.10.0')
  })

  it('ignores pre-release and malformed tags', () => {
    expect(nextVersion('0.1.1', ['v0.1.1', 'v0.2.0-rc.1', 'v0.3', 'latest'])).toBe('0.1.2')
  })

  it('rejects a package.json version that is not plain X.Y.Z', () => {
    expect(() => nextVersion('0.2.0-beta.1', ['v0.1.1'])).toThrow(/not a plain/)
  })
})

describe('helpers', () => {
  it('parses with or without a leading v', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3])
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3])
    expect(parseVersion('01.2.3')).toBeNull()
  })

  it('finds the newest tag', () => {
    expect(latestTagVersion(['v0.1.0', 'v0.10.0', 'v0.9.9'])).toEqual([0, 10, 0])
    expect(compareVersions([1, 0, 0], [0, 99, 99])).toBeGreaterThan(0)
  })
})
