/* eslint-disable comma-dangle */
const { signAndExecuteRequest } = require('../index')

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

test('signAndExecuteRequest calls refereshTokenMock with correct params', () => {
  const authUtils = require('../utils')

  const mockClient = jest.fn()

  const refereshTokenMock = jest.fn()
  authUtils.refreshToken = refereshTokenMock

  const appId = '123'
  const appSecret = 'zzz'
  const tokenOptions = {
    appId,
    appSecret,
    jwt: '123',
    expiresAtMS: Date.now()
  }
  refereshTokenMock.mockReturnValueOnce(Promise.resolve(tokenOptions))

  const executeAuthenticatedRequestMock = jest.fn(() => Promise.resolve())
  authUtils.executeAuthenticatedRequest = executeAuthenticatedRequestMock

  const url = '/1/random'

  const requestOptions = { method: 'head' }

  const requestP = signAndExecuteRequest(mockClient, url, tokenOptions, requestOptions, authUtils)
  return requestP.then(() => {
    expect(refereshTokenMock).toHaveBeenCalledTimes(1)
    expect(refereshTokenMock).toHaveBeenCalledWith(
      mockClient,
      tokenOptions
    )
  })
})

test('signAndExecuteRequest calls executeAuthenticatedRequestMock with correct params, including result of token refresh', () => {
  const authUtils = require('../utils')

  const mockClient = jest.fn()

  const refereshTokenMock = jest.fn()
  authUtils.refreshToken = refereshTokenMock

  const appId = '123'
  const appSecret = 'zzz'
  const tokenOptions = {
    appId,
    appSecret,
    jwt: '123',
    expiresAtMS: Date.now()
  }
  const updatedTokenOptions = {
    ...tokenOptions,
    jwt: '456'
  }
  refereshTokenMock.mockReturnValueOnce(Promise.resolve(updatedTokenOptions))

  const executeAuthenticatedRequestMock = jest.fn()
  authUtils.executeAuthenticatedRequest = executeAuthenticatedRequestMock

  const expectedReturn = 'blah'
  executeAuthenticatedRequestMock.mockReturnValueOnce(Promise.resolve(expectedReturn))

  const url = '/1/random'

  const requestOptions = { method: 'head' }

  const requestP = signAndExecuteRequest(mockClient, url, tokenOptions, requestOptions, authUtils)
  return requestP.then(() => {
    expect(executeAuthenticatedRequestMock).toHaveBeenCalledTimes(1)
    expect(executeAuthenticatedRequestMock).toHaveBeenCalledWith(mockClient, url, updatedTokenOptions.jwt, requestOptions)
  })
})

test('signAndExecuteRequest returns tuple containing request result and updated token info', () => {
  const authUtils = require('../utils')

  const mockClient = jest.fn()

  const refereshTokenMock = jest.fn()
  authUtils.refreshToken = refereshTokenMock

  const appId = '123'
  const appSecret = 'zzz'
  const tokenOptions = {
    appId,
    appSecret,
    jwt: '123',
    expiresAtMS: Date.now()
  }
  const updatedTokenOptions = {
    ...tokenOptions,
    jwt: '456'
  }
  refereshTokenMock.mockReturnValueOnce(Promise.resolve(updatedTokenOptions))

  const executeAuthenticatedRequestMock = jest.fn()
  authUtils.executeAuthenticatedRequest = executeAuthenticatedRequestMock

  const expectedReturn = 'blah'
  executeAuthenticatedRequestMock.mockReturnValueOnce(Promise.resolve(expectedReturn))

  const url = '/1/random'

  const requestOptions = { method: 'head' }

  const requestP = signAndExecuteRequest(mockClient, url, tokenOptions, requestOptions, authUtils)
  return requestP.then(([r, t]) => {
    expect(r).toBe(expectedReturn)
    expect(t).toBe(updatedTokenOptions)
  })
})
