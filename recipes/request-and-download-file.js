/* eslint-disable no-console, comma-dangle */

/**
 * @file An example implementation of a script that requests a file be made available, waits until it is available, and then downloads the requested file.
 */

require('dotenv').config()
require('colors')
const ReaQtaApiClient = require('../lib')

// NOTE: Change these variables to match the file you wish to download
//       (or add the endpointId and path as environment variables)
const ENDPOINT_ID = '' || process.env.RECIPE_DOWNLOAD_ENDPOINT_ID
const PATH_TO_FILE = '' || process.env.RECIPE_DOWNLOAD_FILE_PATH

const client = new ReaQtaApiClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: process.env.REAQTA_API_APP_ID,
  appSecret: process.env.REAQTA_API_SECRET_KEY,
  insecure: !!process.env.REAQTA_API_INSECURE
})

/**
 * Error returned when there was an issue making the file available for download
 */
class FileUploadFailed extends Error {
  constructor(fileUploadStatus) {
    super('File upload failed')
    this.name = 'FileUploadFailed'
    this.details = fileUploadStatus
    this.phase = this.details && this.details.stage && this.details.stage.phase
  }
}

/**
 * Error returned when a polling function exceeds its max alloted retries
 */
class PollAttemptMaxExceeded extends Error {
  constructor(details) {
    super('Max polling attempts exceeded')
    this.name = 'PollAttemptMaxExceeded'
    this.details = details
  }
}

/**
 * This is a helper to poll the file status API to check if the file is available for download
 *
 * @return Promise<string> Returns a promise that resolves to the downloadId of the file
 */
const pollFileStatusUntilReady = (uploadId, options) => {
  const { maxAttempts = 15, onPoll } = options
  const FIVE_SECONDS = 5000
  const pollStatus = (pollAttempt = 1, delay = FIVE_SECONDS) => {
    return new Promise((resolve, reject) => {
      if (pollAttempt > maxAttempts) {
        return reject(new PollAttemptMaxExceeded({ uploadId, maxAttempts }))
      }

      const handleFileStatusSuccess = fileStatusResponse => {
        const status = fileStatusResponse.data
        switch (status.stage.phase) {
          case 1:
          case 2:
            return pollStatus(pollAttempt + 1, delay).then(resolve, reject)
          case 3:
          case 5:
            return resolve(status.downloadId)
          case 4:
          default: {
            return reject(new FileUploadFailed(status))
          }
        }
      }

      const handleFileStatusError = err => {
        // If the response was a 404, we try again in five seconds
        // NOTE: This delay is necessary for the file to show up in the database, since
        //       requesting the file's status immediately after starting the upload could give us a 404
        const responseStatus = err && err.response && err.response.status
        if (responseStatus === 404) {
          return pollStatus(pollAttempt + 1, delay).then(resolve, reject)
        }
        throw err
      }

      const checkStatus = () => {
        if (onPoll) {
          onPoll({ pollAttempt, delay })
        }
        return client.getFileStatus(uploadId).then(handleFileStatusSuccess, handleFileStatusError)
      }

      setTimeout(checkStatus, delay)
    })
  }
  return pollStatus(1, FIVE_SECONDS)
}

// First, request that event-hive make the file available for download
console.log(`Requesting file ${PATH_TO_FILE} be made available for download`)
const fileRequest = client.requestFile(ENDPOINT_ID, {
  path: PATH_TO_FILE
}).catch(err => {
  console.error('Request to upload file failed:'.red, err && err.message)
  throw err
})

// Next, start polling the file status api to check if the file is available to download
const poll = fileRequest.then(fileInfoResponse => {
  console.log('File upload initiated'.green)
  console.log('Polling file upload status'.white)
  const { uploadId } = fileInfoResponse.data
  const logPollAttempt = ({ pollAttempt, delay } = {}) => {
    console.log(`\tPolling file status (attempt: ${pollAttempt} | delay: ${delay}ms)`.grey)
  }
  return pollFileStatusUntilReady(uploadId, { onPoll: logPollAttempt })
}).catch(err => {
  console.error('File failed to upload to hive servers:'.red)
  if (err instanceof FileUploadFailed) {
    const details = err && err.details
    const stageErrorMsg = details && details.stage && details.stage.error
    if (stageErrorMsg) {
      console.error('Error details:', stageErrorMsg)
    } else {
      console.error('Unknown error:', err)
    }
    throw err
  }

  if (err instanceof PollAttemptMaxExceeded) {
    console.error('Maximum retries exceeded while polling file status')
    throw err
  }

  console.error('Unknown error:', err)
  throw err
})

// Lastly, download the file
poll.then(downloadId => {
  console.log('Downloading File'.green)
  return client.downloadFile(downloadId)
}).catch(err => {
  console.error('File failed to download:'.red, err)
  throw err
})
