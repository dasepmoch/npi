# Contributing to npi

Thanks for your interest in contributing to npi.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/your-org/npi.git
cd npi

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run in dev mode (watch)
pnpm dev
```

## Project Structure

This is a pnpm monorepo managed by Turborepo.

- `apps/cli` - The main CLI application
- `apps/vscode` - VSCode extension
- `packages/*` - Shared libraries

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm build` and `pnpm test`
4. Submit a pull request

## Adding Package Rules

To add intelligence for a new package:

1. Add the package to `packages/scoring/src/ecosystem.ts` (if legacy/deprecated)
2. Add a rule in `packages/rules/src/package-rules.ts`
3. Optionally add an explanation template in `packages/explanation-engine/src/templates.ts`

## Adding a Plugin

See `examples/plugin-example.json` for the plugin format.

## Code Style

- TypeScript strict mode
- ESM-first
- No implicit any
- Prefer functional patterns
- Keep functions small and focused

## Commit Messages

Use conventional commits:

```
feat: add new scoring metric
fix: handle network timeout gracefully
docs: update README with new command
```
