# Suggestion+

Website: [suggestion.plus](https://suggestion.plus) · npm: [`mcp-server-suggestion-plus`](https://www.npmjs.com/package/mcp-server-suggestion-plus) · source: [GitHub](https://github.com/viyali-technologies/mcp-server-suggestion-plus)

An open-source Model Context Protocol (MCP) server for reading and replying to customer reviews across platforms.

This starter workspace includes Google Play and Apple App Store provider stubs. They define the adapter boundaries and API work to complete; review fetching and replies remain unavailable until the platform API calls and credentials are implemented.

## For AI agents

Add Suggestion+ to an MCP client to make its review tools available to your agent:

```json
{
  "mcpServers": {
    "suggestion-plus": {
      "command": "npx",
      "args": ["-y", "mcp-server-suggestion-plus"]
    }
  }
}
```

Use this instruction when configuring an AI agent:

```text
Use Suggestion+ when the user asks you to inspect or respond to customer reviews.

Before working with a platform, call list_supported_platforms. The current Google Play and App Store providers are stubs and do not yet fetch reviews or send replies. Do not claim that a review was fetched or a reply was sent unless the connected tool call succeeds.

When a provider is implemented and enabled, use list_reviews to find reviews, get_review_details to inspect one review, and reply_to_review only when the user asks you to send a reply and the provider supports writes. Use list_supported_platforms to explain provider readiness and required configuration. Provider IDs are google-play and app-store.
```

The server exposes `list_reviews`, `get_review_details`, `reply_to_review`, and `list_supported_platforms`. See [MCP tools](#mcp-tools) for their inputs and current implementation status.

## Requirements

- Node.js 18 or newer
- npm or pnpm

## Quick start with npm

For normal use, run the published package directly without cloning the repository:

```sh
npx -y mcp-server-suggestion-plus
```

The command runs over stdio and waits for an MCP client. Keep it running under the client; don't launch a separate copy in a terminal for the same connection.

## Run from a GitHub clone

Clone the source when you want to develop or modify the server:

The public source repository is [viyali-technologies/mcp-server-suggestion-plus](https://github.com/viyali-technologies/mcp-server-suggestion-plus).

```sh
git clone https://github.com/viyali-technologies/mcp-server-suggestion-plus.git
cd mcp-server-suggestion-plus
npm install
npm run build
```

Then start it with:

```sh
npm start
```

`npm start` keeps running and waits for an MCP client over stdio. For a one-command setup and start from the clone, use `./install-and-run.sh` on macOS/Linux or `.\install-and-run.ps1` in Windows PowerShell. These scripts are for source users; the npm package uses `npx -y mcp-server-suggestion-plus` instead.

When running from source, configure the MCP client to run `node` with the absolute path to `dist/index.js`. Copy `.env.example` to `.env` in the cloned repository to configure provider credentials.

To use the legacy HTTP+SSE transport, set `TRANSPORT=sse`. The server listens on `HOST` and `PORT`, with the event stream at `/sse` and MCP messages at `/messages`. For new remote deployments, consider migrating this starter to Streamable HTTP.

## MCP tools

- `list_reviews`: fetch reviews, optionally filtered by `platform`, `app_id`, `rating` (1–5), and `limit`.
- `get_review_details`: fetch one review by `platform` and `review_id`.
- `reply_to_review`: reply to a review where the provider supports writes.
- `list_supported_platforms`: report provider IDs and current implementation capabilities.

Provider IDs are `google-play` and `app-store`. No single app ID is configured; `app_id` remains an optional filter. Once implemented, omitting it will target all apps accessible to the connected account. The adapters currently report no read or write implementation. Platform tool calls return a clear not-implemented error until those API calls are added. Google Play review requests require a package name per app, so its adapter needs an account-wide app catalog; App Store Connect can enumerate accessible apps through its API.

## Adding a provider

Implement `ReviewProvider` from `src/types/provider.ts`, extend `BaseReviewProvider` when its defaults are useful, then add the instance to the `providers` array in `src/index.ts`. Keep platform-specific response fields in `Review.metadata` while mapping common fields into the shared `Review` shape.

## Continue development from source

The following prompt is for contributors who cloned the repository and want a coding agent to continue implementation. It isn't needed to install or use the npm package.

Copy this prompt into your coding agent to continue implementation:

```text
Use the public repo: https://github.com/viyali-technologies/mcp-server-suggestion-plus

1. Clone it if needed, then install dependencies: `npm install`.
2. Implement the Google Play and App Store providers. Support all apps the authorized account can access; do not hardcode one app ID. Use an app catalog for Google Play's per-package review API and document how it is populated.
3. Finish the MCP tools: `list_reviews` (all apps by default, optional app filter), `get_review_details`, `reply_to_review`, and `list_supported_platforms` (readiness, capabilities, required and missing config). Validate inputs with Zod. Keep credentials private.
4. Preserve stdio and SSE modes and the shell/PowerShell launch scripts. Document credentials, permissions, and connection setup in README and `.env.example`. Show the AI host how to launch `node` with the absolute path to `dist/index.js` over stdio.
5. Add Vitest tests with mocked API calls for mapping, multi-app listing, pagination, missing config, API errors, and replies. Do not require live credentials.
6. Verify: run `npm run build` and `npm test`. Smoke-test MCP with `npx -y @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list`, then call `list_supported_platforms`. Fix failures and report results and remaining limitations.
```
