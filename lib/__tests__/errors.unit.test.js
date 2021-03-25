const { FileStreamError, ReaQtaRequestError } = require('../errors')

test('FileStreamError has correct name, message, and details', () => {
  const error = new FileStreamError(6)
  expect(error).toHaveProperty('message', 'Error while streaming file')
  expect(error).toHaveProperty('name', 'FileStreamError')
  expect(error).toHaveProperty('details.streamError', 6)
})

test('ReaQtaRequestError has correct name, message, and details when originating error is undefined', () => {
  const requestError = undefined
  const error = new ReaQtaRequestError(requestError)
  expect(error).toHaveProperty('isReaQtaError', true)
  expect(error).toHaveProperty('message', 'Error executing request')
  expect(error).toHaveProperty('name', 'ReaQtaRequestError')
  expect(error).toHaveProperty('details.requestError', requestError)

  expect(error).not.toHaveProperty('details.status')
  expect(error).not.toHaveProperty('details.data')
  expect(error).not.toHaveProperty('details.url')
})

test('ReaQtaRequestError has correct name, message, and details when originating error is non-axios error', () => {
  const requestError = new Error('Blah blah')
  const error = new ReaQtaRequestError(requestError)
  expect(error).toHaveProperty('isReaQtaError', true)
  expect(error).toHaveProperty('message', 'Error executing request')
  expect(error).toHaveProperty('name', 'ReaQtaRequestError')
  expect(error).toHaveProperty('details.requestError', requestError)

  expect(error).not.toHaveProperty('details.status')
  expect(error).not.toHaveProperty('details.data')
  expect(error).not.toHaveProperty('details.url')
})

test('ReaQtaRequestError has correct name, message, and details when originating error is axios error', () => {
  const mockAxiosError = new Error('Blah blah')
  mockAxiosError.isAxiosError = true
  mockAxiosError.response = {
    status: 404,
    data: { message: 'not found' }
  }
  mockAxiosError.config = { url: '/path/to/stuff' }

  const error = new ReaQtaRequestError(mockAxiosError)
  expect(error).toHaveProperty('isReaQtaError', true)
  expect(error).toHaveProperty('message', 'Error executing request')
  expect(error).toHaveProperty('name', 'ReaQtaRequestError')
  expect(error).toHaveProperty('details.requestError', mockAxiosError)

  expect(error).toHaveProperty('details.url', mockAxiosError.config.url)
  expect(error).toHaveProperty('details.status', 404)
  expect(error).toHaveProperty('details.data', mockAxiosError.response.data)
})
