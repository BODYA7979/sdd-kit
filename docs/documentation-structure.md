# Documentation structure and host selection

The documentation uses **shared concepts, separate host setup, and a persistent agent selector**. This keeps the SDD process in one place while making installation and commands explicit.

## Where to start

| Reader's question | Destination |
| --- | --- |
| What is SDD Kit, and which host can I use? | [README](../README.md) and [interactive guide](index.html) |
| How do I install it? | [Installation](reference/installation.md), then [Claude Code](hosts/claude.md) or [Codex](hosts/codex.md) |
| What changes between hosts? | [Host comparison](hosts/compare.md) |
| What should I do after installation? | [First session](reference/getting-started.md) |
| How do specs, approvals and gates work? | Shared [specification reference](reference/specification-system.md) |
| What does a complete project look like? | [Hireboard walkthrough](examples/job-board/README.md), with host instructions and clearly labeled historical fixtures |
| How do I maintain these docs? | [Maintenance guide](maintaining-docs.md) |

## Selector behavior

The guide header offers **Compare both**, **Claude Code** and **Codex**. Compare is the default for a new reader. Selecting a host changes installation recipes, first-session steps, copyable skill commands, hook explanations, workflow entry points, catalog model labels and troubleshooting. Shared specifications and acceptance concepts remain visible.

Each copy button copies the displayed variant. Registered skill names are mapped through the source-derived catalog; shell paths, built-in commands and workflow API examples are not mechanically converted. Claude plugin commands include their owning package namespace; file-copy shorthand is explained separately. Codex-only skills are absent from the Claude catalog.

The selection is stored in the browser. A `?host=codex`, `?host=claude` or `?host=compare` URL takes precedence, so a teammate can open the same view. Local page navigation carries the selection even if storage is unavailable. Quickstart progress is stored separately per host, so checking a Claude installation step does not mark Codex installed.

Reference pages retain both explicitly labeled command forms. A host-specific page always documents its named host; its context note explains that the selector controls the guide preference. This preserves readable Markdown and keeps cross-host comparisons available without JavaScript. Use the host navigation links to switch installation guides.

## Why this organization

| Option | Benefit | Cost | Decision |
| --- | --- | --- | --- |
| Two complete documentation trees | Every page can focus on one host | Shared spec and process explanations drift; readers must change sites to compare | Avoid |
| Both variants everywhere | Simple Markdown; differences always visible | Long installation pages and repeated command blocks during everyday use | Use for references and comparison |
| Shared docs with host selector and separate installation pages | One process explanation; focused commands; direct links to setup | Requires explicit variant data and selector checks | Use for the interactive guide |

The selector changes documentation presentation, not the installed host or application settings. Model tiers, hook coverage and recovery semantics remain documented differences rather than implied parity.

## Editorial scope

Current user documentation includes the root README, plugin READMEs, reference pages, host guides, walkthrough chapters, human-facing hook/template/review READMEs and the guide data. Markdown pages generate their corresponding HTML.

The release changelog and Hireboard artifact files retain their historical facts. Executable skill instructions, agent role definitions, rule files and templates remain the runtime sources; changing the documentation does not rewrite their operational behavior. The catalog reads their metadata, and documentation claims are checked against the adapters and installers.

See [validation](validation.md) for the distinction between package tests, bounded host acceptance and real application validation.
