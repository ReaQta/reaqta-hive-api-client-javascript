const { FileStreamError } = require('./errors')
/**
 * Construct a filename from HTTP Response headers.
 *
 * If no filename is found in the headers, will use `fallbackName`.
 * Without a fallback, a generic timestamped filename will be returned.
 *
 * @param {Object} headers - HTTP response headers
 * @param {string} [fallbackName] - The filename to use if none could be found in the content-disposition header
 * @return {string}
 * @ignore
 */
function getFilenameFromHeaders(headers, fallbackName) {
  const dispositionHeader = headers && headers['content-disposition']
  const filenameMatch = dispositionHeader && dispositionHeader.match(/filename="(.+)"/)

  let filename
  if (filenameMatch) {
    filename = filenameMatch[1]
  } else if (fallbackName) {
    filename = fallbackName
  } else {
    const dateSuffix = (new Date()).toISOString()
    filename = `reaqta-api-download-${dateSuffix}.bin`
  }

  return filename
}

/**
 * Pipe a readable stream to a writable stream,
 * returning a promise that resolves on success, and rejects on error
 *
 * @param {Readable} fileReadStream - A readable stream
 * @param {Writable} fileWriteStream - A writable stream
 *
 * @return {Promise<void>}
 * @rqtHelper
 */
function pipeFilePromise(fileReadStream, fileWriteStream) {
  return new Promise((resolve, reject) => {
    try {
      // Set up stream end handler
      fileReadStream.on('end', () => {
        // NOTE: In theory, when a readable stream (`fileReadStream`) is piped to a writable stream (`response`),
        //       then the writable stream stream should automatically fire the `end` event when the data finishes
        //       Thus, I do not think we need to explicitly call `response.end()` here
        //
        resolve()
      })

      // Set up stream error handler
      fileReadStream.on('error', (err) => {
        const ourError = new FileStreamError(err)
        reject(ourError)
        // NOTE: This makes it easier for our tests to test the error path.
        //       In production, an error event will mean the stream is destroyed (I think)
        //       However, if we manually `emit` an `error` event, like with:
        //
        //           fileReadStream.emit('error', new Error('meh'))
        //
        //       we need to manually destroy the stream here to prevent future writes
        //
        if (!fileReadStream.destroyed) {
          fileReadStream.destroy(err)
        }
      })

      // Start piping stream
      fileReadStream.pipe(fileWriteStream)
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = { getFilenameFromHeaders, pipeFilePromise }
