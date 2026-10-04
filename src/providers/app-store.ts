import { BaseReviewProvider } from "./base.js";
import type { ListReviewsOptions, Review } from "../types/provider.js";

/**
 * Starter adapter for App Store Connect customer reviews and responses.
 *
 * API work to add:
 * - Sign ES256 JWTs using the App Store Connect issuer, key ID, and private key.
 * - Enumerate accessible apps with `/v1/apps`, then list each app's
 *   `/v1/apps/{id}/customerReviews` and normalize the combined results.
 * - Retrieve review metadata where needed.
 * - Implement `/v1/customerReviewResponses` and set `supportsWrite` to true.
 */
export class AppStoreProvider extends BaseReviewProvider {
  readonly id = "app-store";
  readonly name = "Apple App Store";

  async listReviews(_params: ListReviewsOptions): Promise<Review[]> {
    // TODO: Enumerate accessible apps (unless params.appId filters to one),
    // fetch reviews for each, and normalize the combined results.
    throw this.notImplemented("listReviews");
  }

  async getReview(_reviewId: string): Promise<Review> {
    // TODO: Fetch/locate a customer review and map it to the normalized shape.
    throw this.notImplemented("getReview");
  }
}
