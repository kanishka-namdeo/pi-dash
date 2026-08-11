# Contributing to PiDash

Thank you for your interest in contributing to PiDash! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/kanishka-namdeo/pi-dash/issues) to avoid duplicates. When creating a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (OS, Node.js version, pnpm version)
- Screenshots if applicable

### Suggesting Features

Feature suggestions are welcome! Open an issue with the `enhancement` label and describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`) and type checking (`pnpm build:ts`)
5. Commit your changes with clear, descriptive messages
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/pi-dash.git
cd pi-dash

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm build:ts
```

## Code Style

- **TypeScript**: All code must be TypeScript with strict mode
- **Formatting**: Follow existing code style (Prettier config coming soon)
- **Components**: Keep components focused and under 150 lines
- **State**: Use hooks for state logic; components should be pure render functions
- **Testing**: Add tests for new features and bug fixes

## Project Structure

- `src/` — Electron main process
- `renderer/src/` — React UI components and hooks
- `landing/` — Astro marketing site
- `src/shared/` — Types shared between main and renderer

## Commit Messages

Use conventional commits:

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `refactor:` — Code refactoring
- `test:` — Adding tests
- `chore:` — Maintenance tasks

Example: `feat: add dark mode toggle to settings`

## Questions?

Open an issue or reach out to the maintainer.

Thank you for contributing!
