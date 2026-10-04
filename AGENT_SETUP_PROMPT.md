# AI Agent Setup Prompt - Suggestion+ MCP Server

Copy and paste this entire prompt into any AI coding agent (Claude Code, Cursor, Cline, RooCode, Continue.dev, OpenCode, Windsurf, Gemini CLI, etc.). It will automatically set up the Suggestion+ MCP server for you.

```text
You are an autonomous setup assistant for the Suggestion+ MCP Server (https://github.com/viyali-technologies/mcp-server-suggestion-plus).

Your task is to configure this MCP server for the current AI agent using ONLY the npm package via npx. Do not clone, build, or use local source.

## Goal
After setup is complete, the Suggestion+ MCP server must be:
1. Configured in the current AI agent's MCP settings using `npx -y mcp-server-suggestion-plus`
2. Ready to use with Google Play review reading (credentials guidance included)
3. Verified and working

## Step 1: Detect environment
Detect and report:
- OS (macOS/Linux/Windows)
- Node.js version (`node --version`). If < 18, note it but proceed (npx will still work if Node meets requirements).
- Current AI agent type (Claude Code, Cursor, Cline, RooCode, Continue, OpenCode, Windsurf, Gemini CLI, Codex, Aider, Void, etc.)
- Whether running inside a workspace (project directory). Prefer project-level MCP config if available.

## Step 2: Detect MCP config locations
Auto-detect the appropriate MCP config file to update for the detected agent:

- Claude Code: `~/.claude.json` or `~/.config/claude/mcp.json` (project `.mcp.json` also acceptable)
- Claude Desktop: macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows `%APPDATA%\Claude\claude_desktop_config.json`, Linux `~/.config/claude/claude_desktop_config.json`
- Cursor: `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project). Prefer project `.cursor/mcp.json` if in a workspace.
- Cline: `~/.config/cline/mcp_settings.json` or VSCode global storage
- RooCode: `~/.config/roo-code/mcp_settings.json`
- Continue.dev: `.continue/mcpServers/suggestion-plus.json`
- OpenCode: `~/.config/opencode/opencode.jsonc` or `opencode.json` (global) or project `.opencode/mcp.json`
- Windsurf: `~/.codeium/windsurf/mcp_config.json`
- Gemini CLI: `~/.gemini/settings.json` (mcpServers)
- Codex: `~/.codex/config.toml` (if MCP supported; otherwise use common config)

If ambiguous, prefer project-level config to keep it scoped to the workspace.

## Step 3: Generate MCP configuration
Write the exact configuration using only npx:

```json
{
  "mcpServers": {
    "suggestion-plus": {
      "command": "npx",
      "args": ["-y", "mcp-server-suggestion-plus"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/google-play-credentials.json"
      }
    }
  }
}
```

Notes:
- If Google ADC is already configured (`gcloud auth application-default login`), you may omit `GOOGLE_APPLICATION_CREDENTIALS`.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is also supported as fallback (JSON string or file path).
- Never include actual credential values in config. Keep credentials private.
- For JSONC files (e.g., opencode.jsonc), preserve formatting and comments when editing.

## Step 4: Write config safely (non-destructive)
- Create parent directories if missing.
- If the target config file exists, merge non-destructively: only add or update `mcpServers.suggestion-plus`. Do not modify other entries.
- If it doesn't exist, create it with the MCP config structure.
- Use absolute paths in global configs; project-level configs may use absolute paths or be documented clearly.
- Do not create or modify any other files (no README edits, no GOOGLE_PLAY_SETUP.md, no repo files). Only touch MCP config files.

## Step 5: Verify with MCP Inspector
Run the MCP Inspector using ONLY npx to confirm it works:

```bash
npx -y @modelcontextprotocol/inspector --cli npx -y mcp-server-suggestion-plus --method tools/list
```

If this succeeds, also call `list_supported_platforms`:

```bash
npx -y @modelcontextprotocol/inspector --cli npx -y mcp-server-suggestion-plus --method tools/call --tool list_supported_platforms --tool-args '{}'
```

Both must succeed. Do not run build, install, git clone, or any local commands.

## Step 6: Provide guidance to the user
Show the user:
- Detected agent and the exact config file path that was written/updated
- The final MCP config (showing what was written)
- Credential guidance (brief): ADC optional; set `GOOGLE_APPLICATION_CREDENTIALS` to absolute path of service account JSON if not using ADC; use Android package name as `app_id` in Google Play calls (google-play). Note: Google Play replies and App Store not implemented yet.
- How to restart their AI agent to load the MCP server
- Confirmation that setup used only `npx -y mcp-server-suggestion-plus`

## Final answer
Return a concise summary with all of the above. Use only `npx -y mcp-server-suggestion-plus` throughout. Do not mention cloning, building, dist, or local source.

Begin now.
```