# sdd-kit-drupal

Drupal 11 add-on: drupal-11 skill with module scaffolding.

## Claude Code

Inside Claude Code:

```text
/plugin marketplace add stasmarkov/sdd-kit
/plugin install sdd-kit-drupal@sdd-kit
```

These commands install the original release marketplace version. For changes in this fork, use a reviewed checkout or built team marketplace. Start a fresh session after installation and use the plugin-qualified skill names. [Claude installation](https://github.com/BODYA7979/sdd-kit/blob/main/docs/hosts/claude.md).

## Codex

The native Codex `sdd-kit@sdd-kit` package already bundles this add-on’s first-party skills and role resources. Do not install this Claude plugin directory directly in Codex.

Use a revision containing `adapters/codex/`; the original upstream `v3.1.0` tag predates native support. [Codex installation](https://github.com/BODYA7979/sdd-kit/blob/main/docs/hosts/codex.md).

## Scope and setup

Bundled guidance does not install application runtimes, external services or optional MCP integrations. Review project prerequisites, hook execution and actual gate evidence with the host’s `framework-doctor` skill.

Version and component metadata: [plugin manifest](.claude-plugin/plugin.json).

- [Shared first session](https://github.com/BODYA7979/sdd-kit/blob/main/docs/reference/getting-started.md)
- [Host comparison](https://github.com/BODYA7979/sdd-kit/blob/main/docs/hosts/compare.md)
- [Worked example](https://github.com/BODYA7979/sdd-kit/blob/main/docs/examples/job-board/README.md)
