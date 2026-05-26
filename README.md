<p align="center">
  <br />
  <img src=".github/logo.svg" width="400" alt="npi logo" />
  <br />
</p>

<h1 align="center">npi</h1>

<p align="center">
  <strong>A practical npm package advisor that combines npm metadata, GitHub signals, package rules, and project context before installation.</strong>
</p>

<p align="center">
  Think before you install.
</p>

<p align="center">
  <a href="https://github.com/dasepmoch/npi/actions/workflows/ci.yml"><img src="https://github.com/dasepmoch/npi/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/dasepmoch/npi/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <a href="https://www.npmjs.com/package/@dasepmoch/npi"><img src="https://img.shields.io/npm/v/@dasepmoch/npi.svg" alt="npm version" /></a>
  <a href="https://buymeacoffee.com/dasepmoch"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow.svg" alt="Buy Me a Coffee" /></a>
</p>

<p align="center">
  <a href="#features">Features</a> -
  <a href="#install">Install</a> -
  <a href="#usage">Usage</a> -
  <a href="#configuration">Config</a> -
  <a href="#plugin-system">Plugins</a> -
  <a href="#scoring-system">Scoring</a>
</p>

---

## What is npi?

**npi** is a heuristic npm install assistant that helps you think before adding dependencies.

It analyzes packages using npm registry metadata, GitHub signals, curated rules, and your project context - then gives you health scores, bundle impact, and suggests alternatives when appropriate.

```bash
# Instead of blindly installing:
npm install moment

# Think first:
npi moment
```

```
  Estimated Health    42/100
  Bundle Impact       High
  Tree Shaking        None
  ESM                 No

  Warning: Moment.js is considered legacy.

  Suggested:
  - dayjs - 2KB immutable date library
  - date-fns - Modern modular date utility
  - luxon - Powerful date library by Moment team

  Reasons:
  - 72KB bundle size
  - Mutable API causes bugs
  - No tree-shaking
  - Ecosystem has moved on
```

## Features

- **Package Analysis** - Estimated health scores, bundle impact, DX quality
- **Smart Install** - Warns before problematic installs, suggests alternatives
- **Package Comparison** - Side-by-side comparison tables
- **Package Explanations** - Understand why packages exist and why ecosystems shift
- **Framework Detection** - Adapts recommendations to your stack (Next.js, Vite, etc.)
- **Project-Aware Rules** - Severity adjusts based on TypeScript, ESM, frontend/backend context
- **Dependency Audit** - Scan all dependencies in package.json at once (partial failure safe)
- **CI Mode** - Exit non-zero on issues for CI/CD pipelines with stable JSON schema
- **Plugin System** - Custom rules via validated JSON plugins
- **Typosquatting Detection** - Warns if a package name looks suspiciously similar to a popular one
- **License Risk Detection** - Flags restrictive licenses (GPL, AGPL, etc.)
- **Config & Cache Management** - Global/local config, cache commands
- **VSCode Extension** - Inline diagnostics and commands in your editor

## Install

```bash
npm install -g @dasepmoch/npi
```

```bash
# or with pnpm
pnpm add -g @dasepmoch/npi

# or with bun
bun add -g @dasepmoch/npi
```

Requires Node.js >= 18.

## Usage

### Analyze a package

```bash
npi lodash
npi react@latest
npi @scope/package@1.2.3
npi express --json
```

### Smart install

```bash
npi install axios
npi install lodash --dev
npi i moment
npi install react@18
```

The smart install flow:
1. Analyzes the package
2. Shows estimated health & bundle scores
3. Warns if problematic (deprecated, legacy, typosquat risk)
4. Suggests alternatives
5. Asks for confirmation
6. Installs your choice via detected package manager

### Compare packages

```bash
npi compare axios ky got
npi compare dayjs date-fns luxon
npi compare vitest jest
```

### Explain a package

```bash
npi why moment
npi why lodash
npi why request
```

### Audit dependencies

```bash
npi audit
npi audit --severity warning
npi audit --json
```

Scans all dependencies in your `package.json`. Continues even if some packages fail to analyze.

### CI mode

```bash
npi check
npi check --severity critical
npi check --json
```

Designed for CI/CD pipelines:
- Exits with code 0 if all dependencies pass
- Exits with code 1 if issues are found at or above the threshold
- JSON output includes `schemaVersion` for stability

```yaml
- run: npx @dasepmoch/npi check --severity warning
```

### Manage config

```bash
npi config                     # Show current config
npi config get cache.ttl       # Get a specific value
npi config set cache.ttl 7200  # Set a value
npi config path                # Show config file location
npi config reset               # Reset to defaults
```

### Manage cache

```bash
npi cache clear   # Clear all cached data
npi cache stats   # Show cache statistics
npi cache path    # Show cache directory
```

## Configuration

### Global config (`~/.npi/config.json`)

```json
{
  "cache": { "enabled": true, "ttl": 3600 },
  "ui": { "colors": true, "compact": false },
  "install": { "autoConfirm": false, "preferAlternatives": true },
  "telemetry": { "enabled": false }
}
```

### Local config (`.npirc` in project root)

Same format as global config. Local settings override global.

## Plugin System

Create custom rules by placing JSON files in `~/.npi/plugins/` or `.npi/plugins/` in your project.

Plugins are validated with a schema on load. Invalid plugins are skipped silently.

```json
{
  "name": "my-team-rules",
  "version": "1.0.0",
  "rules": [
    {
      "id": "no-jquery",
      "name": "No jQuery",
      "severity": "critical",
      "match": "jquery",
      "message": "jQuery is not allowed. Use native DOM APIs.",
      "alternatives": [{ "name": "native DOM", "description": "Built-in APIs" }],
      "reasons": ["Project uses React", "Unnecessary bundle weight"]
    }
  ]
}
```

Supports:
- Exact package name matching
- Glob patterns (`moment*`, `@legacy/*`)
- Multiple match patterns per rule
- Custom severity levels (`info`, `suggestion`, `warning`, `critical`)
- Alternative suggestions with reasons

## Built-in Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `npm-deprecated` | Critical | Package is deprecated on npm registry |
| `possible-typosquat` | Critical | Name is suspiciously similar to a popular package |
| `request-deprecated` | Critical | Known deprecated packages (request, node-sass) |
| `license-risk` | Warning | Restrictive license (GPL, AGPL, etc.) |
| `abandoned-package` | Warning | Not updated in 2+ years |
| `moment-legacy` | Warning | Known legacy packages with modern alternatives |
| `large-bundle-frontend` | Warning | Large bundle in frontend projects |
| `no-esm-in-esm-project` | Warning | CJS package in ESM project |
| `no-types` | Info/Warning | No TypeScript types (warning in TS projects) |
| `too-many-deps` | Warning | 15+ direct dependencies |
| `single-maintainer` | Info | Bus factor = 1 |

## Scoring System

> Scores are heuristic estimates based on npm registry metadata, GitHub signals, and curated rules. They are not absolute measures of quality.

### Estimated Health Score (0-100)
Evaluates release frequency, issue ratio, contributor count, commit velocity, maintenance activity, and bus factor.

### Bundle Impact (Estimated)
Estimates install size, transitive dependencies, tree-shaking quality, and runtime overhead. Not measured from actual bundler output.

### DX Score (Heuristic)
Analyzes TypeScript support, ESM compatibility, documentation quality, and API ergonomics.

### Ecosystem Score
Detects legacy packages, deprecated ecosystems, migration trends, and modern alternatives based on curated data and npm/GitHub signals.

## Limitations

- Scores are heuristic estimates, not absolute measures of package quality.
- Bundle impact is approximated from npm metadata, not actual bundler output.
- GitHub metadata may be unavailable due to rate limits or private repos.
- TypeScript support detection uses heuristics when `@types/*` can't be verified.
- This is not a replacement for `npm audit` or professional security review.
- Stable packages that rarely update may score lower on maintenance metrics.
- Transitive dependency analysis is estimated, not derived from lockfiles.

## Architecture

```
apps/
  cli/         Main CLI application
  vscode/      VSCode extension

packages/
  core/        Types, schemas, config, errors
  analyzer/    Package analysis orchestrator
  npm/         npm registry client
  github/      GitHub API client
  scoring/     Health, bundle, DX, ecosystem scoring
  rules/       Rule engine + plugin system + typosquat detection
  formatter/   Terminal UI rendering
  cache/       Local caching layer
```

Built with:
- TypeScript (strict mode)
- ESM-first
- pnpm workspace + Turborepo
- Vitest for testing

## Contributing

```bash
git clone https://github.com/dasepmoch/npi.git
cd npi
pnpm install
pnpm build
pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Support

If npi saves you time, consider supporting the project:

<a href="https://buymeacoffee.com/dasepmoch"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow.svg?style=for-the-badge" alt="Buy Me a Coffee" /></a>

## License

MIT - see [LICENSE](LICENSE) for details.
