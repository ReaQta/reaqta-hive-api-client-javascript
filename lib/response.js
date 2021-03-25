/**
 * Creates a wrapper for an API response
 * @class ReaQtaResponse
 *
 *
 */
class ReaQtaResponse {
  /**
   *
   * @param {Object} apiResponse - The http response from the api
   * @param {Function} signAndExecuteRequest - A callback to execute authenticated requests against the API
   */
  constructor(apiResponse, signAndExecuteRequest) {
    /**
     * The payload of the api response
     */
    this.data = apiResponse.data
    this._response = apiResponse
    if (this.hasNextPage()) {
      const nextPageURL = this.getNextPageUrl()
      /**
       * Request the next page of results.
       * (If there are no more results, this method is undefined.)
       * @return {Promise<ReaQtaResponse>}
       */
      this.getNextPage = () => signAndExecuteRequest(nextPageURL)
    }
  }

  /**
   * Get the headers from the api response
   * @return {Object} On object describing the http response headers
   */
  getHeaders() {
    const res = this._response
    return res && res.headers
  }

  /**
   * Get the url to the next page of results, if it exists
   * @return {string | undefined} The url to the next page of results
   */
  getNextPageUrl() {
    const d = this.data
    const nextPage = d && d.remainingItems && d.nextPage
    return nextPage || undefined
  }

  /**
   * Check if api response has a next page of results
   * @return {boolean}
   */
  hasNextPage() {
    return !!this.getNextPageUrl()
  }
}

module.exports = ReaQtaResponse
