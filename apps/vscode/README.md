# NPI - Intelligent npm Assistant

Package intelligence for VS Code. Analyze, compare, and get recommendations before installing npm packages.

## Features

- **Inline Diagnostics** - Automatically highlights problematic packages in your `package.json` with warnings and suggestions
- **Package Analysis** - Get health scores, bundle impact, and ecosystem status for any package
- **Package Comparison** - Compare multiple packages side-by-side
- **Dependency Audit** - Scan all your dependencies at once
- **Package Explanations** - Understand why packages exist and why ecosystems shift

## Commands

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type:

| Command | Description |
|---------|-------------|
| `NPI: Analyze Package` | Analyze a single package |
| `NPI: Audit Dependencies` | Audit all deps in your project |
| `NPI: Compare Packages` | Compare packages side-by-side |
| `NPI: Explain Package` | Explain why a package exists |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `npi.showInlineHints` | `true` | Show inline hints for problematic packages |
| `npi.severity` | `warning` | Minimum severity level to show diagnostics |
| `npi.cache.enabled` | `true` | Cache analysis results |

## How It Works

When you open a project with a `package.json`, NPI automatically analyzes your dependencies and shows:

- Red squiggly lines for **critical** issues (deprecated packages)
- Yellow squiggly lines for **warnings** (legacy packages with better alternatives)

Click on a warning to see the full recommendation and suggested alternatives.

## Requirements

- VS Code 1.85.0 or later
- Internet connection (for fetching package metadata)

## Links

- [GitHub](https://github.com/dasepmoch/npi)
- [CLI Tool](https://www.npmjs.com/package/@dasepmoch/npi)
- [Report Bug](https://github.com/dasepmoch/npi/issues)
