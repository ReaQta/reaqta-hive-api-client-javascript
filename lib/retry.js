const alwaysTrue = () => true
/**
 * Retries a promise-returning function until it resolves.
 *
 * If the promise rejects, will call the command function again until the retry limit is reached,
 * or the shouldRetry predicate returns false.
 *
 * @param {Function} command - A function that returns a promise
 * @param {number} [retryLimit=1] - The max number of times to retry
 * @param {Function} [shouldRetry] - A predicate function that, given an error from a promise rejection, determines whether or not we should continue retrying.
 * @return {Promise<*>}
 * @rqtHelper
 */
function retry(command, retryLimit = 1, shouldRetry = alwaysTrue) {
  let retryCount = 0
  const onError = err => {
    retryCount += 1
    if (retryCount > retryLimit) {
      throw err
    }
    if (!shouldRetry(err)) {
      throw err
    }
    return commandWithRetries()
  }
  const commandWithRetries = () => command().catch(onError)
  return commandWithRetries()
}

module.exports = { retry }
