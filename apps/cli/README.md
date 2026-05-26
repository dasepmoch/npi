# npi

**Intelligent npm install assistant. Think before you install.**

npi is a dependency intelligence engine for the JavaScript ecosystem. It helps you make better decisions before installing packages - analyzing health, bundle impact, ecosystem sentiment, and recommending alternatives when appropriate.

## Install

```bash
npm install -g @dasepmoch/npi
```

After install, the `npi` command is available globally.

## Usage

```bash
# Analyze a package
npi lodash
npi react
npi express

# Smart install (analyzes first, suggests alternatives, then installs)
npi install axios
npi install lodash --dev
npi i moment

# Compare packages side-by-side
npi compare axios ky got
npi compare dayjs date-fns luxon

# Explain why a package exists and why ecosystems shift
npi why moment
npi why lodash

# Audit all dependencies in your project
npi audit
npi audit --severity warning

# CI mode (exits non-zero on issues)
npi check
npi check --severity critical --json
```

## Features

- Package analysis with health scores, bundle impact, and DX quality
- Smart install that warns before problematic installs and suggests alternatives
- Side-by-side package comparison
- Package explanations (why it exists, why ecosystems moved away)
- Framework detection (adapts recommendations to Next.js, Vite, etc.)
- Dependency audit for your entire package.json
- CI mode for pipelines
- Plugin system for custom team rules
- Configurable via `~/.npi/config.json` and local `.npirc`
- Fast with intelligent caching

## Example

```bash
$ npi moment

  Health Score        42/100
  Bundle Impact       High
  Tree Shaking        None
  ESM                 No

  Warning: Moment.js is considered legacy.

  Suggested:
  - dayjs - 2KB immutable date library
  - date-fns - Modern modular date utility
  - luxon - Powerful date library by Moment team
```

## Configuration

```json
{
  "cache": { "enabled": true, "ttl": 3600 },
  "ui": { "colors": true, "compact": false },
  "install": { "autoConfirm": false, "preferAlternatives": true },
  "telemetry": { "enabled": false }
}
```

## Plugin System

Create custom rules in `~/.npi/plugins/` or `.npi/plugins/`:

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

## Requirements

- Node.js >= 18.0.0

## License

MIT

## Links

- [GitHub](https://github.com/dasepmoch/npi)
- [Report Bug](https://github.com/dasepmoch/npi/issues)
