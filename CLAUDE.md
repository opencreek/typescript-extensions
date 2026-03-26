# CLAUDE.md

## Project Overview

`@opencreek/ext` is a TypeScript utility library providing functional collection processing, async chain support, and various utilities.

## Commands

```bash
# Build
pnpm run build      # compiles TypeScript → build/

# Test
pnpm test           # runs AVA tests (src/**/*.test.ts)

# Lint
pnpm run lint       # check with Prettier + ESLint
pnpm run lint:fix   # auto-fix issues
```

## Key Structure

```
src/
  index.ts                    # barrel export
  collections.ts              # Chain<T>, ObjectChain<K,T>
  collections/
    AsyncChain.ts             # AsyncChain<T>, AsyncObjectChain<K,T>
  BigDecimal.ts               # high-precision decimal arithmetic
  StopWatch.ts                # performance timing
  error.ts, raise.ts          # error utilities
  strings.ts                  # string/output helpers
  range.ts, sleep.ts, parseNumber.ts, objects.ts, table.ts, todo.ts
build/                        # compiled output (generated)
```

## Code Style

- No semicolons (Prettier config: `"semi": false`)
- Strict TypeScript (ES2020 target, CommonJS modules)
- ESLint with max-warnings=0
- Tests use AVA framework with ts-node

## Package Manager

Use `pnpm` (not npm or yarn).
