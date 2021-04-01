/* eslint-disable comma-dangle */
const authUtils = require('../utils')
const { signAndExecuteRequest } = require('../index')

jest.mock('../utils')

const refereshTokenMock = jest.fn()
const executeAuthenticatedRequestMock = jest.fn()

authUtils.refreshToken = refereshTokenMock
authUtils.executeAuthenticatedRequest = executeAuthenticatedRequestMock

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

test('signAndExecuteRequest calls refereshTokenMock with correct params', () => {
  const mockClient = jest.fn()
  const appId = '123'
  const appSecret = 'zzz'
  const tokenOptions = {
    appId,
    appSecret,
    jwt: '123',
    jwtExpiresAtMS: Date.now()
  }
  refereshTokenMock.mockReturnValueOnce(Promise.resolve(tokenOptions))

  executeAuthenticatedRequestMock.mockReturnValueOnce(Promise.resolve())
  const url = '/1/random'

  const requestOptions = { method: 'head' }

  const requestP = signAndExecuteRequest(mockClient, url, tokenOptions, requestOptions)
  return requestP.then(() => {
    expect(refereshTokenMock).toHaveBeenCalledTimes(1)
    expect(refereshTokenMock).toHaveBeenCalledWith(
      mockClient,
      tokenOptions
    )
  })
})

test('signAndExecuteRequest calls executeAuthenticatedRequestMock with correct params, including result of token refresh', () => {
  const mockClient = jest.fn()

  const appId = '123'
  const appSecret = 'zzz'
  const tokenOptions = {
    appId,
    appSecret,
    jwt: '123',
    jwtExpiresAtMS: Date.now()
  }
  const updatedTokenOptions = {
    ...tokenOptions,
    jwt: '456'
  }
  refereshTokenMock.mockReturnValueOnce(Promise.resolve(updatedTokenOptions))

  const expectedReturn = 'blah'
  executeAuthenticatedRequestMock.mockReturnValueOnce(Promise.resolve(expectedReturn))

  const url = '/1/random'

  const requestOptions = { method: 'head' }

  const requestP = signAndExecuteRequest(mockClient, url, tokenOptions, requestOptions)
  return requestP.then(() => {
    expect(executeAuthenticatedRequestMock).toHaveBeenCalledTimes(1)
    expect(executeAuthenticatedRequestMock).toHaveBeenCalledWith(mockClient, url, updatedTokenOptions.jwt, requestOptions)
  })
})

test('signAndExecuteRequest calls executeAuthenticatedRequestMock with correct params when requestOptions is not specified', () => {
  const mockClient = jest.fn()

  const appId = '123'
  const appSecret = 'zzz'
  const tokenOptions = {
    appId,
    appSecret,
    jwt: '123',
    jwtExpiresAtMS: Date.now()
  }
  const updatedTokenOptions = {
    ...tokenOptions,
    jwt: '456'
  }
  refereshTokenMock.mockReturnValueOnce(Promise.resolve(updatedTokenOptions))

  const expectedReturn = 'blah'
  executeAuthenticatedRequestMock.mockReturnValueOnce(Promise.resolve(expectedReturn))

  const url = '/1/random'

  const requestP = signAndExecuteRequest(mockClient, url, tokenOptions)
  return requestP.then(() => {
    expect(executeAuthenticatedRequestMock).toHaveBeenCalledTimes(1)
    expect(executeAuthenticatedRequestMock).toHaveBeenCalledWith(mockClient, url, updatedTokenOptions.jwt, {})
  })
})

test('signAndExecuteRequest returns tuple containing request result and updated token info', () => {
  const mockClient = jest.fn()

  const appId = '123'
  const appSecret = 'zzz'
  const tokenOptions = {
    appId,
    appSecret,
    jwt: '123',
    jwtExpiresAtMS: Date.now()
  }
  const updatedTokenOptions = {
    ...tokenOptions,
    jwt: '456'
  }
  refereshTokenMock.mockReturnValueOnce(Promise.resolve(updatedTokenOptions))

  const expectedReturn = 'blah'
  executeAuthenticatedRequestMock.mockReturnValueOnce(Promise.resolve(expectedReturn))

  const url = '/1/random'

  const requestOptions = { method: 'head' }

  const requestP = signAndExecuteRequest(mockClient, url, tokenOptions, requestOptions)
  return requestP.then(([r, t]) => {
    expect(r).toBe(expectedReturn)
    expect(t).toBe(updatedTokenOptions)
  })
})
