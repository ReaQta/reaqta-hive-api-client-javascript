const { ReaQtaResponse } = require('./response')

/**
 * @callback PaginatedResponseHandler
 * @param {ReaQtaResponse} reaqtaResponse - The response from an API call
 * @returns {Promise<ReaQtaResponse>}
 */

/**
 * Create a promise success handler that, given a paginated API response, will greedily paginate to the end.
 * Returns a promise that resolves to the concatenation of `result` arrays from each page.
 *
 * @param {array} [allResults = []] - The results we've already seen from previous pages
 * @return {PaginatedResponseHandler}
 * @rqtHelper
 */
const collectPageResults = (currentResults = []) => reaqtaResponse => {
  const r = reaqtaResponse
  let nextResults = currentResults

  const result = r && r.data && r.data.result
  if (result) {
    nextResults = [...currentResults, ...result]
  }

  if (r && r.getNextPage) {
    return r.getNextPage().then(collectPageResults(nextResults))
  }

  return Promise.resolve(new ReaQtaResponse({ data: nextResults }))
}

module.exports = { collectPageResults }
