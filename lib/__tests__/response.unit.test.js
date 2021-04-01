const ReaQtaResponse = require('../response')

const signAndExecuteRequestMock = jest.fn()

beforeEach(() => {
  jest.resetModules()
})

test('ReaQtaResponse initializes with empty data', () => {
  const apiResponse = { data: null }
  const response = new ReaQtaResponse(apiResponse, signAndExecuteRequestMock)
  expect(response).toBeInstanceOf(ReaQtaResponse)
  expect(response.hasNextPage()).toBe(false)
  expect(response.getNextPageUrl()).toBeFalsy()
  expect(response).not.toHaveProperty('getNextPage')
  expect(response).toHaveProperty('data', null)
})

test('ReaQtaResponse initializes without getNextPage if no data.nextPage prop', () => {
  const data = { result: [1, 2, 3], remainingItems: 5, nextPage: '' }
  const apiResponse = { data }
  const response = new ReaQtaResponse(apiResponse, signAndExecuteRequestMock)
  expect(response).toBeInstanceOf(ReaQtaResponse)
  expect(response.hasNextPage()).toBe(false)
  expect(response.getNextPageUrl()).toBeFalsy()
  expect(response).not.toHaveProperty('getNextPage')
  expect(response).toHaveProperty('data', data)
})

test('ReaQtaResponse initializes without getNextPage if data.remainingItems is 0', () => {
  const data = { result: [1, 2, 3], remainingItems: 0, nextPage: 'blahblahurl' }
  const apiResponse = { data }
  const response = new ReaQtaResponse(apiResponse, signAndExecuteRequestMock)
  expect(response).toBeInstanceOf(ReaQtaResponse)
  expect(response.hasNextPage()).toBe(false)
  expect(response.getNextPageUrl()).toBeFalsy()
  expect(response).not.toHaveProperty('getNextPage')
  expect(response).toHaveProperty('data', apiResponse.data)
})

test('ReaQtaResponse initializes with getNextPage if data.nextPage prop exists', () => {
  const data = { result: [1, 2, 3], remainingItems: 1, nextPage: 'blahblahurl' }
  const apiResponse = { data }
  const response = new ReaQtaResponse(apiResponse, signAndExecuteRequestMock)
  expect(response).toBeInstanceOf(ReaQtaResponse)
  expect(response.hasNextPage()).toBe(true)
  expect(response.getNextPageUrl()).toEqual(data.nextPage)
  expect(response).toHaveProperty('getNextPage', expect.any(Function))
  expect(response).toHaveProperty('data', data)
})

test('ReaQtaResponse.getNextPage executes the provided request fetcher with nextPage url, and returns its result', () => {
  const data = { result: [1, 2, 3], remainingItems: 1, nextPage: 'blahblahurl' }
  const apiResponse = { data }
  const expectedResult = 'test'
  signAndExecuteRequestMock.mockReturnValueOnce(Promise.resolve(expectedResult))
  const response = new ReaQtaResponse(apiResponse, signAndExecuteRequestMock)
  return response.getNextPage().then(r => {
    expect(signAndExecuteRequestMock).toHaveBeenCalledTimes(1)
    expect(signAndExecuteRequestMock).toHaveBeenCalledWith(data.nextPage)
    expect(r).toBe(expectedResult)
  })
})

test('ReaQtaResponse.getHeaders returns the response headers', () => {
  const apiResponse = { headers: { 'x-rqt-special': 'blahblah' } }
  const response = new ReaQtaResponse(apiResponse)
  expect(response).toBeInstanceOf(ReaQtaResponse)
  expect(response.getHeaders()).toStrictEqual(apiResponse.headers)
})
