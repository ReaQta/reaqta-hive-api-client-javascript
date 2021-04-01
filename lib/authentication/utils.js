const { GET, POST } = require('../methods')

/**
 * @typedef {Object} TokenOptions
 * @property {string} appId - The id of the application used to authenticate
 * @property {string} appSecret - The secret of the application used to authenticate
 * @property {string} jwt - The current json web token
 * @property {number} jwtExpiresAtMS - Time at which the current JWT expires, in milliseconds
 */

/**
 * Check if we have a non-expired JWT.
 *
 * Note that we will refetch the token if it is going to expire in the next second.
 * This is to mitigate a possible edge case where the token expires before the request
 * hits the API.
 *
 */
function shouldRefetchToken(jwt, jwtExpiresAtMS) {
  if (!jwt) {
    return true
  }
  // NOTE: Here is where we conservatively pad the expiration time of the token
  const safeExpirationTimeMS = jwtExpiresAtMS - 1000
  const currentTimeMS = Date.now()
  if (safeExpirationTimeMS < currentTimeMS) {
    return true
  }
  return false
}

/**
 * Fetch a jwt from the API
 *
 * @param {Function} client - Interface used to execute api requests
 * @param {string} appId - The id of the application used to authenticate
 * @param {string} appSecret - The secret of the application used to authenticate
 * @return {{ jwt: string, expiresAt: number }}
 */
function getJWT(client, appId, appSecret) {
  const body = { id: appId, secret: appSecret }
  return client({
    url: '/1/authenticate',
    method: POST,
    data: body
  }).then(r => r.data)
}

/**
 * Execute a request, adding the current JWT to the headers of the request
 *
 * @param {Function} client - Interface used to execute api requests
 * @param {string} url - The url to the resource we wish to access
 * @param {string} jwt - A valid JSON Web Token to use for authentication
 * @param {Object} [requestOptions={}] - Additional options for this request
 * @return {Promise<*>}
 */
function executeAuthenticatedRequest(client, url, jwt, requestOptions = {}) {
  const { method = GET, body, params, headers, stream } = requestOptions
  return client({
    url,
    method,
    data: body,
    params,
    headers: {
      ...headers,
      Authorization: `Bearer ${jwt}`
    },
    ...(stream && { responseType: 'stream' })
  })
}

/**
 * If jwt has expired, request a new one.
 * Otherwise, just return the current jwt token info.
 *
 * @param {Function} client - Interface used to execute api requests
 * @param {TokenOptions} tokenOptions - Information necessary for authentication
 * @param {Function} [shouldRefetch=shouldRefetchToken] - Function used to determine whether the current JSON Web Token is valid
 * @param {Function} [fetchToken=getJWT] - Function used to generate a new JSON Web Token, if necessary
 * @return {Promise<TokenOptions>}
 */
function refreshToken(client, tokenOptions, shouldRefetch = shouldRefetchToken, fetchToken = getJWT) {
  const { appId, appSecret, jwt, jwtExpiresAtMS } = tokenOptions

  if (!shouldRefetch(jwt, jwtExpiresAtMS)) {
    return Promise.resolve(tokenOptions)
  }

  return fetchToken(client, appId, appSecret).then((res) => {
    const { token, expiresAt } = res
    const newTokenOptions = {
      jwt: token,
      jwtExpiresAtMS: new Date(expiresAt * 1000),
      appId,
      appSecret
    }
    return newTokenOptions
  })
}

module.exports = {
  getJWT,
  shouldRefetchToken,
  executeAuthenticatedRequest,
  refreshToken
}
