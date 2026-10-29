// Explicit host differences. Shared SDD concepts live in guide-data.js.
(function () {
  'use strict';
  var glossary = [
    { term: 'Skill', meaning: 'Reusable instructions, loaded explicitly or when a task matches. Invocation depends on the host.', kitExample: 'sdd' },
    { term: 'Subagent', meaning: 'A worker with its own context, instructions and tools. The parent collects its actual result.', kitExample: 'code-explorer' },
    { term: 'Workflow', meaning: 'A fixed sequence of phases, schemas and gates. A workflow name is not necessarily a skill command.', kitExample: 'ship-feature' },
    { term: 'Hook', meaning: 'An event-triggered check. Effective coverage depends on host support, configuration and trust.', kitExample: 'block-dangerous' },
    { term: 'MCP server', meaning: 'A connection that supplies tools to the agent.', kitExample: 'Playwright, Context7; sdd-workflows in Codex' },
    { term: 'Project instructions', meaning: 'The files the host reads for local conventions. Keep shared project knowledge in AGENTS.md; Claude can import it through CLAUDE.md.', kitExample: 'AGENTS.md / CLAUDE.md' },
    { term: 'Spec', meaning: 'An agreed scope, acceptance criteria and tasks, approved by a human before feature implementation.', kitExample: '.ai/specs/spec-PROJ-123-<slug>/' }
  ];
  var claudePlugin = {
    label: 'Claude · plugin',
    steps: [
      { text: 'Inside Claude Code: add the released marketplace', code: '/plugin marketplace add stasmarkov/sdd-kit' },
      { text: 'Install the Laravel + Next.js preset (includes core and devenv)', code: '/plugin install sdd-kit-laravel-nextjs@sdd-kit' },
      { text: 'For a different stack: install core, then your selected add-ons', code: '/plugin install sdd-kit@sdd-kit' }
    ],
    note: 'Requires Claude Code, git, bash, jq and Node 18+. Start a fresh session and run /sdd-kit:framework-doctor. Commands below use plugin namespaces; file-copy users use /name. Browser acceptance also needs an available browser. The released upstream tag v3.1.0 is a Claude distribution.'
  };
  var claudeFiles = {
    label: 'Claude · file copy',
    steps: [
      { text: 'From your application root, preview the install', code: 'node /absolute/path/to/sdd-kit/cli/sdd-kit.mjs install --host claude --project --dry-run' },
      { text: 'Install into this application', code: 'node /absolute/path/to/sdd-kit/cli/sdd-kit.mjs install --host claude --project --stack=laravel,nextjs' }
    ],
    note: 'Use a local kit checkout. The current directory is the target: run these in your application, not inside the kit. This invokes install.sh and merges into .claude/. Existing project instructions remain yours. See Installation for backups, flags, user-level installs and removal.'
  };
  var codexInstall = {
    label: 'Codex · native plugin',
    steps: [
      { text: 'Clone the fork that contains the Codex adapter', code: 'git clone https://github.com/BODYA7979/sdd-kit.git\ncd sdd-kit' },
      { text: 'From the kit checkout: install build dependencies', code: 'npm ci --ignore-scripts' },
      { text: 'Preview registration commands (does not build or install)', code: 'node cli/sdd-kit.mjs install --host codex --dry-run' },
      { text: 'Build and install the native plugin', code: 'node cli/sdd-kit.mjs install --host codex' }
    ],
    note: 'Requires Node 20+, git, bash, jq and a Codex CLI exposing plugin marketplace add and plugin add. Use a revision containing adapters/codex; the original upstream v3.1.0 tag does not. Keep this checkout for updates. Open your application in a fresh Codex session, review exact hook definitions with /hooks, then invoke $framework-doctor and $sdd. All first-party add-ons are bundled. --project, --user, --stack and --with are Claude file-copy flags, not Codex options. Use --node /absolute/path/to/node when the host needs a specific Node runtime.'
  };
  var flags = [
    { flag: '--project | --user', meaning: 'Claude file copy: ./.claude or ~/.claude' },
    { flag: '--minimal | --full', meaning: 'Claude file copy: core subset or full core' },
    { flag: '--stack=laravel,nextjs | --stack=none', meaning: 'Claude file copy: select stack add-ons' },
    { flag: '--with=devenv,ops,design', meaning: 'Claude file copy: add optional capabilities' },
    { flag: '--dry-run', meaning: 'Preview the selected installer; no installation' }
  ];
  var sharedStart = [
    { title: 'Describe the work', text: 'Use the SDD router. Confirm its proposed route and supply the project context it needs.', code: '/sdd PROJ-123' },
    { title: 'Approve the feature spec', text: 'Read scope, acceptance criteria and boundaries. Approve explicitly before implementation, request changes, or stop. The spec is shared across hosts.', code: '.ai/specs/spec-PROJ-123-<slug>/spec-lite.md' },
    { title: 'Check the result', text: 'Review gate results, browser evidence and unresolved limitations. A started workflow or missing browser is not a completed task.', code: '/progress' }
  ];
  var hooks = {
    claude: [
      { event: 'PreToolUse · Bash', does: 'Shell safeguards and commit conventions, when installed and enabled.' },
      { event: 'PreToolUse · Write/Edit', does: 'Test-first and file checks through Claude tool events.' },
      { event: 'PostToolUse', does: 'Changed-file checks and external-content checks for configured tools.' },
      { event: 'Stop · SubagentStop', does: 'Configured completion checks; human acceptance remains separate.' },
      { event: 'SessionStart · PreCompact · SessionEnd', does: 'Load project context and save session state.' }
    ],
    codex: [
      { event: 'PreToolUse · shell / apply_patch', does: 'Adapt supported shell payloads and normalize patch files for the shared guards. Shell-based file writes are outside patch coverage.' },
      { event: 'PostToolUse · apply_patch', does: 'Run configured shared checks against normalized file edits.' },
      { event: 'SessionStart · PreCompact · SessionEnd', does: 'Native lifecycle context and typed transcript handling; project state remains on disk.' },
      { event: 'Native completion review', does: 'Independent subagent review replaces prompt-based hook judgment. It cannot turn a blocked source verdict into success.' }
    ]
  };
  var commonProblems = [
    { problem: 'Browser checks report “not run”', fix: 'Confirm the browser tools are connected and can actually open the application. A running MCP server alone is not browser acceptance. See the selected host installation guide.' },
    { problem: 'Spec board finds no specs', fix: 'Run from the application root, or pass api/.ai/specs web/.ai/specs to the spec-board tool.' },
    { problem: 'The installed version lacks Codex support', fix: 'The upstream v3.1.0 release predates this adapter. Use this fork at a reviewed revision containing adapters/codex, build it, then install from that checkout.' }
  ];
  var codexProblems = [
    { problem: 'Codex installer rejects --project or --stack', fix: 'Codex uses a native plugin with all first-party add-ons. Pass --host codex and optionally --dry-run or --node. Claude file-copy flags do not apply.' },
    { problem: 'Hooks do not fire', fix: 'Use /hooks to review the exact definitions and $framework-doctor to inspect the environment. Hook support must be enabled and trusted. Installation does not grant trust.' },
    { problem: 'A skill is missing', fix: 'Open a fresh Codex session in your application. Check that sdd-kit@sdd-kit is enabled and use the installed $sdd or $framework-doctor skill.' },
    { problem: 'A workflow was interrupted', fix: 'Keep its run id and original plugin build. Ask sdd-runtime to resume that run and reconnect its existing workers. Do not start the same mutating work again or edit saved receipts.' },
    { problem: 'Which model does a worker use?', fix: 'Codex inherits the current model unless you explicitly provide a supported Codex mapping. Claude aliases opus, sonnet and haiku are not Codex model IDs.' }
  ];
  var claudeProblems = [
    { problem: 'Hooks do not fire', fix: 'Check jq, /hooks and /sdd-kit:framework-doctor. File-copy installations merge hooks into settings.json; plugins provide their own hooks. Verify actual execution.' },
    { problem: 'A skill is missing', fix: 'Plugin installs use /sdd-kit:<name> or the relevant add-on namespace. File-copy skills use /name and live one directory below .claude/skills.' },
    { problem: 'Old 1.x commands or context folders remain', fix: 'Follow the historical migration section in Installation. Review local customizations before removing legacy files.' },
    { problem: 'A workflow ran on the wrong model', fix: 'Check the phase tier and explicit args.models mapping. Model policy is documented separately for Claude Code and Codex.' }
  ];
  var sharedBrowser = 'Browser phases require a real available browser, assertions on the rendered application, and inspection of console and network failures. The packaged Playwright connection is a tool, not evidence that a check ran. Claude Code may fall back to Claude in Chrome; Codex uses an available native browser interface. Missing evidence is reported as not run.';
  var workflowClaude = {
    text: 'The SDD router is the recommended entry point. Claude also accepts registered workflow names and its Workflow API. These are host operations, separate from skills.',
    examples: [
      { label: 'Claude workflow command', code: '/fix-bug "On every invoices page the last invoice is missing"' },
      { label: 'Claude workflow API: explicitly approved spec', code: 'Workflow({ name: "ship-feature", args: { spec: "PROJ-123" } })' }
    ]
  };
  var workflowCodex = {
    text: 'Ask the sdd-runtime skill to drive a workflow. It uses the local workflow bridge and native subagents, retaining a run id for recovery. Workflow(...) and /workflows are not Codex commands.',
    examples: [
      { label: 'Codex: fix a bug through the router', code: '$sdd Fix the missing last invoice on every invoices page.' },
      { label: 'Codex: explicitly approved spec', code: '$sdd-runtime Run ship-feature for the approved spec PROJ-123 in this workspace.' },
      { label: 'Codex: status and recovery', code: '$sdd-runtime Show the status of run <run-id>. If interrupted, inspect it before resuming and reconnect the original workers.' }
    ]
  };
  var profiles = {
    claude: {
      primer: {
        what: 'Claude Code runs in your project and supplies the host tools. SDD Kit adds written specs, approval checkpoints, fixed workflows and evidence-based verification.',
        install: [{ label: 'Check your Claude Code CLI', code: 'claude --version' }, { label: 'Start in your application root', code: 'claude' }],
        installNote: 'Install and sign in using the official Claude Code setup guide below. Configure permissions for your environment; prompts depend on the selected mode.',
        firstSession: [{ do: 'Open your application', how: 'Start Claude Code in the application repository.' }, { do: 'Install and verify the kit', how: 'Choose a plugin or file-copy install. Restart the session, inspect /hooks and run framework-doctor.' }, { do: 'Choose a task', how: 'Invoke the sdd skill with a ticket or a plain-language request.' }],
        glossary: glossary, docs: [{ label: 'Claude Code setup', href: 'https://code.claude.com/docs/en/setup' }], next: 'Continue to installation, then run the first-task checklist.'
      },
      install: { plugin: claudePlugin, fileCopy: claudeFiles, flags: flags },
      quickstart: [{ title: 'Install for Claude Code', text: 'Use the plugin recipe above, or the documented file-copy route. These commands assume the core plugin is installed.', code: '/plugin install sdd-kit@sdd-kit' }, { title: 'Verify the environment', text: 'Check hooks, skills and tools in a fresh session. Add the stack plugins your application needs.', code: '/framework-doctor' }, { title: 'Provide project context', text: 'Keep shared rules in AGENTS.md and import them from CLAUDE.md. Review generated project knowledge before relying on it.', code: '/write-docs --type=all' }].concat(sharedStart),
      hooks: hooks.claude, hooksNote: 'Claude hook coverage depends on installed definitions, tool events and configuration. Run framework-doctor and verify a harmless check actually fires.',
      workflowsDirect: workflowClaude, troubleshooting: claudeProblems.concat(commonProblems), browser: sharedBrowser,
      addonsNote: 'Claude Code installs the core and selected add-ons separately, or through a preset. File-copy selection uses --stack and --with. See Installation for the defaults.',
      stackTrust: { text: 'Claude custom stacks use .claude paths. Review exact commands and the manifest hash before approving with stack-trust; approvals live in ~/.claude/sdd-kit/trusted-stacks.json.', label: 'Stack manifest reference', href: 'reference/stack-manifest.html' }
    },
    codex: {
      primer: {
        what: 'Codex supplies native tools and subagents. SDD Kit runs its shared workflow scripts through a local MCP bridge in the same session, without launching Claude or nested codex exec.',
        install: [{ label: 'Check the Codex CLI', code: 'codex --version' }, { label: 'Confirm plugin commands are available', code: 'codex plugin --help' }],
        installNote: 'Use the official Codex setup instructions for your host. This kit installer requires the CLI even if you work in the desktop app. A host that only exposes a different plugin UI needs the matching supported installation route.',
        firstSession: [{ do: 'Build and install from the kit checkout', how: 'Use the Codex recipe below. Keep the checkout available for updates.' }, { do: 'Open your application', how: 'Start a fresh Codex session in the target repository, which reads AGENTS.md.' }, { do: 'Verify tools and hooks', how: 'Review exact hook definitions with /hooks. Invoke $framework-doctor, then $sdd with a small task.' }],
        glossary: glossary, docs: [{ label: 'Official Codex documentation', href: 'https://developers.openai.com/codex/' }, { label: 'Official plugin documentation', href: 'https://developers.openai.com/plugins/build/plugins' }], next: 'Install from a revision containing the adapter; an older upstream release is insufficient.'
      },
      install: { plugin: codexInstall, flags: [] },
      quickstart: [{ title: 'Install for Codex', text: 'Run the full recipe above from the kit checkout. Open your application in a fresh session afterward.', code: 'node cli/sdd-kit.mjs install --host codex' }, { title: 'Review hooks', text: 'Installation does not trust hooks. Inspect the exact definitions and enable supported hooks through the host.', code: '/hooks' }, { title: 'Verify the environment', text: 'Ask the native doctor to inspect the installed build, workflow bridge, skills and runtime prerequisites.', code: '$framework-doctor' }, { title: 'Provide project context', text: 'Codex reads AGENTS.md. Keep shared rules and documentation in the application; path-scoped SDD Markdown rules must be read by the runtime skill.', code: '$write-docs --type=all' }].concat(sharedStart),
      hooks: hooks.codex, hooksNote: 'Codex hooks need host support and exact-definition trust. Native completion review and patch normalization are adaptations; they do not establish full parity with every Claude hook.',
      workflowsDirect: workflowCodex, troubleshooting: codexProblems.concat(commonProblems), browser: sharedBrowser,
      addonsNote: 'The Codex package includes all first-party add-on skills and roles. No separate add-on installation is needed. Framework checks apply to matching projects; early stack previews remain early previews.',
      stackTrust: { text: 'Codex discovers custom stacks through .codex paths. Creating a manifest does not approve it. Use $stack-trust to review commands and the exact SHA-256; a changed manifest needs new approval.', label: 'Stack manifest reference', href: 'reference/stack-manifest.html' }
    }
  };
  profiles.compare = {
    primer: {
      what: 'SDD Kit is one shared development process for Claude Code and Codex. Choose your agent in the header for its installation, commands and runtime notes. Specifications, acceptance criteria and project knowledge stay shared.',
      install: [{ label: 'Claude Code · check the CLI', code: 'claude --version' }, { label: 'Codex · check plugin-capable CLI', code: 'codex plugin --help' }],
      installNote: 'The host must be installed and signed in before installing the kit. Claude offers marketplace and file-copy modes; Codex uses the native plugin built from this fork.',
      firstSession: [{ do: 'Choose the host', how: 'Use the header selector, or compare installation recipes below.' }, { do: 'Install the kit', how: 'Follow that host’s prerequisites, working directory and verification steps.' }, { do: 'Start a small task', how: 'The SDD router chooses a route, asks for the required inputs and waits for explicit feature-spec approval.' }],
      glossary: glossary, docs: profiles.claude.primer.docs.concat(profiles.codex.primer.docs), next: 'Shared concepts come next; host-specific commands are labeled wherever you can copy them.'
    },
    install: { plugin: claudePlugin, fileCopy: claudeFiles, codex: codexInstall, flags: flags },
    quickstart: [{ title: 'Install for your selected host', text: 'Complete one recipe in Install. Compare mode does not ask you to install both.', code: '' }, { title: 'Verify in a fresh application session', text: 'The doctor checks the host environment. Review /hooks separately, especially Codex exact-definition trust.', code: '/framework-doctor' }, { title: 'Provide project context', text: 'Use shared AGENTS.md and project docs; Claude can import AGENTS.md through CLAUDE.md. Codex reads AGENTS.md directly.', code: '/write-docs --type=all' }].concat(sharedStart),
    hooks: [{ event: 'Claude Code', does: 'Uses its plugin or settings hook definitions, Claude tool payloads and lifecycle events.' }, { event: 'Codex', does: 'Uses native event adapters, per-file patch normalization and independent completion review. Hook trust and host support are prerequisites.' }, { event: 'Both hosts', does: 'Keep source gate verdicts, require actual browser evidence and retain human approval. Neither installation nor an MCP connection proves checks ran.' }],
    hooksNote: 'Shared safeguards have different host coverage. Select a host for the details; see the host guides for limitations.',
    workflowsDirect: { text: 'These examples are deliberately labeled. A Claude workflow command or API call is not a Codex skill. Use the SDD router for normal work.', examples: workflowClaude.examples.concat(workflowCodex.examples) },
    troubleshooting: [{ problem: 'Which installation and command syntax should I use?', fix: 'Choose an agent in the header. Claude plugin skills use /sdd-kit:name (file copy: /name); Codex skills use $name. Workflow names and host built-ins are documented separately.' }].concat(commonProblems),
    browser: sharedBrowser,
    addonsNote: 'Claude uses selectively installed add-ons; the Codex native package bundles every first-party add-on. The catalog describes the shared source groups, not extra Codex installation steps.',
    stackTrust: { text: 'Stack manifests are shared data. Discovery and trust storage use .claude for Claude and .codex for Codex; both require explicit review of custom commands and an exact manifest hash.', label: 'Stack manifest reference', href: 'reference/stack-manifest.html' }
  };
  window.GUIDE_HOSTS = profiles;
})();
