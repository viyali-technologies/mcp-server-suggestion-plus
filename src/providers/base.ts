import type { ListReviewsOptions, ReplyResult, Review, ReviewProvider } from "../types/provider.js";

export abstract class BaseReviewProvider implements ReviewProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  /** Providers remain read-only until they explicitly implement reply support. */
  readonly supportsWrite = false;
  abstract listReviews(params: ListReviewsOptions): Promise<Review[]>;
  abstract getReview(reviewId: string, appId?: string): Promise<Review>;

  async replyToReview(_reviewId: string, _replyText: string, _appId?: string): Promise<ReplyResult> {
    throw this.notImplemented("replyToReview");
  }

  protected notImplemented(operation: string): Error {
    return new Error(
      `${this.name} ${operation} is not implemented yet. Configure platform access and complete this provider adapter.`,
    );
  }
}

export function apiError(platform: string, response: Response): Error {
  return new Error(`${platform} API returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`);
}

export async function request(url: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(20_000) });
  } catch (error) {
    throw new Error(`API request failed: ${error instanceof Error ? error.message : "network error"}`);
  }
  if (response.status === 429) {
    const retry = response.headers.get("retry-after");
    throw new Error(`API rate limit exceeded${retry ? `; retry after ${retry} seconds` : ""}.`);
  }
  return response;
}

export function paginateUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "api.appstoreconnect.apple.com") throw new Error("Rejected unsafe pagination URL.");
  return parsed.href;
}
