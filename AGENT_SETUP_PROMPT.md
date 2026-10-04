# AI Agent Setup Prompt - Suggestion+ MCP Server

Copy and paste this entire prompt into any AI coding agent (Claude Code, Cursor, Cline, RooCode, Continue.dev, OpenCode, Windsurf, Gemini CLI, etc.). It will automatically set up the Suggestion+ MCP server for you.

```text
You are an autonomous setup assistant for the Suggestion+ MCP Server (https://github.com/viyali-technologies/mcp-server-suggestion-plus).

Your task is to fully set up this repository so it can be used as an MCP server with any AI coding agent. Execute all steps automatically without asking unnecessary questions, but ask for clarification ONLY if a required decision cannot be inferred.

## Goal
After setup is complete, the Suggestion+ MCP server must be:
1. Installed and built successfully (Node.js >= 18, TypeScript)
2. Auto-configured for the current AI agent's MCP settings
3. Ready to use with Google Play review reading (credentials guidance included)
4. Fully documented and verifiable

## Repository
- Repo: https://github.com/viyali-technologies/mcp-server-suggestion-plus
- Package: mcp-server-suggestion-plus (MCP server for reading/replying to customer reviews)
- Transport: stdio (default), SSE optional (TRANSPORT=sse)
- Main entry: dist/index.js (built), bin/cli.js (CLI wrapper)

## Step 1: Detect environment
Detect and report:
- OS (macOS/Linux/Windows)
- Node.js version (`node --version`). If < 18, install or instruct, but prefer using system Node if present.
- Package manager preference: detect if `pnpm`, `yarn`, or `bun` exist; otherwise use `npm`. Check lockfiles (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `package-lock.json`) to infer.
- Current working directory and whether this repo is already cloned here.
- Whether git is available.

## Step 2: Clone or verify repo
If not already in the repo root (check for package.json with name "mcp-server-suggestion-plus"), clone fresh:
```bash
git clone https://github.com/viyali-technologies/mcp-server-suggestion-plus.git
cd mcp-server-suggestion-plus
```
If already inside the correct repo, do `git pull --rebase` (safe, non-destructive) to get latest changes.

## Step 3: Install dependencies
Use detected package manager:
- pnpm: `pnpm install`
- yarn: `yarn install`
- bun: `bun install`
- npm: `npm ci --no-audit --no-fund` (preferred if lockfile exists) else `npm install --no-audit --no-fund`

## Step 4: Build
Build TypeScript to dist:
- pnpm/yarn/bun: run build script from package.json
- npm: `npm run build`

Verify `dist/index.js` and `bin/cli.js` exist after build.

## Step 5: Detect host AI agent & MCP config paths
Auto-detect which agent is running this setup prompt (Claude Code, Cursor, Cline, RooCode, Continue, OpenCode, Windsurf, Gemini CLI, Codex, Aider, Void, etc.). Also detect OS-specific MCP config locations.

MCP config locations to check/create:
- Claude Code: `~/.claude.json` (or `~/.config/claude/mcp.json`, also project `.mcp.json` if preferred)
- Claude Desktop: macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows `%APPDATA%\Claude\claude_desktop_config.json`, Linux `~/.config/claude/claude_desktop_config.json`
- Cursor: `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project). Prefer project `.cursor/mcp.json` if in workspace.
- Cline: `~/.config/cline/mcp_settings.json` (Linux), `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` style varies; check common paths. Also VSCode global storage.
- RooCode: `~/.config/roo-code/mcp_settings.json` or VSCode storage variant
- Continue.dev: `.continue/mcpServers/` (YAML/JSON) or config.yaml; prefer `.continue/mcpServers/suggestion-plus.json`
- OpenCode: `~/.config/opencode/opencode.jsonc` or `opencode.json` (global). Also project `.opencode/mcp.json`
- Windsurf: `~/.codeium/windsurf/mcp_config.json`
- Gemini CLI: `~/.gemini/settings.json` (mcpServers)
- Codex: `~/.codex/config.toml` or MCP config per docs (if present)

Choose the best target: if running inside a known agent, update that agent's config. If ambiguous, prefer project-level config (`.cursor/mcp.json`, `.mcp.json`, `.opencode/mcp.json`) to keep repo-scoped.

## Step 6: Generate MCP configuration
Create config for local source build (recommended for this repo). Use absolute paths. Compute absolute path to `dist/index.js`.

Two safe variants:
1. Local source (stdio, built): uses `node /absolute/path/to/dist/index.js`
2. Published npm (stdio): uses `npx -y mcp-server-suggestion-plus` (requires credentials via env)

Prefer variant 1 (local) for immediate verification. Include Google Play credentials guidance.

Config JSON (stdio):
```json
{
  "mcpServers": {
    "suggestion-plus": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-server-suggestion-plus/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/google-play-credentials.json"
      }
    }
  }
}
```
Notes:
- If ADC is configured (`gcloud auth application-default login`), you may omit `GOOGLE_APPLICATION_CREDENTIALS`.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is also supported as fallback (JSON string or file path).
- Keep credentials private; never commit MCP configs with real paths/creds.
- For SSE (optional): set `"env": { ... "TRANSPORT": "sse", "PORT": "3001", "HOST": "0.0.0.0" }` and stream at `/sse`.

Also write a project `.mcp.json` (agent-agnostic) as fallback:
```json
{
  "mcpServers": {
    "suggestion-plus": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {}
    }
  }
}
```

## Step 7: Write configs safely
- Create parent directories if missing.
- Merge non-destructively: if mcpServers.suggestion-plus exists, update args/command but preserve unrelated entries and user env comments if JSONC.
- For JSONC files (opencode.jsonc), preserve formatting/comments.
- Write both project-level and detected agent-level configs where sensible (project takes precedence for repo work).

## Step 8: Credential guidance (non-blocking)
Create `GOOGLE_PLAY_SETUP.md` with concise steps:
1. Enable Google Play Developer API in GCP, create service account
2. Grant service account in Play Console (Users & permissions) with review access
3. ADC: `gcloud auth application-default login` (or impersonation). Optional key file + `GOOGLE_APPLICATION_CREDENTIALS`
4. Use Android package name as `app_id` in `list_reviews`/`get_review_details` (google-play)
5. Note: Google Play replies + App Store not implemented yet

Do not require credentials to complete setup.

## Step 9: Verify installation
Run verification checks in order:
1. `node dist/index.js --help 2>/dev/null` (optional) — just ensure it runs
2. Use MCP Inspector to list tools: `npx -y @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list`
3. Call `list_supported_platforms` via inspector: `npx -y @modelcontextprotocol/inspector --cli node dist/index.js --method tools/call --tool list_supported_platforms --tool-args '{}'`
4. `npm run build` succeeds with no errors (TypeScript)
5. If vitest exists, optionally run `npm test` (non-blocking; warn if no tests)

All must pass build + inspector tools/list. Report any warnings.

## Step 10: Provide usage instructions
Output a concise summary with:
- Detected agent + config file(s) written (with absolute paths)
- How to restart/start the agent to pick up MCP
- Quick test command (inspector or agent usage)
- Example agent instruction to paste (reuse repo's instruction block)
- Package manager used + Node version
- Next steps for Google Play (ADC or credentials)

Include the ready-to-use instruction for agents:
```text
Use Suggestion+ when the user asks you to inspect or respond to customer reviews.
Before working with a platform, call list_supported_platforms. Google Play review reading is available when ADC or explicit credentials are configured; include the Android app package name as app_id in Google Play review calls. Apple App Store access and Google Play replies are not implemented yet. Do not claim that a review was fetched or a reply was sent unless the connected tool call succeeds.
When a provider is implemented and enabled, use list_reviews to find reviews, get_review_details to inspect one review, and reply_to_review only when the user asks you to send a reply and the provider supports writes. Use list_supported_platforms to explain provider readiness and required configuration. Provider IDs are google-play and app-store.
```

## Step 11: Final report
Return a clean, structured report:
- ✅ Environment
- ✅ Dependencies installed (with pm)
- ✅ Build successful
- ✅ MCP configured (files + paths)
- ✅ Verification (tools/list + platforms)
- ⚠️ Warnings (if any)
- 🎯 Ready to use (restart agent instructions)

Do everything autonomously. Be resilient: handle missing dirs, cross-OS paths, JSON/JSONC safely. Prefer absolute paths in configs. Do not commit secrets or generated credential paths.

Begin setup now.
```