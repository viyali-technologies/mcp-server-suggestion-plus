import { BaseReviewProvider } from "./base.js";
import type { ListReviewsOptions, Review } from "../types/provider.js";

/**
 * Starter adapter for the Google Play Developer API (androidpublisher v3).
 *
 * API work to add:
 * - Authenticate with a service account authorized for the Play Console app.
 * - Build/load an account-wide package-name catalog, then call `reviews.list`
 *   for each accessible app and map the combined results to `Review`.
 * - Fetch the matching review from the returned review collection as needed.
 * - Implement `reviews.reply` and set `supportsWrite` to true after validation.
 */
export class GooglePlayProvider extends BaseReviewProvider {
  readonly id = "google-play";
  readonly name = "Google Play Store";

  async listReviews(_params: ListReviewsOptions): Promise<Review[]> {
    // TODO: Resolve all accessible packages (or filter by params.appId), call
    // androidpublisher v3 `reviews.list` per package, and normalize the results.
    throw this.notImplemented("listReviews");
  }

  async getReview(_reviewId: string): Promise<Review> {
    // TODO: Call `reviews.list` for the configured package and find the review.
    throw this.notImplemented("getReview");
  }
}
