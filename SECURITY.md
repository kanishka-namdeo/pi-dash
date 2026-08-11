# Security Policy

## Supported Versions

Currently, PiDash is in active development (v0.x). Security updates are provided for the latest release.

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**DO NOT** open a public issue for security vulnerabilities.

Instead, email [kanishkanamdeo@hotmail.com](mailto:kanishkanamdeo@hotmail.com) with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## What to Expect

- **Acknowledgment**: You'll receive a response within 48 hours
- **Assessment**: We'll evaluate the vulnerability and determine its severity
- **Updates**: We'll keep you informed of our progress
- **Disclosure**: We'll coordinate with you on public disclosure timing

## Security Best Practices

When using PiDash:

1. **GitHub Tokens**: Store tokens securely. Never commit them to version control
2. **OAuth**: OAuth credentials are stored in encrypted electron-store
3. **Environment Variables**: Use `.env` files (gitignored) for sensitive configuration
4. **Dependencies**: Keep dependencies updated. We use Dependabot for automated updates

## Security Features

- **Context Isolation**: Electron renderer runs in isolated context
- **Preload Bridge**: Secure IPC bridge via `contextBridge`
- **Token Encryption**: GitHub tokens encrypted at rest
- **No Remote Code**: All code runs locally; no remote code execution

## Dependencies

PiDash uses several third-party dependencies. We monitor for security advisories and update promptly when vulnerabilities are discovered.

If you find a vulnerability in a dependency, please report it to the dependency maintainer directly and consider opening an issue here so we can track the update.
