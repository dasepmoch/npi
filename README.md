<p align="center">
  <br />
  <img src=".github/logo.svg" width="400" alt="npi logo" />
  <br />
</p>

<h1 align="center">npi</h1>

<p align="center">
  <strong>Intelligent npm install assistant.</strong>
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
  <a href="#features">Features</a> •
  <a href="#install">Install</a> •
  <a href="#usage">Usage</a> •
  <a href="#philosophy">Philosophy</a> •
  <a href="#architecture">Architecture</a>
</p>

---

## What is npi?

**npi** is a dependency intelligence engine for the JavaScript ecosystem.

It helps you make better decisions before installing packages - analyzing health, bundle impact, ecosystem sentiment, and recommending alternatives when appropriate.

```bash
# Instead of blindly installing:
npm install moment

# Think first:
npi moment
```

```
╭─ 📦 Package ─────────────────────────────────╮
│ moment                                        │
│ Parse, validate, manipulate, and display dates│
╰───────────────────────────────────────────────╯

  Health Score        42/100
  Bundle Impact       High
  Dependencies        0
  TypeScript          @types
  Tree Shaking        None
  ESM                 No

  ⚠️ Warning

  Moment.js is considered legacy. The ecosystem has
  moved to lighter, immutable alternatives.

  Suggested:
  • dayjs - 2KB immutable date library
  • date-fns - Modern modular date utility
  • luxon - Powerful date library by Moment team

  Reasons:
  · 72KB bundle size
  · Mutable API causes bugs
  · No tree-shaking
  · Ecosystem has moved on
```

## Features

- **📊 Package Analysis** - Health scores, bundle impact, DX quality
- **🧠 Smart Install** - Warns before problematic installs, suggests alternatives
- **⚖️ Package Comparison** - Side-by-side comparison tables
- **📖 Package Explanations** - Understand why packages exist and why ecosystems shift
- **🔍 Framework Detection** - Adapts recommendations to your stack (Next.js, Vite, etc.)
- **🔎 Dependency Audit** - Scan all dependencies in package.json at once
- **🤖 CI Mode** - Exit non-zero on issues for CI/CD pipelines
- **🔌 Plugin System** - Custom rules via JSON plugins
- **⚙️ Config Support** - Global `~/.npi/config.json` and local `.npirc`
- **💻 VSCode Extension** - Inline diagnostics and commands in your editor
- **⚡ Fast** - Intelligent caching, parallel fetching, instant responses
- **🎨 Beautiful** - Premium terminal UI, screenshot-worthy output

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

## Usage

### Analyze a package

```bash
npi lodash
npi react
npi express
```

### Smart install

```bash
npi install axios
npi install lodash --dev
npi i moment
```

The smart install flow:
1. Analyzes the package
2. Shows health & bundle scores
3. Warns if problematic
4. Suggests alternatives
5. Asks for confirmation
6. Installs your choice

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

Understand:
- Why developers used it
- Why the ecosystem moved away
- Current sentiment
- Modern alternatives
- Migration recommendations

### Audit dependencies

```bash
npi audit
npi audit --severity warning
npi audit --json
```

Scans all dependencies in your `package.json` and reports issues.

### CI mode

```bash
npi check
npi check --severity critical
npi check --json
```

Designed for CI/CD pipelines:
- Exits with code 0 if all dependencies pass
- Exits with code 1 if issues are found at or above the threshold
- `--json` output for machine parsing

Example in GitHub Actions:
```yaml
- run: npx @dasepmoch/npi check --severity warning
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
      "alternatives": [{ "name": "native DOM", "description": "Built-in APIs" }]
    }
  ]
}
```

Supports:
- Exact package name matching
- Glob patterns (`moment*`, `@legacy/*`)
- Multiple match patterns per rule
- Custom severity levels
- Alternative suggestions

## Philosophy

Modern JavaScript ecosystems are chaotic. Developers:

- Install packages blindly
- Follow outdated tutorials
- Use abandoned dependencies
- Accidentally bloat bundles
- Duplicate functionality

**npi** is spellcheck for npm installs. A senior engineer inside your terminal.

It doesn't replace your package manager. It makes you a better decision-maker.

## Architecture

```
apps/
  cli/                    → Main CLI application
  vscode/                 → VSCode extension

packages/
  core/                   → Types, schemas, config, shared utilities
  analyzer/               → Package analysis orchestrator
  npm/                    → npm registry client
  github/                 → GitHub API client
  scoring/                → Health, bundle, DX, ecosystem scoring
  rules/                  → Rule engine + plugin system
  recommendation-engine/  → Recommendation orchestration
  explanation-engine/     → Package explanation generation
  framework-detector/     → Project framework detection
  formatter/              → Terminal UI rendering
  cache/                  → Local caching layer
  package-db/             → Curated package intelligence
  telemetry/              → Anonymous telemetry (opt-in)
  benchmarking/           → Performance measurement
```

Built with:
- TypeScript (strict mode)
- ESM-first
- pnpm workspace + Turborepo
- Modular, composable, testable

## Scoring System

> **Note:** Scores are heuristic estimates based on npm registry metadata, GitHub signals, and curated rules. They are not absolute measures of quality.

### Estimated Health Score (0-100)
Evaluates release frequency, issue ratio, contributor count, commit velocity, maintenance activity, and bus factor.

### Bundle Impact (Estimated)
Estimates install size, transitive dependencies, tree-shaking quality, and runtime overhead.

### DX Score (Heuristic)
Analyzes TypeScript support, ESM compatibility, documentation quality, and API ergonomics.

### Ecosystem Score
Detects legacy packages, deprecated ecosystems, migration trends, and modern alternatives.

## Limitations

- Scores are heuristic estimates, not absolute measures of package quality.
- Bundle impact is approximated from npm metadata, not actual bundler output.
- GitHub metadata may be unavailable due to rate limits or private repos.
- TypeScript support detection uses heuristics when `@types/*` can't be verified.
- This is not a replacement for `npm audit` or professional security review.
- Stable packages that rarely update may score lower on maintenance metrics.

## Roadmap

- [ ] AI recommendation layer
- [ ] Lockfile analysis
- [ ] Dependency graph visualization
- [ ] Organization package policies
- [ ] Web dashboard
- [ ] `npi migrate` command (auto-migration scripts)

## Contributing

```bash
# Clone
git clone https://github.com/dasepmoch/npi.git
cd npi

# Install
pnpm install

# Build
pnpm build

# Test
pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Support

If npi saves you time, consider supporting the project:

<a href="https://buymeacoffee.com/dasepmoch"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow.svg?style=for-the-badge" alt="Buy Me a Coffee" /></a>

## License

MIT - see [LICENSE](LICENSE) for details.
