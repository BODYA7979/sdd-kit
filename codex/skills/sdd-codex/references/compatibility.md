# Compatibility gates

| Component | State | Remaining evidence or work |
|---|---|---|
| Original six JavaScript workflows | Preserved; startup tested | Full successful and blocked paths with real native workers |
| Structured worker output | Ajv validation; stale claims rejected | Live worker schema repair behavior |
| Native orchestration | Parent skill plus MCP job queue | Desktop install, fresh workers, cancellation and reconnect acceptance |
| 61 upstream skills and assets | Bundled with provider mapping | Individual behavior and cross-skill invocation acceptance |
| 21 role instructions | Included in dispatched jobs | Tool restriction behavior and preload skills in real workers |
| Secret scanner, test-first and gate weakening guards | Patch-input adapter | Live Codex hook trust and invocation; shell-based file writes are outside patch guards |
| Prompt-based Stop/SubagentStop hooks | Explicit verification in orchestration skill | Not an automatic engine-level equivalent; independent final reviewer acceptance |
| Stack discovery and trust | Original code retained | Native plugin discovery and configuration storage require a dedicated adapter; do not claim custom-stack parity |
| Model tiers | Original requested aliases included in jobs | Inherit current model unless explicit Codex mapping is supplied; no equivalence between providers is claimed |
| Token budget | Upstream unbounded-budget branch | Native subagent token counts are unavailable; concurrency and job caps are enforced separately |
| Session start/end, prompt preflight, compaction | Original scripts wired through Codex event adapter | Live event acceptance; lesson transcript parser remains unported |
| Standalone review shell scripts | Not ported | Replace `claude -p` with native job orchestration |
| Spec board | Original standalone Node tool | Already read five shipped example specs in the prior audit |

Do not run the upstream Claude installer or edit Claude settings as a workaround. Report unsupported behavior rather than treating a missing hook, tool, gate or browser check as passing.
