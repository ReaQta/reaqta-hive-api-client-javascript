const authUtils = require('./utils')

/**
 * @typedef {import('./utils').TokenOptions} TokenOptions
 */

/**
 * Optionally refreshes jwt before executing a request with an `Authorization: Bearer ${JWT}` header
 *
 * Returns a tuple, where the first element is the response from the request,
 * and the second element is a (possibly updated) copy of the tokenOptions
 *
 * @param {Function} client - Interface used to execute api requests
 * @param {string} url - The url to the resource we wish to access
 * @param {TokenOptions} tokenOptions - Information necessary for authentication
 * @param {Object} [requestOptions={}] - Additional options for this request
 *
 * @return {Promise<[*, TokenOptions]>}
 */
function signAndExecuteRequest(client, url, tokenOptions, requestOptions = {}) {
  const validTokenP = authUtils.refreshToken(client, tokenOptions)
  return validTokenP.then((updatedTokenOptions) => {
    const { jwt } = updatedTokenOptions
    const requestP = authUtils.executeAuthenticatedRequest(client, url, jwt, requestOptions)
    return requestP.then(res => [res, updatedTokenOptions])
  })
}

module.exports = {
  signAndExecuteRequest
}
