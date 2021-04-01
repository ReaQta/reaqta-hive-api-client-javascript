const { Readable: ReadableStream, Writable: WritableStream } = require('stream')
const { FileStreamError } = require('../errors')
const { getFilenameFromHeaders, pipeFilePromise } = require('../file-utils')

test('getFilenameFromHeaders parses filename from content disposition header', () => {
  const filename = 'explorer.exe'
  const headers = { 'content-disposition': `filename="${filename}"` }
  expect(getFilenameFromHeaders(headers)).toEqual(filename)
})

test('getFilenameFromHeaders uses fallback when headers empty', () => {
  const fallbackName = 'fallback.gin'
  const headers = {}
  expect(getFilenameFromHeaders(undefined, fallbackName)).toEqual(fallbackName)
  expect(getFilenameFromHeaders(headers, fallbackName)).toEqual(fallbackName)
})

test('getFilenameFromHeaders generates its own filename when headers empty and fallback name not defined', () => {
  const result = getFilenameFromHeaders()
  expect(result).toMatch(/^reaqta-api-download/)
  expect(result).toMatch(/\.bin$/)
})

test('pipeFilePromise resolves when file stream finishes', async () => {
  const writable = new WritableStream()
  writable._write = () => {} // _write is required but you can noop it

  const readable = new ReadableStream()
  readable._read = () => {} // _read is required but you can noop it

  const pipePromise = pipeFilePromise(readable, writable)

  readable.push(Buffer.from('abc'))
  readable.push(null)

  return expect(pipePromise).resolves.toBeUndefined()
})

test('pipeFilePromise throws a FileStreamError when the file stream emits an error', async () => {
  const writable = new WritableStream()
  writable._write = () => {} // _write is required but you can noop it

  const readable = new ReadableStream()
  readable._read = () => {} // _read is required but you can noop it

  const pipePromise = pipeFilePromise(readable, writable)

  // HACK: Fire a stream error asynchronously
  //       We have to do this async because the error handlers are not set up on the stream until after this function returns (and the body of the promise created in downloadFile is executed)
  setTimeout(() => readable.emit('error', new Error('meh')), 1)

  return expect(pipePromise).rejects.toThrow(FileStreamError)
})

test('pipeFilePromise throws when there is an error setting up the stream handlers', async () => {
  const pipePromise = pipeFilePromise()
  return expect(pipePromise).rejects.toThrow(expect.any(Error))
})
