import { GoogleAuth, type JWTInput } from "google-auth-library";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BaseReviewProvider, apiError, request } from "./base.js";
import type { ListReviewsOptions, ReplyResult, Review } from "../types/provider.js";

const API_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const MAX_PAGE_SIZE = 100;

interface GoogleTimestamp {
  seconds?: string | number;
  nanos?: number;
}

interface GoogleUserComment {
  text?: string;
  starRating?: number;
  reviewerLanguage?: string;
  lastModified?: GoogleTimestamp;
  device?: Record<string, unknown>;
}

interface GoogleDeveloperComment {
  text?: string;
  lastModified?: GoogleTimestamp;
}

interface GoogleReview {
  reviewId?: string;
  authorName?: string;
  comments?: Array<{
    userComment?: GoogleUserComment;
    developerComment?: GoogleDeveloperComment;
  }>;
}

interface GoogleReviewsResponse {
  reviews?: GoogleReview[];
  tokenPagination?: { nextPageToken?: string };
}

interface GoogleReplyResponse {
  result?: {
    replyText?: string;
    lastEdited?: GoogleTimestamp;
  };
}

function timestampToIso(timestamp?: GoogleTimestamp): string | undefined {
  if (timestamp?.seconds === undefined) return undefined;
  const seconds = Number(timestamp.seconds);
  if (!Number.isFinite(seconds)) return undefined;
  const millis = seconds * 1000 + (timestamp.nanos ?? 0) / 1_000_000;
  return new Date(millis).toISOString();
}

function parseServiceAccount(raw: string): JWTInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must contain valid service account JSON.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).type !== "service_account" ||
    typeof (parsed as Record<string, unknown>).client_email !== "string" ||
    typeof (parsed as Record<string, unknown>).private_key !== "string"
  ) {
    throw new Error(
      "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must be a Google Cloud service account key JSON object.",
    );
  }
  return parsed as JWTInput;
}

export class GooglePlayProvider extends BaseReviewProvider {
  readonly id = "google-play";
  readonly name = "Google Play Store";
  private auth?: GoogleAuth;

  private async serviceAccountCredentials(): Promise<JWTInput | undefined> {
    const configured = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
    if (!configured) return undefined;

    let rawCredentials = configured;
    if (!configured.startsWith("{")) {
      try {
        rawCredentials = await readFile(resolve(configured), "utf8");
      } catch {
        throw new Error(
          "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must be valid service account JSON or a readable JSON file path.",
        );
      }
    }
    return parseServiceAccount(rawCredentials);
  }

  private async googleAuth(): Promise<GoogleAuth> {
    if (!this.auth) {
      // Prefer Google's standard ADC configuration when it is explicitly set.
      // The older app-specific setting remains available for direct JSON input.
      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
        ? undefined
        : await this.serviceAccountCredentials();
      this.auth = new GoogleAuth({
        ...(credentials === undefined ? {} : { credentials }),
        scopes: [ANDROID_PUBLISHER_SCOPE],
      });
    }
    return this.auth;
  }

  /** Returns whether GoogleAuth can find explicit credentials or ADC. */
  async hasCredentials(): Promise<boolean> {
    try {
      await (await this.googleAuth()).getClient();
      return true;
    } catch {
      return false;
    }
  }

  private async accessToken(): Promise<string> {
    const token = await (await this.googleAuth()).getAccessToken();
    if (!token) throw new Error("Google authentication did not return an access token.");
    return token;
  }

  private async apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const token = await this.accessToken();
    const response = await request(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
    });
    if (!response.ok) throw apiError("Google Play Developer", response);
    return (await response.json()) as T;
  }

  private async fetchReviewPage(
    packageName: string,
    pageToken?: string,
  ): Promise<GoogleReviewsResponse> {
    const url = new URL(
      `${API_BASE}/applications/${encodeURIComponent(packageName)}/reviews`,
    );
    url.searchParams.set("maxResults", String(MAX_PAGE_SIZE));
    if (pageToken) url.searchParams.set("token", pageToken);
    return this.apiRequest<GoogleReviewsResponse>(url.href);
  }

  private async reviewForPackage(packageName: string, reviewId: string): Promise<GoogleReview> {
    const url = `${API_BASE}/applications/${encodeURIComponent(packageName)}/reviews/${encodeURIComponent(reviewId)}`;
    const token = await this.accessToken();
    const response = await request(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw apiError("Google Play Developer", response);
    return (await response.json()) as GoogleReview;
  }

  private mapReview(packageName: string, review: GoogleReview): Review {
    if (!review.reviewId) throw new Error("Google Play returned a review without a review ID.");
    const userComment = review.comments?.find((comment) => comment.userComment)?.userComment;
    const developerComment = review.comments
      ?.find((comment) => comment.developerComment)
      ?.developerComment;
    const createdAt = timestampToIso(userComment?.lastModified);
    const repliedAt = timestampToIso(developerComment?.lastModified);

    return {
      id: review.reviewId,
      platform: this.id,
      appId: packageName,
      rating: userComment?.starRating ?? 0,
      text: userComment?.text ?? "",
      ...(review.authorName === undefined ? {} : { reviewerName: review.authorName }),
      ...(userComment?.reviewerLanguage === undefined
        ? {}
        : { language: userComment.reviewerLanguage }),
      createdAt: createdAt ?? new Date(0).toISOString(),
      ...(developerComment?.text === undefined
        ? {}
        : {
            developerReply: {
              text: developerComment.text,
              ...(repliedAt === undefined ? {} : { repliedAt }),
            },
          }),
      ...(userComment?.device === undefined ? {} : { metadata: { device: userComment.device } }),
    };
  }

  async listReviews(params: ListReviewsOptions): Promise<Review[]> {
    const packageName = params.appId?.trim();
    if (!packageName) {
      throw new Error(
        "app_id is required for Google Play and must be the Android app package name.",
      );
    }
    const limit = Math.min(Math.max(params.limit ?? 20, 1), MAX_PAGE_SIZE);

    const matching: Review[] = [];
    let pageToken: string | undefined;
    do {
      const page = await this.fetchReviewPage(packageName, pageToken);
      for (const rawReview of page.reviews ?? []) {
        const review = this.mapReview(packageName, rawReview);
        if (params.rating === undefined || review.rating === params.rating) {
          matching.push(review);
        }
        if (matching.length >= limit) break;
      }
      pageToken = page.tokenPagination?.nextPageToken;
    } while (pageToken && matching.length < limit);
    return matching.slice(0, limit);
  }

  async getReview(reviewId: string, appId?: string): Promise<Review> {
    const packageName = appId?.trim();
    if (!packageName) {
      throw new Error(
        "app_id is required for Google Play and must be the Android app package name.",
      );
    }
    return this.mapReview(packageName, await this.reviewForPackage(packageName, reviewId));
  }

  override async replyToReview(
    _reviewId: string,
    _replyText: string,
    _appId?: string,
  ): Promise<ReplyResult> {
    throw this.notImplemented("replyToReview");
  }
}
