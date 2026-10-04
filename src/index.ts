import "dotenv/config";

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AppStoreProvider } from "./providers/app-store.js";
import { GooglePlayProvider } from "./providers/google-play.js";
import type { Review, ReviewProvider } from "./types/provider.js";

const configSchema = z.object({
  TRANSPORT: z.enum(["stdio", "sse"]).default("stdio"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
});

const config = configSchema.parse(process.env);
const providers: ReviewProvider[] = [new GooglePlayProvider(), new AppStoreProvider()];

/** Setup metadata is safe to expose through MCP; never include secret values. */
const providerSetup: Record<
  string,
  {
    implementationStatus: "stub" | "implemented";
    requiredConfiguration: string[];
    implementationNotes: string[];
  }
> = {
  "google-play": {
    implementationStatus: "implemented",
    requiredConfiguration: [],
    implementationNotes: [
      "Supply one Android app package name as app_id, or multiple package names as app_ids when calling list_reviews with platform set to google-play.",
      "Google Play review GET requests are limited to 200 per hour per app; the adapter spaces requests for each app at least 20 seconds apart.",
      "Authentication uses Google Application Default Credentials, including GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_PLAY_SERVICE_ACCOUNT_JSON as a fallback.",
      "Google Play review replies are not enabled by this adapter yet.",
      "Grant the service account access to the apps in Google Play Console.",
    ],
  },
  "app-store": {
    implementationStatus: "stub",
    requiredConfiguration: [
      "APP_STORE_ISSUER_ID",
      "APP_STORE_KEY_ID",
      "APP_STORE_PRIVATE_KEY",
    ],
    implementationNotes: [
      "Enumerate all accessible apps with App Store Connect GET /v1/apps, then aggregate each app's reviews.",
      "Implement customerReviews retrieval and customerReviewResponses replies; app_id can remain an optional filter.",
      "Create an App Store Connect API key with access to the app.",
    ],
  },
};

function getProvider(platform: string): ReviewProvider {
  const provider = providers.find(({ id }) => id === platform);
  if (!provider) {
    throw new Error(
      `Unsupported platform "${platform}". Supported platforms: ${providers.map(({ id }) => id).join(", ")}.`,
    );
  }
  return provider;
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function createMcpServer(): McpServer {
  const server = new McpServer({ name: "mcp-server-suggestion-plus", version: "0.1.0" });

  server.registerTool(
    "list_reviews",
    {
      description:
        "List customer reviews, optionally filtered by platform, one app or multiple apps, and star rating. For multiple Google Play apps, set platform to google-play and pass Android package names in app_ids; one MCP call fans out to one or more Google API requests per app.",
      inputSchema: {
        platform: z.string().optional().describe("Provider ID, such as google-play or app-store."),
        app_id: z.string().optional().describe("One platform-specific application identifier. For Google Play, use the Android package name."),
        app_ids: z
          .array(z.string().trim().min(1))
          .min(1)
          .max(50)
          .optional()
          .describe("Up to 50 platform-specific application identifiers. Currently supported for Google Play; requires platform=google-play. Do not combine with app_id."),
        rating: z.number().int().min(1).max(5).optional(),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum reviews to return per app (1–100; default 20)."),
      },
    },
    async ({ platform, app_id, app_ids, rating, limit }) => {
      try {
        if (app_id !== undefined && app_ids !== undefined) {
          throw new Error("Use either app_id or app_ids, not both.");
        }
        if (app_ids !== undefined && platform !== "google-play") {
          throw new Error("app_ids is currently supported only when platform is set to google-play.");
        }

        const targets = platform ? [getProvider(platform)] : providers;
        const results = await Promise.all(
          targets.map(async (provider) => {
            const options = {
              ...(rating === undefined ? {} : { rating }),
              limit,
            };
            if (app_ids !== undefined) {
              const uniqueAppIds = [...new Set(app_ids)];
              const appResults = await Promise.all(
                uniqueAppIds.map((appId) => provider.listReviews({ ...options, appId })),
              );
              return appResults.flat();
            }
            return provider.listReviews({
              ...options,
              ...(app_id === undefined ? {} : { appId: app_id }),
            });
          }),
        );
        const reviews: Review[] = results.flat();
        return {
          content: [{ type: "text", text: JSON.stringify(reviews, null, 2) }],
          structuredContent: { reviews },
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_review_details",
    {
      description: "Get full metadata for one review from a specific platform.",
      inputSchema: {
        platform: z.string().describe("Provider ID, such as google-play or app-store."),
        review_id: z.string().min(1),
        app_id: z
          .string()
          .optional()
          .describe("Required for Google Play; use the Android app package name."),
      },
    },
    async ({ platform, review_id, app_id }) => {
      try {
        const review = await getProvider(platform).getReview(review_id, app_id);
        return {
          content: [{ type: "text", text: JSON.stringify(review, null, 2) }],
          structuredContent: { review },
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "reply_to_review",
    {
      description: "Send a developer reply to a customer review when the platform supports writes.",
      inputSchema: {
        platform: z.string().describe("Provider ID, such as google-play or app-store."),
        review_id: z.string().min(1),
        reply_text: z.string().trim().min(1).max(3_500),
      },
    },
    async ({ platform, review_id, reply_text }) => {
      try {
        const provider = getProvider(platform);
        if (!provider.supportsWrite || !provider.replyToReview) {
          throw new Error(`${provider.name} does not currently support replying to reviews.`);
        }
        const result = await provider.replyToReview(review_id, reply_text);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: { result },
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "list_supported_platforms",
    {
      description:
        "List provider readiness, read/write capabilities, missing configuration, and setup steps. Secret values are never returned.",
      inputSchema: {},
    },
    async () => {
      const platforms = await Promise.all(providers.map(async (provider) => {
        const setup = providerSetup[provider.id];
        const requiredConfiguration = setup?.requiredConfiguration ?? [];
        const missingConfiguration = requiredConfiguration.filter(
          (key) => !process.env[key]?.trim(),
        );
        if (
          provider.id === "google-play" &&
          !(await (provider as GooglePlayProvider).hasCredentials())
        ) {
          missingConfiguration.push(
            "Application Default Credentials, GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
          );
        }
        const implementationStatus = setup?.implementationStatus ?? "stub";
        const configured = missingConfiguration.length === 0;

        return {
          id: provider.id,
          name: provider.name,
          enabled: implementationStatus === "implemented" && configured,
          configured,
          implementationStatus,
          capabilities: {
            read: implementationStatus === "implemented",
            write: provider.supportsWrite,
          },
          status:
            implementationStatus === "stub"
              ? "stub"
              : configured
                ? "ready"
                : "needs_configuration",
          requiredConfiguration,
          missingConfiguration,
          nextSteps: setup?.implementationNotes ?? [],
        };
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(platforms, null, 2) }],
        structuredContent: { platforms },
      };
    },
  );

  return server;
}

async function startStdio(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
  console.error("Suggestion+ MCP server running over stdio.");
}

async function startSse(): Promise<void> {
  const transports = new Map<string, SSEServerTransport>();
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/sse") {
      const transport = new SSEServerTransport("/messages", response);
      transports.set(transport.sessionId, transport);
      response.on("close", () => transports.delete(transport.sessionId));
      await createMcpServer().connect(transport);
      return;
    }

    if (request.method === "POST" && url.pathname === "/messages") {
      const sessionId = url.searchParams.get("sessionId");
      const transport = sessionId ? transports.get(sessionId) : undefined;
      if (!transport) {
        response.writeHead(400).end("Unknown or missing MCP sessionId");
        return;
      }
      await transport.handlePostMessage(request, response);
      return;
    }

    response.writeHead(404).end("Not found");
  });

  server.listen(config.PORT, config.HOST, () => {
    console.error(`Suggestion+ MCP SSE server listening at http://${config.HOST}:${config.PORT}/sse`);
  });
}

async function main(): Promise<void> {
  if (config.TRANSPORT === "sse") {
    await startSse();
  } else {
    await startStdio();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to start Suggestion+ MCP server:", error);
  process.exitCode = 1;
});
