// How-to content for the interactive guide. Lists of skills, agents, and
// workflow phases come from catalog.js, and the worked example comes from
// example-data.js (both generated); keep this file to what a generator cannot
// know: intent, order, examples, and troubleshooting. Every string is plain
// text: renderers set it with textContent.
window.GUIDE = {
  product: 'SDD Kit',
  version: '3.1.0',
  repo: 'https://github.com/BODYA7979/sdd-kit',
  tagline: 'One front door, fixed pipelines, verified outcomes.',
  promise: 'Write down what "done" means, let the agent build it through gates, and approve the result as a human.',

  afterSdd: {
    intro: '/sdd starts the work; these continue, check and finish it.',
    groups: [
      {
        id: 'continue', label: 'Continue',
        items: [
          { cmd: '/execute-task --spec=<id> --continue', when: 'Resume an approved spec task by task in a fresh session, on a new day, or a switch to the other repo.' },
          { cmd: '/investigate "<question>"', when: 'Get a sourced answer and a recommendation before you decide.' },
        ],
      },
      {
        id: 'check', label: 'Check',
        items: [
          { cmd: '/run-tests', when: 'Run the project\'s test suite with the stack\'s runner; --frontend runs the frontend tests and --e2e runs the browser journeys.' },
          { cmd: '/deep-review', when: 'Get a blocking verdict before merge from a reviewer that never saw your prompt.' },
          { cmd: '/progress', when: 'Where was I: task progress per spec and the next task. --health adds a project health snapshot.' },
          { cmd: '/spec-board', when: 'See every spec by status, with approval and open-question warnings and AC coverage.' },
        ],
      },
      {
        id: 'finish', label: 'Finish',
        items: [
          { cmd: '/open-pr --spec=<id> --report=<report>', when: 'Open spec-traced PRs, one per repo, backend first and cross-linked.' },
          { cmd: '/learn "<finding>"', when: 'Turn a review finding, bug class or CI failure into a durable guard, so the mistake cannot recur.' },
        ],
      },
    ],
  },

  specBoard: {
    what: 'A read-only Kanban of your specs: columns by status (draft, approved, in progress, done), backlog slices that have no spec yet, warnings for missing approval and open questions, and acceptance-criteria coverage per spec. It reads the spec files themselves, so it cannot drift from them.',
    commands: [
      { label: 'In a session', code: '/spec-board' },
      { label: 'Standalone CLI (either host)', code: 'npx github:stasmarkov/sdd-kit spec-board --serve' },
      { label: 'Snapshot', code: 'npx github:stasmarkov/sdd-kit spec-board --out /tmp/spec-board.html' },
      { label: 'Split repos', code: 'npx github:stasmarkov/sdd-kit spec-board api/.ai/specs web/.ai/specs --serve' },
    ],
    note: 'The npx form needs Node 18+ and git, and works in any repo that has .ai/specs. Add #v3.1.0 after the repo name to pin a release. The package is not published to npm.',
    exampleHref: 'example-board.html',
  },

  stacks: {
    now: 'Laravel API + Next.js',
    roadmap: 'Symfony and Java as first-class stacks, and Drupal and Swift beyond their early previews; add your own with /new-stack',
    href: 'https://github.com/BODYA7979/sdd-kit/blob/main/README.md',
  },

  routes: [
    {
      id: 'trivial', label: 'Trivial change', icon: '·',
      when: 'Clear change, about three files or fewer, no design choice: copy fix, config tweak, rename.',
      example: '/sdd Rename the "Bill" button to "Invoice" on the billing page',
      launches: 'simple-task skill', spec: 'none',
      outputs: ['Diff', 'Gate results'],
      done: 'Gates are green.',
    },
    {
      id: 'bug', label: 'Bug', icon: '!',
      when: 'Existing behavior is wrong: a symptom, an error, a regression, "it used to work".',
      example: '/sdd On every invoices page the last invoice is missing — 10 per page shows 9',
      launches: 'fix-bug workflow', spec: 'none — the bug pipeline is the spec',
      outputs: ['Root cause with evidence', 'Regression test (red → green)', 'Minimal fix', 'Manual test steps'],
      done: 'Verdict FIXED: the regression test went red → green, gates are green, and the original report was re-walked end to end.',
    },
    {
      id: 'decision', label: 'Technology decision', icon: '?',
      when: 'A choice between technologies or approaches must be made before building.',
      example: '/sdd Should invoice exports run on Horizon queues or a scheduled batch job?',
      launches: 'tech-research workflow', spec: 'ADR instead of a spec',
      outputs: ['Weighted criteria', 'Sourced research per option', 'Architecture decision record'],
      done: 'The ADR is written and signed off by a human.',
    },
    {
      id: 'feature', label: 'Feature', icon: '+',
      when: 'Anything else that adds or changes behavior.',
      example: '/sdd PROJ-123: Export invoices as CSV',
      launches: 'write-spec → your approval → ship-feature workflow', spec: 'sized XS / S / M / L',
      outputs: ['Spec folder (spec-lite.md, tasks.md, …)', 'Implemented tasks', 'Adversarial review findings', 'Updated docs', 'Manual test plan'],
      done: 'Gates green, no confirmed blocking review findings, and acceptance re-walks the ticket\'s scenario.',
      gate: 'ship-feature never starts on a spec you have not approved in the current conversation. Choose Approve only to build it yourself with /execute-task instead.',
    },
    {
      id: 'shipped', label: 'Already shipped', icon: '✓',
      when: 'Code exists and needs a QA plan or documentation, not changes.',
      example: '/sdd Write the QA plan and docs for the invoice export we shipped last sprint',
      launches: 'qa-and-docs workflow', spec: 'uses an existing spec, paths, or a git range',
      outputs: ['Traceable QA plan', 'User and developer docs'],
      done: 'The grader passes coverage and phantom-link checks.',
    },
    {
      id: 'newapp', label: 'New app', icon: '◇',
      when: 'Little or no code exists yet for the target. Start from the idea with /product-brief; /sdd offers it when there is no brief.',
      example: '/product-brief "Customer portal for the billing API"  →  /sdd <the first slice\'s Run line>',
      launches: '/product-brief (brief + sliced backlog) → greenfield-build workflow', spec: 'product brief + architecture decision + one vertical slice',
      outputs: ['product-brief.md: roles, MVP scope, draft business rules, metrics', 'backlog.md: sized slices, each with its /sdd line', 'Scaffold + architecture-selected local or hosted CI', 'One end-to-end vertical slice', 'Journey and architecture-decision evidence', 'Handoff docs'],
      done: 'Scaffolding and the slice are complete, gates pass, the architecture plan is sound, every decision has one passing evidence-backed check, and the journey passes without broken links. Only then is the slice marked shipped in backlog.md; unfinished work remains visible in the backlog.',
    },
  ],

  pipeline: [
    { id: 'intake', title: 'Intake', who: 'agent + you', text: '/sdd routes the request; /write-spec sizes it, investigates the code, researches, and asks clarifying questions. A fresh agent then lists hidden assumptions.' },
    { id: 'approve', title: 'Human review', who: 'you', text: 'Read the one-page spec-lite.md against the code, business rules, and edge cases. The most important fifteen minutes of the feature. Spec lint runs before approval, and the spec stays draft while blockers remain.', accent: true, href: 'reference/stack-manifest.html' },
    { id: 'execute', title: 'Execute', who: 'agent', text: 'One task at a time, each with its own verification. Saved spec-task state survives a fresh session or a switch to another repo. Active workflow recovery follows the selected host’s rules.' },
    { id: 'gates', title: 'Gates', who: 'tools', text: 'Formatter, static analysis, debug-call scan, tests (Pest, Vitest, and Playwright e2e journeys on web stacks), type-check, production build. "Tool unreachable" is never a pass. When CI goes red later, /fix-ci restores the gates without weakening them.' },
    { id: 'converge', title: 'Converge', who: 'agent', text: 'Compare the code with the spec; append tasks for gaps instead of patching silently, then build and gate again.' },
    { id: 'review', title: 'Independent review', who: 'fresh agent', text: 'An adversarial reviewer in a fresh context tries to refute each finding; only survivors are reported.' },
    { id: 'acceptance', title: 'Acceptance', who: 'agent', text: 'Re-walk the original request end to end using available browser tools, HTTP for APIs, or a simulator. Green unit tests alone are not acceptance; an unavailable browser is reported as not run. Where the frontend has Playwright test configuration, ship-feature can preserve the walk as an e2e test traced to the AC ids.' },
    { id: 'docs', title: 'Docs & knowledge', who: 'agent', text: 'Update gotchas, invariants, contracts, and decisions so the next session starts smarter.' },
  ],

  spec: {
    folder: '.ai/specs/spec-PROJ-123-invoice-csv-export/',
    naming: 'Named by ticket key, or spec-YYYYMMDD-HHMM-<slug> without a ticket. Created atomically, so parallel sessions never collide. Legacy numeric ids still resolve.',
    sizes: [
      { size: 'XS', artifacts: 'No spec — use the bug route or simple-task' },
      { size: 'S', artifacts: 'spec-lite.md + tasks.md' },
      { size: 'M / L', artifacts: 'Full set: + business rules, decisions, references, manual test — only when needed' },
    ],
    frontmatter: [
      { key: 'status', meaning: 'draft → approved → in-progress → done' },
      { key: 'ticket', meaning: 'Tracker key, e.g. PROJ-123' },
      { key: 'stakeholders', meaning: 'Who must be able to read and approve it' },
      { key: 'approved_by / approved_at', meaning: 'Set by /sdd when you approve' },
      { key: 'size', meaning: 'XS / S / M / L — decides which files exist' },
    ],
    sections: [
      { name: 'Scope', meaning: 'In scope and, explicitly, out of scope',
        example: 'In: "Download CSV" on the invoices list, current filters applied. Out: PDF export, scheduled emails.' },
      { name: 'Must NOT change', meaning: 'Existing behavior that stays identical — a regression guard',
        example: 'The invoices list page size, sorting, and the existing JSON API response.' },
      { name: 'Acceptance criteria', meaning: 'AC-1… as WHEN … THE SYSTEM SHALL … or Given / When / Then, each mapped to a test or manual step',
        example: 'AC-1 WHEN a customer exports with the "unpaid" filter THE SYSTEM SHALL return only that customer\'s unpaid invoices. → feature test' },
      { name: 'Boundaries', meaning: 'Always / Ask first / Never',
        example: 'Always stream the file. Ask first before adding a queue. Never include other customers\' invoices.' },
      { name: 'Open questions', meaning: 'Must be empty or accepted before status: approved',
        example: 'Which timezone applies to the date-range filter? (answered: the customer\'s account timezone)' },
    ],
    example: 'WHEN a customer requests a CSV export with the "unpaid" filter THE SYSTEM SHALL return only that customer\'s unpaid invoices, newest first.',
  },

  addons: [
    { name: 'sdd-kit-laravel-nextjs', install: { plugin: '/plugin install sdd-kit-laravel-nextjs@sdd-kit', fileCopy: 'cd /path/to/your-project && /path/to/sdd-kit/install.sh --project --full --stack=laravel,nextjs' }, what: 'Preset: the core plus the Laravel, Next.js and devenv add-ons. Installing the core alone gives no stack knowledge', skills: [] },
    { name: 'sdd-kit-laravel', install: { plugin: '/plugin install sdd-kit-laravel@sdd-kit', fileCopy: 'cd /path/to/your-project && /path/to/sdd-kit/install.sh --project --full --stack=laravel' }, what: 'Laravel API development: Laravel 12, Pest, DTO-first and service-repository skills and the laravel-backend-dev agent', skills: ['laravel-12', 'pest-3', 'dto-first', 'service-repository'] },
    { name: 'sdd-kit-nextjs', install: { plugin: '/plugin install sdd-kit-nextjs@sdd-kit', fileCopy: 'cd /path/to/your-project && /path/to/sdd-kit/install.sh --project --full --stack=nextjs' }, what: 'Next.js frontend development: Next.js 15, TypeScript, Tailwind, testing and auth skills and the nextjs-frontend-dev agent', skills: ['nextjs-15', 'typescript', 'tailwind-4', 'nextjs-testing'] },
    { name: 'sdd-kit-devenv', install: { plugin: '/plugin install sdd-kit-devenv@sdd-kit', fileCopy: 'cd /path/to/your-project && /path/to/sdd-kit/install.sh --project --full --with=devenv' }, what: 'Local development environment: ddev and docker skills', skills: ['ddev', 'docker'] },
    { name: 'sdd-kit-ops', install: { plugin: '/plugin install sdd-kit-ops@sdd-kit', fileCopy: 'cd /path/to/your-project && /path/to/sdd-kit/install.sh --project --full --with=ops' }, what: 'Deploy, rollback, feature flags, health checks, incident response, ops analysis', skills: ['deploy', 'rollback', 'feature-flag', 'health-check', 'incident'] },
    { name: 'sdd-kit-ios', install: { plugin: '/plugin install sdd-kit-ios@sdd-kit', fileCopy: 'cd /path/to/your-project && /path/to/sdd-kit/install.sh --project --full --stack=ios' }, what: 'Early preview. iOS / Swift: SwiftUI and Swift Testing skills, ios-mobile-dev agent, templates', skills: ['ios-native', 'swift-testing'] },
    { name: 'sdd-kit-drupal', install: { plugin: '/plugin install sdd-kit-drupal@sdd-kit', fileCopy: 'cd /path/to/your-project && /path/to/sdd-kit/install.sh --project --full --stack=drupal' }, what: 'Early preview. Drupal 11 module development', skills: ['drupal-11'] },
    { name: 'sdd-kit-design', install: { plugin: '/plugin install sdd-kit-design@sdd-kit', fileCopy: 'cd /path/to/your-project && /path/to/sdd-kit/install.sh --project --full --with=design' }, what: 'UI/UX design skill and advisor agent', skills: ['design-ui'] },
  ],

  addonsNote: 'These commands add an add-on to a project. On a fresh install, --with also brings the default stacks (laravel, nextjs) and devenv; add --stack=none for core plus that add-on only.',

  everydayIntro: 'More commands for situations outside the /sdd flow. /sdd starts the work and the after-/sdd set continues, checks and finishes it; these cover the rest.',
  everyday: [
    { task: 'Small change without ceremony', code: '/simple-task "add a created_at column to the export"' },
    { task: 'Start an approved spec task by task', code: '/execute-task --spec=PROJ-123' },
    { task: 'CI is red on a PR', code: '/fix-ci 482' },
    { task: 'Fold feedback into the backlog', code: '/product-brief --intake "<sprint review notes>"' },
    { task: 'Frontend and journey tests', code: '/run-tests --frontend   ·   /run-tests --e2e "AC-2:"' },
    { task: 'Review a branch like CI does', code: '/deep-review --depth=standard --branch=<branch> --base=main' },
    { task: 'Project health snapshot', code: '/progress --health' },
    { task: 'Board snapshot to attach to a ticket', code: '/spec-board --out spec-board.html' },

  ],

  roles: [
    { role: 'New to SDD Kit', focus: 'Read the primer, install the kit, run /write-docs --type=all in your Laravel + Next.js project (new product: /product-brief), then run /sdd on a small ticket, then read Hireboard chapter 04 to see a whole feature go through the kit.' },
    { role: 'Developer', focus: 'Start every piece of work with /sdd; keep project instructions short; promote repeated mistakes into rules, skills, or hooks with /learn.' },
    { role: 'Tech lead', focus: 'Pin the plugin version, review specs before implementation, keep CI gates identical to local gates, rerun evals on upgrades.' },
    { role: 'PM / client', focus: 'Read and approve spec-lite.md — one page in plain language. Open the spec board to see what awaits approval. Ask for the stakeholder output style for summaries.' },
    { role: 'QA', focus: 'qa-and-docs turns shipped code and acceptance criteria into a traceable test plan.' },
  ],

  links: [
    { label: 'Documentation structure', href: 'documentation-structure.html' },
    { label: 'Getting started', href: 'reference/getting-started.html' },
    { label: 'Installation & upgrade', href: 'reference/installation.html' },
    { label: 'Claude Code setup', href: 'hosts/claude.html?host=claude' },
    { label: 'Codex setup', href: 'hosts/codex.html?host=codex' },
    { label: 'Compare hosts', href: 'hosts/compare.html?host=compare' },
    { label: 'Stack manifest', href: 'reference/stack-manifest.html' },
    { label: 'Usage examples', href: 'reference/usage-examples.html' },
    { label: 'Worked example: Hireboard', href: 'examples/job-board/README.html' },
    { label: 'Example spec board', href: 'example-board.html' },
    { label: 'Spec board skill', href: 'https://github.com/BODYA7979/sdd-kit/blob/main/plugins/sdd-kit/skills/spec-board/SKILL.md' },
    { label: 'Plugin mode', href: 'reference/plugin-mode.html' },
    { label: 'Multi-repo', href: 'reference/multi-repo.html' },
    { label: 'Model tiers', href: 'reference/effort-guidelines.html' },
    { label: 'Third-party components', href: 'reference/third-party.html' },
  ],
};
