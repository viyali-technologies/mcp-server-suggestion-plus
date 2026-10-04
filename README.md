# Suggestion+
Website: [suggestion.plus](https://suggestion.plus) · npm: [`mcp-server-suggestion-plus`](https://www.npmjs.com/package/mcp-server-suggestion-plus) · source: [GitHub](https://github.com/viyali-technologies/mcp-server-suggestion-plus)

An open-source Model Context Protocol (MCP) server for reading and replying to customer reviews across platforms.

Google Play review reading is implemented. Apple App Store access and Google Play replies are not implemented yet.

## One-Click Setup with AI Agent

Copy and paste the prompt below into any AI coding agent (Claude Code, Cursor, Cline, RooCode, Continue, OpenCode, Windsurf, Gemini CLI, etc.). It will automatically clone, install, build, detect your agent, and configure the MCP server for you.

[**Download AGENT_SETUP_PROMPT.md**](AGENT_SETUP_PROMPT.md)

Or just copy the content of that file directly into your agent. No manual commands needed.

## For AI agents

### Apidog with the published npm package

In Apidog, create an MCP endpoint and paste this configuration. Set credentials in the MCP server's `env` object; replace the credential path with the absolute path to the Google credentials file on the machine running Apidog. This configuration is for use after the package is published to npm.

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

The `env` values are passed to the server process when Apidog launches it. Keep this MCP configuration private when it contains credentials. Do not pass credentials as tool arguments or include real credential values in the README.

### Apidog with a local clone

Before the npm package is published, build the clone with `npm run build`, then use this configuration to launch the local executable:

```json
{
  "mcpServers": {
    "suggestion-plus-local": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-server-suggestion-plus/bin/cli.js"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/google-play-credentials.json"
      }
    }
  }
}
```

If local ADC is already configured, omit the `GOOGLE_APPLICATION_CREDENTIALS` entry. Keep the MCP configuration local and private when it contains credentials.

Use this instruction when configuring an AI agent:

```text
Use Suggestion+ when the user asks you to inspect or respond to customer reviews.

Before working with a platform, call list_supported_platforms. Google Play review reading is available when ADC or explicit credentials are configured. list_reviews requires platform and app_ids. For Google Play, set platform to google-play and pass package names as an array in app_ids. Use a one-item array for one app; the server makes separate Google API requests and combines the results. Apple App Store access and Google Play replies are not implemented yet. Do not claim that a review was fetched or a reply was sent unless the connected tool call succeeds.

When a provider is implemented and enabled, use list_reviews to find reviews, get_review_details to inspect one review, and reply_to_review only when the user asks you to send a reply and the provider supports writes. Use list_supported_platforms to explain provider readiness and required configuration. Provider IDs are google-play and app-store.
```

The server exposes `list_reviews`, `get_review_details`, `reply_to_review`, and `list_supported_platforms`. See [MCP tools](#mcp-tools) for their inputs and current implementation status.

## Requirements

- Node.js 18 or newer
- npm or pnpm

## Quick start with npm

For normal use, run the published package directly without cloning the repository:

```sh
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-play-credentials.json \
npx -y mcp-server-suggestion-plus
```

The credential path is optional when ADC is already configured for the current user or runtime. The command runs over stdio and waits for an MCP client. Keep it running under the client; don't launch a separate copy in a terminal for the same connection.

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

When running from source, configure the MCP client to run `node` with the absolute path to `dist/index.js`, and provide provider configuration through that MCP server entry's `env` object.

To use the legacy HTTP+SSE transport, set `TRANSPORT=sse`. The server listens on `HOST` and `PORT`, with the event stream at `/sse` and MCP messages at `/messages`. For new remote deployments, consider migrating this starter to Streamable HTTP.

## MCP tools

- `list_reviews`: fetch reviews; `platform` and `app_ids` are required. `app_ids` is an array of up to 50 Google Play package names; use one item for a single app. `rating` (1–5) is optional; omit it or pass `null` to include all ratings. `limit` (per app, default 10) is optional; omit it or pass `null` to use the default.
- `get_review_details`: fetch one review by `platform` and `review_id`.
- `reply_to_review`: reply to a review where the provider supports writes.
- `list_supported_platforms`: report provider IDs and current implementation capabilities.

Provider IDs are `google-play` and `app-store`. To enable Google Play review reading, configure Google ADC (optionally using the standard `GOOGLE_APPLICATION_CREDENTIALS` file path) or set the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` fallback. `list_reviews` requires `platform: "google-play"` and `app_ids` set to an array of Android package names, such as `["com.example.app"]` for one app or `["com.example.app", "com.example.other"]` for multiple apps. One MCP call makes separate Google API requests for the specified apps and combines their reviews. `rating` is optional and defaults to all ratings; `limit` is optional and defaults to 10 reviews per app. Passing `null` for either field has the same effect as omitting it. Google Play replies and the App Store adapter remain unavailable.

### Configure Google Play review reading

1. Enable the Google Play Developer API in a Google Cloud project and create a service account.
2. Invite that service account in Play Console under **Users and permissions**, granting access to the apps and review permissions it needs. Google documents this setup in its [API getting started guide](https://developers.google.com/android-publisher/getting_started).
3. For local development, use ADC. You can sign in as a Play Console user with `gcloud auth application-default login`, or impersonate the app's service account with `gcloud auth application-default login --impersonate-service-account=SERVICE_ACCOUNT_EMAIL --scopes=https://www.googleapis.com/auth/androidpublisher`. Service account impersonation requires the user to have permission to impersonate that account.
4. Supply one or more Android package names as an array in `app_ids` when calling `list_reviews` with `platform` set to `google-play`. Use a one-item array for one app. Supply `app_id` to `get_review_details` to identify the app containing the requested review.
5. In Apidog, set `GOOGLE_APPLICATION_CREDENTIALS` to the credential file's absolute path in the MCP server's STDIO `env` settings. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` remains an optional fallback accepting JSON contents or a file path. Keep credential values in private, local MCP configuration; don't commit them or include them in tool arguments.

Google's `reviews.list` endpoint takes one package name per request, so multi-app calls fan out to separate requests and combine the results. Google enforces a 200 GET requests per hour quota separately for each app. The adapter spaces review GET requests for a given app at least 20 seconds apart, including pagination and single-review reads; requests for different apps can run independently. This process-local pacing targets at most 180 GET requests per hour per app. In production on Google Cloud, use an attached service account and ADC instead of a long-lived key file. See Google's [ADC guidance](https://docs.cloud.google.com/docs/authentication/application-default-credentials), [`reviews.list` reference](https://developers.google.com/android-publisher/api-ref/rest/v3/reviews/list), and [Reply to Reviews quota documentation](https://developers.google.com/android-publisher/reply-to-reviews#quotas).

## Adding a provider

Implement `ReviewProvider` from `src/types/provider.ts`, extend `BaseReviewProvider` when its defaults are useful, then add the instance to the `providers` array in `src/index.ts`. Keep platform-specific response fields in `Review.metadata` while mapping common fields into the shared `Review` shape.

## Continue development from source

The following prompt is for contributors who cloned the repository and want a coding agent to continue implementation. It isn't needed to install or use the npm package.

Copy this prompt into your coding agent to continue implementation:

```text
Use the public repo: https://github.com/viyali-technologies/mcp-server-suggestion-plus

1. Clone it if needed, then install dependencies: `npm install`.
2. Implement the App Store provider. For Google Play, add review replies if desired; the current reader uses ADC by default, accepts `GOOGLE_APPLICATION_CREDENTIALS` as the standard credential-file path, supports `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` as a fallback, and accepts `app_ids` as an array of one or more package names in `list_reviews`.
3. Maintain the MCP tools: `list_reviews` supports an array of one to 50 Google Play package names in `app_ids` (use a one-item array for one app; one MCP call fans out to one Google request per app, with pagination as needed), `get_review_details`, `reply_to_review`, and `list_supported_platforms` (readiness, capabilities, required and missing config). Preserve the per-app Google review GET pacing of at least 20 seconds, based on Google's 200 GET requests per hour per-app quota. Validate inputs with Zod. Keep credentials private.
4. Preserve stdio and SSE modes and the shell/PowerShell launch scripts. Document credentials, permissions, and connection setup in README and the MCP client configuration examples, with credentials supplied through the MCP server entry's `env` object. Show the AI host how to launch `node` with the absolute path to `dist/index.js` over stdio.
5. Add Vitest tests with mocked API calls for mapping, multi-app listing, pagination, missing config, API errors, and replies. Do not require live credentials.
6. Verify: run `npm run build` and `npm test`. Smoke-test MCP with `npx -y @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list`, then call `list_supported_platforms`. Fix failures and report results and remaining limitations.
```
