/* eslint-disable comma-dangle */
const {
  getJWT,
  shouldRefetchToken,
  executeAuthenticatedRequest,
  refreshToken,
} = require('../utils')

test('getJWT calls POST `/1/authenticate` with app credentials and returns the response data', () => {
  const expected = 'blah'
  const mockClient = jest.fn(() => Promise.resolve({ data: expected }))
  const appId = '123'
  const appSecret = 'zzz'
  return getJWT(mockClient, appId, appSecret).then(tokenData => {
    expect(mockClient).toHaveBeenCalledTimes(1)
    const clientArg = mockClient.mock.calls[0][0]
    expect(clientArg).toHaveProperty('url', '/1/authenticate')
    expect(clientArg).toHaveProperty('method', 'post')
    expect(clientArg).toHaveProperty('data')
    expect(clientArg.data).toMatchObject({
      id: appId,
      secret: appSecret
    })
    expect(tokenData).toBe(expected)
  })
})

test('shouldRefetchToken returns true if jwt is falsy', () => {
  const willRefetch = shouldRefetchToken(null, Date.now() + 10000)
  expect(willRefetch).toBe(true)
})

test('shouldRefetchToken returns true if jwt expired', () => {
  const willRefetch = shouldRefetchToken('123', Date.now() - 1)
  expect(willRefetch).toBe(true)
})

test('shouldRefetchToken returns false if jwt is truthy and not expired', () => {
  const willRefetch = shouldRefetchToken('123', Date.now() + 1000)
  expect(willRefetch).toBe(false)
})

test('executeAuthenticatedRequest passes url, method, body, params, headers, and correct responseType to client', () => {
  const mockClient = jest.fn(() => Promise.resolve())
  const url = '/random/url'
  const jwt = '123'
  const requestOptions = {
    method: 'options',
    body: { random: 'payload' },
    params: { gid: ['a', 'b', 'c'] },
    headers: { 'x-rqt-opts': 'blahblahblah' },
    stream: true
  }
  const requestP = executeAuthenticatedRequest(mockClient, url, jwt, requestOptions)
  return requestP.then(_ => {
    expect(mockClient).toHaveBeenCalledTimes(1)
    const clientArg = mockClient.mock.calls[0][0]
    expect(clientArg).toHaveProperty('url', url)
    expect(clientArg).toHaveProperty('method', requestOptions.method)
    expect(clientArg).toHaveProperty('data')
    expect(clientArg.data).toMatchObject(requestOptions.body)
    expect(clientArg.headers).toMatchObject(requestOptions.headers)
    expect(clientArg.headers).toMatchObject({ Authorization: `Bearer ${jwt}` })
    expect(clientArg.responseType).toEqual('stream')
  })
})

test('executeAuthenticatedRequest returns response from client', () => {
  const expected = 'blah'
  const mockClient = jest.fn(() => Promise.resolve(expected))
  const url = '/random/url'
  const jwt = '123'
  const requestOptions = {}
  const requestP = executeAuthenticatedRequest(mockClient, url, jwt, requestOptions)
  return requestP.then(r => {
    expect(r).toBe(expected)
  })
})

test('refreshToken returns current token info if shouldRefetchToken returns false', () => {
  const mockClient = jest.fn(() => Promise.resolve())
  const shouldRefetchTokenMock = jest.fn(() => false)
  const token = 'xxx'
  const expiresAt = (Date.now() + 10000) / 1000
  const tokenOptions = {
    appId: '087983745973',
    appSecret: 'trustno1',
    jwt: token,
    expiresAtMS: expiresAt * 1000
  }
  const getJWTMock = jest.fn()
  return refreshToken(mockClient, tokenOptions, shouldRefetchTokenMock, getJWTMock)
    .then((o) => {
      expect(o).toBe(tokenOptions)
    })
})

test('refreshToken returns result of fetchToken if shouldRefetchToken returns true', () => {
  const mockClient = jest.fn(() => Promise.resolve())
  const shouldRefetchTokenMock = jest.fn(() => true)
  const token = 'new'
  const expiresAt = (Date.now() + 10000) / 1000
  const tokenOptions = {
    appId: '087983745973',
    appSecret: 'trustno1',
    jwt: 'old',
    expiresAtMS: 123
  }
  const getJWTMock = jest.fn(() => Promise.resolve({ token, expiresAt }))
  return refreshToken(mockClient, tokenOptions, shouldRefetchTokenMock, getJWTMock)
    .then((updatedToken) => {
      const expectedUpdatedToken = {
        ...tokenOptions,
        jwt: token,
        expiresAtMS: new Date(expiresAt * 1000)
      }
      expect(updatedToken).toStrictEqual(expectedUpdatedToken)
    })
})

test('refreshToken calls fetchToken with correct parameters', () => {
  const mockClient = jest.fn(() => Promise.resolve())
  const shouldRefetchTokenMock = jest.fn(() => true)
  const token = 'new'
  const expiresAt = (Date.now() + 10000) / 1000
  const tokenOptions = {
    appId: '087983745973',
    appSecret: 'trustno1',
    jwt: 'old',
    expiresAtMS: 123
  }
  const getJWTMock = jest.fn(() => Promise.resolve({ token, expiresAt }))
  return refreshToken(mockClient, tokenOptions, shouldRefetchTokenMock, getJWTMock)
    .then((updatedToken) => {
      const { appId, appSecret } = tokenOptions
      expect(getJWTMock).toHaveBeenCalledWith(mockClient, appId, appSecret)
    })
})
