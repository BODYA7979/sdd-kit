#!/bin/bash
#
# SDD Kit — file-copy installer
#
# Usage:
#   ./install.sh                               # interactive
#   ./install.sh --project [--minimal|--full]  # install into ./.claude
#   ./install.sh --user    [--minimal|--full]  # install into ~/.claude
#   ./install.sh --project --with=ops,ios      # add optional add-ons (derived from src/plugins/*/.claude-plugin/plugin.json)
#   ./install.sh --project --dry-run           # show what would change, write nothing
#   ./install.sh --help
#
# Installs merge into the target: files the framework does not own are never
# touched. A manifest (.framework-manifest) records what was installed, so a
# later run updates changed files, removes files the framework no longer ships,
# and backs up anything it overwrites or removes (latest backup only).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION=$(tr -d '[:space:]' < "$SCRIPT_DIR/VERSION" 2>/dev/null || true)
VERSION="${VERSION:-0.0.0}"

# Source roots. The workshop keeps everything under src/; the dist tree splits
# it into plugins/sdd-kit (agents, skills, commands, workflows, output styles,
# hook scripts), share/ (templates, settings, docs, installer scripts) and
# plugins/sdd-kit-<addon>.
resolve_sources() {
    if [[ -d "$SCRIPT_DIR/src/agents" ]]; then
        CORE_DIR="$SCRIPT_DIR/src"
        SHARE_DIR="$SCRIPT_DIR/src"
        HOOK_SCRIPTS_DIR="$SCRIPT_DIR/scripts"
        ADDON_ROOT="$SCRIPT_DIR/src/plugins"
        ADDON_PREFIX=""
    elif [[ -f "$SCRIPT_DIR/plugins/sdd-kit/.claude-plugin/plugin.json" && -d "$SCRIPT_DIR/share" ]]; then
        CORE_DIR="$SCRIPT_DIR/plugins/sdd-kit"
        SHARE_DIR="$SCRIPT_DIR/share"
        HOOK_SCRIPTS_DIR="$SCRIPT_DIR/plugins/sdd-kit/scripts"
        ADDON_ROOT="$SCRIPT_DIR/plugins"
        ADDON_PREFIX="sdd-kit-"
    else
        printf 'Error: framework sources not found next to %s.\n  Expected the workshop layout (src/agents/) or the dist layout (plugins/sdd-kit/.claude-plugin/plugin.json and share/).\n  Run install.sh from a clone of the repository or from the dist tree.\n' "$SCRIPT_DIR" >&2
        exit 1
    fi
    ADDONS_AVAILABLE=""
    local dir name
    for dir in "$ADDON_ROOT/${ADDON_PREFIX}"*/; do
        dir="${dir%/}"
        [[ -d "$dir" ]] || continue
        name="$(basename "$dir")"
        if [[ -z "$ADDON_PREFIX" && ! -f "$dir/.claude-plugin/plugin.json" ]]; then
            continue
        fi
        ADDONS_AVAILABLE+="${ADDONS_AVAILABLE:+ }${name#"$ADDON_PREFIX"}"
    done
}
resolve_sources

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; BLUE=$'\033[0;34m'
BOLD=$'\033[1m'; NC=$'\033[0m'

INSTALL_MODE=""
INSTALL_TYPE=""
ADDONS=""
THIRD_PARTY=false
DRY_RUN=false
ASSUME_YES=false
TARGET_DIR=""
MCP_TARGET=""
STAMP=$(date +%Y%m%d_%H%M%S)

# Files earlier versions installed that 2.0 no longer ships. Removed (after
# backup) even when no manifest exists yet, i.e. on upgrades from 1.x, but only
# when the file still matches a version the kit shipped: RETIRED_HASHES lists
# them (regenerate with tools/gen-retired-hashes.sh after editing this list).
RETIRED_HASHES="$SHARE_DIR/scripts/retired-1x.sha256"
RETIRED_PATHS=(
    agents/execution/api-dev.md agents/execution/integration-dev.md agents/execution/database-dev.md
    agents/quality/code-reviewer.md agents/operations/knowledge-graph-manager.md
    agents/operations/learning-extractor.md agents/operations/monitor.md agents/operations/log-analyst.md
    agents/operations/support-analyst.md agents/operations/incident-responder.md
    agents/release/release-manager.md agents/release/deployment-specialist.md
    agents/release/rollback-specialist.md agents/design/ui-ux-advisor.md agents/execution/ios-mobile-dev.md
    agents/all-agents.md skills/all-skills.md commands/all-commands.md commands/_shared/routing-guide.md commands/_shared/verification-gates.md
    commands/_shared/source-verification.md scripts/kg-capture.sh scripts/init-knowledge-graph.js
    hooks/post-change-kg-sync.sh
    # 1.x kept agents in category folders; 2.0 agents are flat.
    agents/design/api-architect.md
    agents/design/database-designer.md
    agents/design/system-architect.md
    agents/discovery/code-explorer.md
    agents/discovery/dependency-analyzer.md
    agents/discovery/pattern-discoverer.md
    agents/discovery/tech-researcher.md
    agents/execution/devops-engineer.md
    agents/execution/laravel-backend-dev.md
    agents/execution/nextjs-frontend-dev.md
    agents/operations/context-fetcher.md
    agents/operations/doc-creator.md
    agents/quality/adversarial-reviewer.md
    agents/quality/code-quality.md
    agents/quality/outcomes-grader.md
    agents/quality/performance-tester.md
    agents/quality/security-auditor.md
    agents/quality/test-runner.md
    agents/quality/test-writer.md
    agents/release/changelog-writer.md
    agents/release/git-workflow.md
    agents/upstream/intake-processor.md
    agents/upstream/requirements-analyst.md
    # 1.x skills and templates removed in 2.0 (vendored, superseded, or duplicated in skill assets).
    skills/obsidian-sync/SKILL.md
    skills/prompt-engineering-patterns/SKILL.md
    skills/prompt-engineering-patterns/references/{agent-prompt-design,pattern-examples}.md
    skills/stripe-best-practices/SKILL.md
    skills/stripe-best-practices/references/{billing,connect,payments,security,treasury}.md
    skills/stripe-projects/SKILL.md skills/upgrade-stripe/SKILL.md
    skills/skill-creator/SKILL.md skills/skill-creator/assets/eval_review.html
    skills/skill-creator/agents/{analyzer,comparator,grader}.md
    skills/skill-creator/eval-viewer/generate_review.py skills/skill-creator/eval-viewer/viewer.html
    skills/skill-creator/references/{patterns,schemas,spec-summary,validation-checklist}.md
    skills/skill-creator/scripts/{aggregate_benchmark,generate_report,improve_description,package_skill,quick_validate,run_eval,run_loop,utils}.py
    skills/skill-creator/scripts/validate-skill.sh
    templates/code/laravel/{controller,dto,repository,service,test}.template.php
    templates/code/laravel/module-scaffolding-guide.md
    templates/code/nextjs/{api-route,hook}.template.ts templates/code/nextjs/{component,page}.template.tsx
    templates/specs/{code-review-checklist,epic,feature-flag-doc,feature,requirements,user-story}.template.md
    templates/specs/execute-task-workflow.md
    templates/context/workflow.template.md
    templates/commands/_templates/command.template.md
    templates/knowledge-graph/README.md
    templates/knowledge-graph/{architecture,cross-project,decisions,domain-layers,incidents,project,team}-schema.json
    # drupal-11 moved to the drupal add-on; --with=drupal stages it again, so it is kept there.
    skills/drupal-11/SKILL.md skills/drupal-11/scripts/scaffold-module.sh
    skills/drupal-11/references/{api,entity,form,theming}-patterns.md
    skills/drupal-11/references/{module-development,plugin-system}.md
    skills/drupal-11/assets/templates/{controller,entity,event-subscriber,form,plugin-block,service}.php.template
    skills/drupal-11/assets/templates/module.{info,routing,services}.yml.template
    skills/drupal-11/assets/templates/module.module.template
)

log_info()    { printf "${BLUE}[INFO]${NC} %s\n" "$1"; }
log_success() { printf "${GREEN}[OK]${NC} %s\n" "$1"; }
log_warning() { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
log_error()   { printf "${RED}[ERROR]${NC} %s\n" "$1" >&2; }

print_help() {
    cat <<EOF
${BOLD}SDD Kit v${VERSION}${NC}

${BOLD}USAGE${NC}
  ./install.sh [--project|--user] [--minimal|--full] [options]

${BOLD}OPTIONS${NC}
  --project          Install into ./.claude (this project only)
  --user             Install into ~/.claude (all projects)
  --minimal          Spec-driven core only: /sdd, product-brief, write-spec, execute-task,
                     simple-task, run-tests, deep-review, open-pr, the six workflows, the
                     eight agents they hand off to, their Laravel/Next.js skills, hooks
  --full             Everything in core (default)
  --with=LIST        Add optional add-ons: ${ADDONS_AVAILABLE// /, }
  --third-party      Also install pinned third-party skills (docs/third-party.md)
  --dry-run          Show added / updated / removed files; change nothing
  --yes, -y          Don't ask for confirmation
  --help, -h         Show this help

${BOLD}AFTER INSTALLING${NC}
  claude             then  /sdd <ticket-id | description>
  /framework-doctor  verifies hooks fire, paths resolve, and settings are valid

Prefer plugin mode for teams: see README (claude --plugin-dir / marketplace).
EOF
}

prompt_yes_no() {
    $ASSUME_YES && return 0
    local answer
    read -r -p "$1 [Y/n]: " answer
    [[ "${answer:-y}" =~ ^[Yy] ]]
}

prompt_choice() {
    local var="$1" question="$2" a="$3" b="$4" choice
    printf "${BOLD}%s${NC}\n  1) %s\n  2) %s\n" "$question" "$a" "$b"
    while true; do
        read -r -p "Enter choice [1/2]: " choice
        case "$choice" in
            1) printf -v "$var" '%s' "${a%% *}"; break ;;
            2) printf -v "$var" '%s' "${b%% *}"; break ;;
        esac
    done
    printf "\n"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --project) INSTALL_MODE=project ;;
            --user) INSTALL_MODE=user ;;
            --minimal) INSTALL_TYPE=minimal ;;
            --full) INSTALL_TYPE=full ;;
            --with=*) ADDONS="${1#*=}"; ADDONS="${ADDONS//,/ }" ;;
            --third-party) THIRD_PARTY=true ;;
            --dry-run) DRY_RUN=true ;;
            --yes|-y) ASSUME_YES=true ;;
            --help|-h) print_help; exit 0 ;;
            *) log_error "Unknown option: $1 (see --help)"; exit 1 ;;
        esac
        shift
    done
    local addon
    for addon in $ADDONS; do
        if [[ " $ADDONS_AVAILABLE " != *" $addon "* ]]; then
            log_error "Unknown add-on '$addon'. Available: $ADDONS_AVAILABLE"
            exit 1
        fi
    done
}

check_requirements() {
    if ! command -v jq >/dev/null 2>&1; then
        log_error "jq is required (installer and hook scripts use it). Install it: brew install jq / apt-get install jq"
        exit 1
    fi
}

# ---------------------------------------------------------------- staging ---
# Builds the exact file tree to install under $STAGE, laid out like .claude/.

stage_skill_dirs() {
    # Skills must be one level deep (skills/<name>/SKILL.md) for discovery.
    local root="$1"; shift
    local filter="${*:-}" dir name skill
    while IFS= read -r skill; do
        dir=$(dirname "$skill"); name=$(basename "$dir")
        if [[ -n "$filter" && " $filter " != *" $name "* ]]; then
            continue
        fi
        mkdir -p "$STAGE/skills"
        cp -R "$dir" "$STAGE/skills/$name"
        # Skill self-tests and their fixtures are development-only; they never ship.
        rm -rf "$STAGE/skills/$name/test"
    done < <(find "$root" -mindepth 2 -name SKILL.md -not -path '*/_templates/*')
}

stage_hook_scripts() {
    mkdir -p "$STAGE/scripts"
    cp "$HOOK_SCRIPTS_DIR/"*.sh "$STAGE/scripts/"
    if [[ -d "$HOOK_SCRIPTS_DIR/review" ]]; then
        mkdir -p "$STAGE/scripts/review"
        cp "$HOOK_SCRIPTS_DIR/review/"*.sh "$HOOK_SCRIPTS_DIR/review/"*.md "$STAGE/scripts/review/" 2>/dev/null || true
    fi
}

stage_core() {
    mkdir -p "$STAGE"
    if [[ "$INSTALL_TYPE" == minimal ]]; then
        # Everything the /sdd main path hands off to: product-brief and write-spec spawn
        # requirements-analyst, execute-task delegates to both stack developers, test-writer
        # and code-quality, and ends with deep-review (adversarial-reviewer, security-auditor)
        # and open-pr. The stack skills are the ones these agents preload.
        mkdir -p "$STAGE/agents" "$STAGE/templates"
        local agent
        for agent in code-explorer laravel-backend-dev nextjs-frontend-dev test-writer code-quality \
            requirements-analyst adversarial-reviewer security-auditor; do
            cp "$CORE_DIR/agents/$agent.md" "$STAGE/agents/"
        done
        stage_skill_dirs "$CORE_DIR/skills" sdd product-brief write-spec execute-task simple-task \
            run-tests deep-review open-pr verification-gates source-verification framework-doctor \
            laravel-12 pest-3 dto-first service-repository api-design api-security \
            nextjs-15 nextjs-testing nextjs-auth
        cp -R "$SHARE_DIR/templates/context" "$SHARE_DIR/templates/specs" "$STAGE/templates/"
    else
        cp -R "$CORE_DIR/agents" "$STAGE/agents"
        stage_skill_dirs "$CORE_DIR/skills"
        cp -R "$CORE_DIR/commands" "$STAGE/commands"
        cp -R "$SHARE_DIR/templates" "$STAGE/templates"
        cp -R "$SHARE_DIR/hooks" "$STAGE/hooks"
        cp -R "$SHARE_DIR/docs" "$STAGE/docs"
    fi
    cp -R "$CORE_DIR/workflows" "$STAGE/workflows"
    cp -R "$SHARE_DIR/settings" "$STAGE/settings"
    cp -R "$SHARE_DIR/mcp-configs" "$STAGE/mcp-configs"
    cp -R "$CORE_DIR/output-styles" "$STAGE/output-styles"
    stage_hook_scripts
}

stage_addons() {
    local addon root
    for addon in $ADDONS; do
        root="$ADDON_ROOT/${ADDON_PREFIX}$addon"
        if [[ -d "$root/agents" ]]; then
            mkdir -p "$STAGE/agents/$addon"
            cp "$root/agents/"*.md "$STAGE/agents/$addon/"
        fi
        if [[ -d "$root/skills" ]]; then
            stage_skill_dirs "$root/skills"
        fi
    done
}

rewrite_paths_for_user_install() {
    [[ "$INSTALL_MODE" == user ]] || return 0
    find "$STAGE" -name '*.md' -exec perl -pi -e 's{(?<![~/\w])\.claude/}{~/.claude/}g' {} +
}

# ------------------------------------------------------------------ apply ---

file_hash() { shasum -a 256 "$1" | awk '{print $1}'; }

# A previously installed path is ours to remove only when its content is still
# what the kit shipped: the manifest hash for files a 2.x install recorded, or a
# known 1.x hash for RETIRED_PATHS. Edited files and third-party skills placed
# at a retired path (upstream Stripe or skill-creator copies) are kept.
is_kit_copy() {
    local rel="$1" current recorded skill_dir
    if [[ "$rel" == skills/*/* ]]; then
        skill_dir="$TARGET_DIR/skills/$(cut -d/ -f2 <<<"$rel")"
        if [[ -f "$skill_dir/.source" ]] || compgen -G "$skill_dir/LICENSE*" >/dev/null; then
            return 1
        fi
    fi
    current=$(file_hash "$TARGET_DIR/$rel")
    if [[ -f "$TARGET_DIR/.framework-manifest" ]]; then
        recorded=$(awk -v p="$rel" '$2 == p { print $1; exit }' "$TARGET_DIR/.framework-manifest")
        if [[ -n "$recorded" ]]; then
            [[ "$current" == "$recorded" ]]
            return
        fi
    fi
    [[ -f "$RETIRED_HASHES" ]] && grep -qxF "$current  $rel" "$RETIRED_HASHES"
}

plan_changes() {
    ADDED=(); UPDATED=(); REMOVED=(); KEPT=()
    local rel
    while IFS= read -r rel; do
        if [[ ! -e "$TARGET_DIR/$rel" ]]; then
            ADDED+=("$rel")
        elif ! cmp -s "$STAGE/$rel" "$TARGET_DIR/$rel"; then
            UPDATED+=("$rel")
        fi
    done < <(cd "$STAGE" && find . -type f | sed 's|^\./||' | sort)

    local previous=("${RETIRED_PATHS[@]}")
    if [[ -f "$TARGET_DIR/.framework-manifest" ]]; then
        while IFS= read -r rel; do previous+=("$rel"); done < <(awk '{print $2}' "$TARGET_DIR/.framework-manifest")
    fi
    for rel in "${previous[@]}"; do
        if [[ -f "$TARGET_DIR/$rel" && ! -f "$STAGE/$rel" \
                && " ${REMOVED[*]-} " != *" $rel "* && " ${KEPT[*]-} " != *" $rel "* ]]; then
            if is_kit_copy "$rel"; then
                REMOVED+=("$rel")
            else
                KEPT+=("$rel")
            fi
        fi
    done
}

print_plan() {
    printf "\n${BOLD}Changes in %s${NC}\n" "$TARGET_DIR"
    printf "  added: %d   updated: %d   removed: %d\n" "${#ADDED[@]}" "${#UPDATED[@]}" "${#REMOVED[@]}"
    local rel
    for rel in "${UPDATED[@]-}"; do [[ -n "$rel" ]] && printf "  ${YELLOW}~${NC} %s\n" "$rel"; done
    for rel in "${REMOVED[@]-}"; do [[ -n "$rel" ]] && printf "  ${RED}-${NC} %s\n" "$rel"; done
    if [[ ${#KEPT[@]} -gt 0 ]]; then
        printf "  kept (modified or not from the kit): %d — review and delete by hand if unused\n" "${#KEPT[@]}"
        for rel in "${KEPT[@]}"; do printf "  ${BLUE}=${NC} %s\n" "$rel"; done
    fi
    if [[ ${#ADDED[@]} -gt 0 && ${#ADDED[@]} -le 40 ]]; then
        for rel in "${ADDED[@]}"; do printf "  ${GREEN}+${NC} %s\n" "$rel"; done
    fi
    printf "\n"
}

apply_changes() {
    local backup="$TARGET_DIR/.framework-backups/$STAMP" rel
    if [[ ${#UPDATED[@]} -gt 0 || ${#REMOVED[@]} -gt 0 ]]; then
        for rel in "${UPDATED[@]-}" "${REMOVED[@]-}"; do
            [[ -n "$rel" ]] || continue
            mkdir -p "$backup/$(dirname "$rel")"
            cp -p "$TARGET_DIR/$rel" "$backup/$rel"
        done
        find "$TARGET_DIR/.framework-backups" -mindepth 1 -maxdepth 1 -type d ! -name "$STAMP" -exec rm -rf {} +
        log_info "Backed up overwritten/removed files to $backup (older framework backups pruned)"
    fi
    for rel in "${REMOVED[@]-}"; do [[ -n "$rel" ]] && rm -f "$TARGET_DIR/$rel"; done
    mkdir -p "$TARGET_DIR"
    (cd "$STAGE" && find . -type f | sed 's|^\./||') | while IFS= read -r rel; do
        mkdir -p "$TARGET_DIR/$(dirname "$rel")"
        cp "$STAGE/$rel" "$TARGET_DIR/$rel"
    done
    chmod +x "$TARGET_DIR/scripts/"*.sh 2>/dev/null || true
    chmod +x "$TARGET_DIR/scripts/review/"*.sh "$TARGET_DIR/hooks/"*.sh 2>/dev/null || true
    find "$TARGET_DIR/skills" -name '*.py' -exec chmod +x {} + 2>/dev/null || true
    (cd "$STAGE" && find . -type f | sed 's|^\./||' | sort | while IFS= read -r rel; do
        printf '%s  %s\n' "$(file_hash "$rel")" "$rel"
    done) > "$TARGET_DIR/.framework-manifest"
    echo "$VERSION" > "$TARGET_DIR/.framework-version"
    log_success "Framework files installed (${#ADDED[@]} added, ${#UPDATED[@]} updated, ${#REMOVED[@]} removed)"

    local legacy
    legacy=$(find "$TARGET_DIR" -maxdepth 1 -name '*.backup.*' 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$legacy" -gt 0 ]]; then
        log_warning "$legacy legacy '*.backup.*' entries from 1.x installs remain in $TARGET_DIR; delete them once you no longer need them."
    fi
}

install_hooks() {
    local result
    if result=$("$SHARE_DIR/scripts/install-hooks.sh" "$SHARE_DIR/settings/settings.template.json" \
            "$TARGET_DIR/settings.json" "$INSTALL_MODE"); then
        log_success "Hooks installed into $TARGET_DIR/settings.json ($result)"
    else
        log_error "Hooks were NOT installed. Fix the issue above, then re-run the installer."
    fi
}

install_statusline() {
    # Shows the active spec and task; only set when the user has no status line.
    local settings="$TARGET_DIR/settings.json" cmd tmp
    if [[ "$INSTALL_MODE" == user ]]; then
        cmd="\"\$HOME\"/.claude/scripts/statusline.sh"
    else
        cmd="\"\$CLAUDE_PROJECT_DIR\"/.claude/scripts/statusline.sh"
    fi
    [[ -f "$settings" ]] && jq empty "$settings" 2>/dev/null || return 0
    if jq -e 'has("statusLine")' "$settings" >/dev/null; then
        log_info "Existing statusLine kept (spec-aware alternative: $cmd)"
        return 0
    fi
    tmp=$(mktemp)
    jq --arg c "$cmd" '.statusLine = {type: "command", command: $c}' "$settings" > "$tmp"
    cat "$tmp" > "$settings"; rm -f "$tmp"
    log_success "Status line set (active spec · task · model)"
}

create_mcp_config() {
    if [[ "$INSTALL_MODE" == user ]]; then
        log_info "User-scope MCP servers are managed by the CLI. Recommended defaults:"
        log_info "  claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp"
        log_info "  claude mcp add --scope user playwright -- npx -y @playwright/mcp@0.0.83 --headless --isolated"
        return
    fi
    local defaults='{"mcpServers":{"context7":{"command":"npx","args":["-y","@upstash/context7-mcp"]},"playwright":{"command":"npx","args":["-y","@playwright/mcp@0.0.83","--headless","--isolated"]}}}' tmp
    if [[ ! -f "$MCP_TARGET" ]]; then
        jq . <<<"$defaults" > "$MCP_TARGET"
        log_success "Created $MCP_TARGET (context7, playwright)"
    elif jq empty "$MCP_TARGET" 2>/dev/null; then
        tmp=$(mktemp)
        jq --argjson d "$defaults" '.mcpServers = ($d.mcpServers + (.mcpServers // {}))' "$MCP_TARGET" > "$tmp"
        cat "$tmp" > "$MCP_TARGET"; rm -f "$tmp"
        log_success "Merged default MCP servers into $MCP_TARGET (existing servers untouched)"
    else
        log_warning "$MCP_TARGET is not valid JSON; left untouched."
    fi
    log_info "Optional servers (PhpStorm, Serena, laravel-boost, GitHub, DDEV): $TARGET_DIR/mcp-configs/development.json"
}

copy_claude_template() {
    [[ "$INSTALL_MODE" == project ]] || return 0
    if [[ -f "$(pwd)/CLAUDE.md" ]]; then
        log_info "CLAUDE.md exists; left untouched (template: $SHARE_DIR/CLAUDE.template.md)"
    else
        cp "$SHARE_DIR/CLAUDE.template.md" "$(pwd)/CLAUDE.md"
        log_success "Created CLAUDE.md from template — fill in the project sections"
    fi
    # CLAUDE.md imports @AGENTS.md (commands, red lines, standards shared with other AI tools).
    if [[ ! -f "$(pwd)/AGENTS.md" ]]; then
        cp "$SHARE_DIR/templates/AGENTS.template.md" "$(pwd)/AGENTS.md"
        log_success "Created AGENTS.md from template — CLAUDE.md imports it"
    fi
    if [[ -d "$SHARE_DIR/templates/rules" && ! -d "$(pwd)/.claude/rules" ]]; then
        mkdir -p "$(pwd)/.claude/rules"
        cp "$SHARE_DIR/templates/rules/"*.md "$(pwd)/.claude/rules/"
        log_success "Created .claude/rules/ (path-scoped conventions) from templates"
    fi
}

print_success() {
    cat <<EOF

${GREEN}${BOLD}Installed v${VERSION}${NC} → $TARGET_DIR (${INSTALL_TYPE}${ADDONS:+, add-ons: $ADDONS})

  1. Start Claude Code:   claude
  2. Verify the install:  /framework-doctor
  3. Start any work:      /sdd <ticket-id | description>

  Re-run this installer any time to update; it shows what changes before writing.
EOF
}

main() {
    parse_args "$@"
    check_requirements
    printf "${BOLD}SDD Kit v%s${NC}\n\n" "$VERSION"

    if [[ -z "$INSTALL_MODE" ]]; then
        prompt_choice INSTALL_MODE "Install where?" \
            "project — ./.claude, this project only" "user — ~/.claude, all projects"
    fi
    INSTALL_TYPE="${INSTALL_TYPE:-full}"

    if [[ "$INSTALL_MODE" == user ]]; then
        TARGET_DIR="$HOME/.claude"
    else
        TARGET_DIR="$(pwd)/.claude"; MCP_TARGET="$(pwd)/.mcp.json"
    fi

    STAGE=$(mktemp -d)
    trap 'rm -rf "$STAGE"' EXIT
    stage_core
    stage_addons
    rewrite_paths_for_user_install
    plan_changes
    print_plan

    if $DRY_RUN; then
        log_info "Dry run: nothing written."
        exit 0
    fi
    prompt_yes_no "Apply these changes?" || { printf "Cancelled.\n"; exit 0; }

    apply_changes
    install_hooks
    install_statusline
    create_mcp_config
    copy_claude_template
    if $THIRD_PARTY; then
        "$SHARE_DIR/scripts/install-third-party.sh" "$SHARE_DIR/settings/third-party.json" "$TARGET_DIR/skills" \
            || log_error "Third-party skill install failed; the framework install is unaffected."
    fi
    print_success
}

main "$@"
