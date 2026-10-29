# sdd-kit-laravel-nextjs

The Laravel + Next.js starting set for 3.x: installs the core plugin with the Laravel, Next.js and dev-environment add-ons. Ships no components of its own.

## Claude Code

Inside Claude Code:

```text
/plugin marketplace add stasmarkov/sdd-kit
/plugin install sdd-kit-laravel-nextjs@sdd-kit
```

These commands install the original release marketplace version. For changes in this fork, use a reviewed checkout or built team marketplace. Start a fresh session after installation and use the plugin-qualified skill names. [Claude installation](https://github.com/BODYA7979/sdd-kit/blob/main/docs/hosts/claude.md).

## Codex

Codex bundles the first-party skills in one native `sdd-kit@sdd-kit` package, so it does not need this dependency-only Claude preset.

Use a revision containing `adapters/codex/`; the original upstream `v3.1.0` tag predates native support. [Codex installation](https://github.com/BODYA7979/sdd-kit/blob/main/docs/hosts/codex.md).

## Scope and setup

Bundled guidance does not install application runtimes, external services or optional MCP integrations. Review project prerequisites, hook execution and actual gate evidence with the host’s `framework-doctor` skill.

Version and component metadata: [plugin manifest](.claude-plugin/plugin.json).

- [Shared first session](https://github.com/BODYA7979/sdd-kit/blob/main/docs/reference/getting-started.md)
- [Host comparison](https://github.com/BODYA7979/sdd-kit/blob/main/docs/hosts/compare.md)
- [Worked example](https://github.com/BODYA7979/sdd-kit/blob/main/docs/examples/job-board/README.md)
