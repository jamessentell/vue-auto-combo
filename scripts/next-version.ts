/**
 * Works out the version the release workflow should publish.
 *
 * Rules:
 * - No release tags yet: release the version in package.json as-is.
 * - package.json is ahead of the newest vX.Y.Z tag (for example you set it to
 *   0.2.0 or 1.0.0 by hand): release that version as-is.
 * - Otherwise: bump the patch number of the newest tag (v0.1.2 -> 0.1.3).
 *
 * Run directly (`node scripts/next-version.ts`) it reads package.json and the
 * repo's tags, then prints `version=` and `bump=` lines. `bump=true` means
 * package.json has to be updated to the new version before publishing. In
 * GitHub Actions the same lines go to $GITHUB_OUTPUT.
 */

export type Version = readonly [major: number, minor: number, patch: number]

const SEMVER = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

/** Parses `X.Y.Z` or `vX.Y.Z`. Pre-release and build tags are not release versions and return null. */
export function parseVersion(value: string): Version | null {
  const match = SEMVER.exec(value.trim())
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!
  }
  return 0
}

export function formatVersion(version: Version): string {
  return version.join('.')
}

/** Newest release version among the given tags, or null when none look like vX.Y.Z. */
export function latestTagVersion(tags: readonly string[]): Version | null {
  let latest: Version | null = null
  for (const tag of tags) {
    const version = parseVersion(tag)
    if (version && (!latest || compareVersions(version, latest) > 0)) latest = version
  }
  return latest
}

export function nextVersion(packageVersion: string, tags: readonly string[]): string {
  const current = parseVersion(packageVersion)
  if (!current) {
    throw new Error(`package.json version "${packageVersion}" is not a plain X.Y.Z version`)
  }
  const latest = latestTagVersion(tags)
  if (!latest || compareVersions(current, latest) > 0) return formatVersion(current)
  return formatVersion([latest[0], latest[1], latest[2] + 1])
}

async function main(): Promise<void> {
  const { readFileSync, appendFileSync } = await import('node:fs')
  const { execFileSync } = await import('node:child_process')

  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
  const tags = execFileSync('git', ['tag', '--list', 'v*'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)

  const version = nextVersion(pkg.version, tags)
  const lines = `version=${version}\nbump=${version !== pkg.version}\n`

  process.stdout.write(lines)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
