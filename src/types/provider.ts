/** A normalized customer review shared by every platform adapter. */
export interface Review {
  /** Stable identifier used by the provider to retrieve/reply to this review. */
  id: string;
  platform: string;
  appId: string;
  rating: number;
  title?: string;
  text: string;
  reviewerName?: string;
  createdAt: string;
  updatedAt?: string;
  language?: string;
  /** Provider-specific fields that are useful to callers but not normalized. */
  metadata?: Record<string, unknown>;
  developerReply?: {
    text: string;
    repliedAt?: string;
  };
}

export interface ListReviewsOptions {
  appId?: string;
  /** Filter to reviews with this star rating (1 through 5). */
  rating?: number;
  limit?: number;
  /** Opaque provider cursor for pagination. */
  cursor?: string;
}

export interface ReplyResult {
  reviewId: string;
  success: boolean;
  replyText: string;
  repliedAt?: string;
  /** Provider response identifiers or other useful response details. */
  metadata?: Record<string, unknown>;
}

/** Contract implemented by every review platform adapter. */
export interface ReviewProvider {
  readonly id: string;
  readonly name: string;
  readonly supportsWrite: boolean;
  listReviews(params: ListReviewsOptions): Promise<Review[]>;
  getReview(reviewId: string): Promise<Review>;
  replyToReview?(reviewId: string, replyText: string): Promise<ReplyResult>;
}
