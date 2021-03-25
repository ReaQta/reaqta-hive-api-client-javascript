const fs = require('fs')
const path = require('path')
const https = require('https')
const axios = require('axios')
const auth = require('../authentication')
const ReaQtaResponse = require('../response')
const { ReaQtaRequestError } = require('../errors')
const fileUtils = require('../file-utils')

const ReaQtaClient = require('../client')

jest.mock('fs')
jest.mock('https')
jest.mock('axios')
jest.mock('../authentication')
jest.mock('../file-utils')

fs.existsSync = jest.fn()
fs.createWriteStream = jest.fn()

fileUtils.getFilenameFromHeaders = jest.fn()
fileUtils.pipeFilePromise = jest.fn()

https.Agent = jest.fn()

const mockExecuteRequest = jest.fn(() => Promise.resolve([{}, {}]))
auth.signAndExecuteRequest = mockExecuteRequest

const mockHttpClient = jest.fn()
const useResInterceptorsMock = jest.fn()
mockHttpClient.interceptors = {
  response: {
    use: useResInterceptorsMock
  }
}
axios.create = jest.fn(() => {
  return mockHttpClient
})

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

test('ReaQtaClient initializes with correct app id and secret', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  expect(c).toBeInstanceOf(ReaQtaClient)
  expect(c.appId).toBe('1')
  expect(c.appSecret).toBe('x')
})

test('ReaQtaClient makes secure requests by default (`config.insecure` is treated as `false`)', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  expect(c).toBeInstanceOf(ReaQtaClient)
  expect(https.Agent).toHaveBeenCalledTimes(0)
})

test('ReaQtaClient handles `insecure = true` config option', () => {
  const fakeAgent = { test: 'lalala' }
  https.Agent.mockImplementationOnce(() => fakeAgent)
  const c = new ReaQtaClient({ insecure: true, baseUrl: 'w', appId: '1', appSecret: 'x' })
  expect(c).toBeInstanceOf(ReaQtaClient)
  expect(https.Agent).toHaveBeenCalledTimes(1)
  expect(https.Agent).toHaveBeenCalledWith({ rejectUnauthorized: false })
  expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({ httpsAgent: fakeAgent }))
})

test('ReaQtaClient does not initialize with jwt info', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  expect(c._jwt).toBeNull()
  expect(c._jwtExpiresAtMS).toBeNull()
})

test('ReaQtaClient._wrapResponse returns an instance of ReaQtaResponse', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const wr = c._wrapResponse({})
  expect(wr).toBeInstanceOf(ReaQtaResponse)
})

test('ReaQtaClient._wrapError rejects with an instance of ReaQtaRequestError', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const weP = c._wrapError(null)
  return expect(weP).rejects.toThrow(ReaQtaRequestError)
})

test('ReaQtaClient adds _wrapResponse and _wrapError as interceptors on http client', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  expect(useResInterceptorsMock).toHaveBeenCalledTimes(1)
  expect(useResInterceptorsMock).toHaveBeenCalledWith(c._wrapResponse, c._wrapError)
})

test('ReaQtaClient updates jwt info with result from signAndExecuteRequest after an authenticated request', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const updatedToken = {
    jwt: 'haha',
    expiresAtMS: 123
  }
  expect(c._jwt).not.toEqual(updatedToken.jwt)
  expect(c._jwtExpiresAtMS).not.toEqual(updatedToken.expiresAtMS)
  mockExecuteRequest.mockReturnValueOnce(Promise.resolve([{}, updatedToken]))
  return c._signAndExecuteRequest('/url').then(() => {
    expect(c._jwt).toEqual(updatedToken.jwt)
    expect(c._jwtExpiresAtMS).toEqual(updatedToken.expiresAtMS)
  })
})

// ============================= //
// === Resource method tests ===
// ============================= //

function testSearch({ name, url }) {
  test(`ReaQtaClient.${name} calls signAndExecuteRequest with correct arguments: no search parameters`, () => {
    const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
    const tokenOptions = c.getTokenOptions()
    return c[name]().then(_ => {
      expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
      expect(mockExecuteRequest).toHaveBeenCalledWith(
        c.client,
        url,
        tokenOptions,
        { params: {} }
      )
    })
  })

  test(`ReaQtaClient.${name} calls signAndExecuteRequest with correct arguments: with search parameters`, () => {
    const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
    const tokenOptions = c.getTokenOptions()
    const searchParams = { q1: 'foo', q2: 'bar' }
    return c[name](searchParams).then(_ => {
      expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
      expect(mockExecuteRequest).toHaveBeenCalledWith(
        c.client,
        url,
        tokenOptions,
        { params: searchParams }
      )
    })
  })
}

/**
 * Helper to test a simple GET request for a single resource
 *
 * The `args` param takes precedence over id
 * If `args` is not specified...
 *
 * @param {Object} options
 * @param {string} options.name - The name of the ReaQtaClient method
 * @param {string} options.url - The expected URL that should be used for this resource
 * @param {array<*>} [options.args] - The arguments to pass to the ReaQtaClient method (these are ...)
 * @param {string} [options.id] - The id of the resource (first and only arg passed to the ReaQtaClient method)
 * @param {string} [options.requestOptions = {}] - The expected request options
 */
function testSimpleReq({ name, url, id, args, requestOptions = {} }) {
  test(`ReaQtaClient.${name} calls signAndExecuteRequest with correct arguments`, () => {
    const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
    const tokenOptions = c.getTokenOptions()
    args = args || [id]
    return c[name](...args).then(_ => {
      expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
      expect(mockExecuteRequest).toHaveBeenCalledWith(
        c.client,
        url,
        tokenOptions,
        requestOptions
      )
    })
  })
}

testSearch({ name: 'searchEndpoints', url: '/1/endpoints' })

testSimpleReq({ name: 'getEndpoint', id: 'abc123', url: '/1/endpoint/abc123' })

testSimpleReq({ name: 'getEndpointProcesses', id: 'abc123', url: '/1/endpoint/abc123/processes' })

testSimpleReq({
  name: 'killEndpointProcesses',
  args: ['abc123', ['a', 'b', 'c']],
  url: '/1/endpoint/abc123/processes/kill',
  requestOptions: { method: 'post', body: ['a', 'b', 'c'] }
})

test('ReaQtaClient.isolateEndpoint calls signAndExecuteRequest with correct arguments', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const id = '123'
  return c.isolateEndpoint(id).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      `/1/endpoint/${id}/isolate`,
      tokenOptions,
      { method: 'post' }
    )
  })
})

test('ReaQtaClient.requestFile calls signAndExecuteRequest with correct arguments', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const id = '123'
  const path = '/path/to/file'
  return c.requestFile(id, { path }).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      `/1/endpoint/${id}/request-file`,
      tokenOptions,
      { method: 'post', body: { path } }
    )
  })
})

testSimpleReq({ name: 'getFileStatus', id: 'abc123', url: '/1/endpoint-file/abc123/status' })

test('ReaQtaClient.downloadFile rejects before executing request when `output` dir does not exist', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const downloadId = '123'
  const filename = 'stuff.exe'
  const output = './path/to/dir'
  fs.existsSync.mockReturnValueOnce(false)
  expect.assertions(2)
  return c.downloadFile(downloadId, { output, filename }).catch(err => {
    expect(err).toBeInstanceOf(Error)
    expect(mockExecuteRequest).toHaveBeenCalledTimes(0)
  })
})

test('ReaQtaClient.downloadFile uses result from getFilenameFromHeaders to create writable stream when `filename` option is not specified and output is not a writable stream', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const downloadId = '123'
  const output = './path/to/dir'
  const headers = { test: 'hi' }
  const readStream = 'lalala'
  mockExecuteRequest.mockReturnValueOnce(Promise.resolve([
    { getHeaders: () => headers, data: readStream },
    {}
  ]))
  fs.existsSync.mockReturnValueOnce(true)
  const writeStream = { _write: () => {} }
  fs.createWriteStream.mockReturnValueOnce(writeStream)
  const calculatedFilename = 'file.bin'
  fileUtils.getFilenameFromHeaders.mockReturnValueOnce(calculatedFilename)
  fileUtils.pipeFilePromise.mockReturnValueOnce(Promise.resolve())
  return c.downloadFile(downloadId, { output }).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      `/1/endpoint-file/${downloadId}/download`,
      tokenOptions,
      { stream: true }
    )
    expect(fileUtils.getFilenameFromHeaders).toHaveBeenCalledTimes(1)
    expect(fileUtils.getFilenameFromHeaders).toHaveBeenCalledWith(headers)
    expect(fs.createWriteStream).toHaveBeenCalledWith(path.join(output, calculatedFilename))
    expect(fileUtils.pipeFilePromise).toHaveBeenCalledWith(readStream, writeStream)
  })
})

test('ReaQtaClient.downloadFile creates writable stream to `filename` in current dir when `output` option is not specified', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const downloadId = '123'
  const filename = 'stuff.exe'
  const readStream = { youcan: 'readme' }
  mockExecuteRequest.mockReturnValueOnce(Promise.resolve([
    { data: readStream },
    {}
  ]))
  fs.existsSync.mockReturnValueOnce(true)
  const writeStream = { _write: () => {} }
  fs.createWriteStream.mockReturnValueOnce(writeStream)
  fileUtils.getFilenameFromHeaders.mockReturnValueOnce('file.bin')
  fileUtils.pipeFilePromise.mockReturnValueOnce(Promise.resolve())
  return c.downloadFile(downloadId, { filename }).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      `/1/endpoint-file/${downloadId}/download`,
      tokenOptions,
      { stream: true }
    )
    expect(fileUtils.getFilenameFromHeaders).not.toHaveBeenCalled()
    expect(fs.createWriteStream).toHaveBeenCalledTimes(1)
    expect(fs.createWriteStream).toHaveBeenCalledWith(path.join('./', filename))
    expect(fileUtils.pipeFilePromise).toHaveBeenCalledWith(readStream, writeStream)
  })
})

test('ReaQtaClient.downloadFile creates writable stream to `filename` in the directory specified by the `output` option, when `output` is a string', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const downloadId = '123'
  const filename = 'stuff.exe'
  const output = './path/to/dir'
  const readStream = { youcan: 'readme' }
  mockExecuteRequest.mockReturnValueOnce(Promise.resolve([
    { data: readStream },
    {}
  ]))
  fs.existsSync.mockReturnValueOnce(true)
  const writeStream = { _write: () => {} }
  fs.createWriteStream.mockReturnValueOnce(writeStream)
  fileUtils.getFilenameFromHeaders.mockReturnValueOnce('file.bin')
  fileUtils.pipeFilePromise.mockReturnValueOnce(Promise.resolve())
  return c.downloadFile(downloadId, { output, filename }).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      `/1/endpoint-file/${downloadId}/download`,
      tokenOptions,
      { stream: true }
    )
    expect(fileUtils.getFilenameFromHeaders).not.toHaveBeenCalled()
    expect(fs.createWriteStream).toHaveBeenCalledTimes(1)
    expect(fs.createWriteStream).toHaveBeenCalledWith(path.join(output, filename))
    expect(fileUtils.pipeFilePromise).toHaveBeenCalledWith(readStream, writeStream)
  })
})

test('ReaQtaClient.downloadFile pipes response to `output` when `output` is a writeable stream', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const downloadId = '123'
  const output = { _write: () => {}, fake: 'writeablestream' }
  const readStream = { youcan: 'readme' }
  mockExecuteRequest.mockReturnValueOnce(Promise.resolve([
    { data: readStream, getHeaders: () => {} },
    {}
  ]))
  fs.existsSync.mockReturnValueOnce(true)
  fileUtils.getFilenameFromHeaders.mockReturnValueOnce('file.bin')
  fileUtils.pipeFilePromise.mockReturnValueOnce(Promise.resolve())
  return c.downloadFile(downloadId, { output }).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      `/1/endpoint-file/${downloadId}/download`,
      tokenOptions,
      { stream: true }
    )
    expect(fs.createWriteStream).not.toHaveBeenCalled()
    expect(fileUtils.pipeFilePromise).toHaveBeenCalledWith(readStream, output)
  })
})

testSearch({ name: 'searchPolicies', url: '/1/policies' })

testSimpleReq({ name: 'getPolicy', id: 'abc123', url: '/1/policy/abc123' })

function testEnableDisablePolicy(type) {
  const methodName = `${type}Policy`
  const previousVersionId = 'nananananana'
  const groupIds = ['nananananana', '948576934875']

  testSimpleReq({
    name: methodName,
    id: 'abc123',
    url: '/1/policy/abc123/' + type,
    requestOptions: { method: 'post', params: {} }
  })

  testSimpleReq({
    name: methodName,
    args: ['abc123', { previousVersionId }],
    url: '/1/policy/abc123/' + type,
    requestOptions: { method: 'post', params: { previousVersionId } }
  })

  testSimpleReq({
    name: methodName,
    args: ['abc123', { groupIds }],
    url: '/1/policy/abc123/' + type,
    requestOptions: { method: 'post', params: { groupIds } }
  })
}

testEnableDisablePolicy('enable')

testEnableDisablePolicy('disable')

test('ReaQtaClient.createTriggerOnProcessHash calls signAndExecuteRequest with correct arguments', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const options = { title: 'hello' }
  return c.createTriggerOnProcessHash(options).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      '/1/policy/trigger-on-process-hash',
      tokenOptions,
      { method: 'post', body: options }
    )
  })
})

testSearch({ name: 'searchAlerts', url: '/1/alerts' })

testSimpleReq({ name: 'getAlert', id: 'abc123', url: '/1/alert/abc123' })

test('ReaQtaClient.closeAlertAsBenign calls signAndExecuteRequest with correct arguments', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const id = '54321'
  return c.closeAlertAsBenign(id).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      `/1/alert/${id}/close`,
      tokenOptions,
      { method: 'post', params: { malicious: false } }
    )
  })
})

test('ReaQtaClient.closeAlertAsMalicious calls signAndExecuteRequest with correct arguments', () => {
  const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
  const tokenOptions = c.getTokenOptions()
  const id = '54321'
  return c.closeAlertAsMalicious(id).then(_ => {
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      c.client,
      `/1/alert/${id}/close`,
      tokenOptions,
      { method: 'post', params: { malicious: true } }
    )
  })
})

testSearch({ name: 'searchGroups', url: '/1/endpoint-groups' })

testSimpleReq({ name: 'getGroup', id: 'abc123', url: '/1/endpoint-group/abc123' })

testSimpleReq({
  name: 'deleteGroup',
  id: 'abc123',
  url: '/1/endpoint-group/abc123',
  requestOptions: { method: 'delete' }
})

testSimpleReq({
  name: 'addEndpointsToGroup',
  args: ['abc123', [1, 2, 3, 4]],
  url: '/1/endpoint-group/abc123/add-endpoints',
  requestOptions: { method: 'post', body: [1, 2, 3, 4] }
})

testSimpleReq({
  name: 'removeEndpointsFromGroup',
  args: ['abc123', [1, 2, 3, 4]],
  url: '/1/endpoint-group/abc123/remove-endpoints',
  requestOptions: { method: 'post', body: [1, 2, 3, 4] }
})

const fakeGroupDetails = { name: 'Best Group Ever' }
testSimpleReq({
  name: 'createGroup',
  args: [fakeGroupDetails],
  url: '/1/endpoint-group',
  requestOptions: { method: 'post', body: fakeGroupDetails }
})

const fakeLicenseDetails = { counts: 10191919 }
testSimpleReq({
  name: 'updateClientLicense',
  args: ['abc123', fakeLicenseDetails],
  url: '/1/endpoint-group/abc123/license',
  requestOptions: { method: 'post', body: fakeLicenseDetails }
})
