/**
 * Error to be returned if there is an issue while streaming a file from the API.
 * @param {*} streamError - The original error that caused the stream to fail
 * @prop {string} name
 * @prop {Object} details
 * @prop {*} details.streamError - The original error that caused the stream to fail
 * @rqtError
 */
class FileStreamError extends Error {
  constructor(streamError) {
    super('Error while streaming file')
    this.name = 'FileStreamError'
    this.details = { streamError }
  }
}

/**
 * Error to be returned if a request to the api fails
 * @param {Error} [requestError] - The error from the HTTP client, if it exists
 * @prop {string} name
 * @prop {boolean} isReaQtaError - A flag to indicate this is an error from the API client
 * @prop {Object} details
 * @prop {*} [details.requestError] - The error from the HTTP client, if it exists
 * @rqtError
 */
class ReaQtaRequestError extends Error {
  constructor(requestError) {
    super('Error executing request')
    this.name = 'ReaQtaRequestError'
    this.isReaQtaError = true
    this.details = { requestError }
    // TODO: Fill in more details
    const isAxiosError = requestError && requestError.isAxiosError
    if (isAxiosError) {
      const url = requestError.config && requestError.config.url
      const response = requestError && requestError.response
      const status = response && response.status
      const data = response && response.data
      this.details.url = url
      this.details.status = status
      this.details.data = data
    }
  }
}

module.exports = { FileStreamError, ReaQtaRequestError }
