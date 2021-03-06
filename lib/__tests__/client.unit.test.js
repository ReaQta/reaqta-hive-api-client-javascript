const fs = require('fs')
const path = require('path')
const https = require('https')
const axios = require('axios')
const auth = require('../authentication')
const { ReaQtaResponse } = require('../response')
const { ReaQtaRequestError } = require('../errors')
const fileUtils = require('../file-utils')

const { ReaQtaClient } = require('../client')

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
    jwtExpiresAtMS: 123
  }
  expect(c._jwt).not.toEqual(updatedToken.jwt)
  expect(c._jwtExpiresAtMS).not.toEqual(updatedToken.jwtExpiresAtMS)
  mockExecuteRequest.mockReturnValueOnce(Promise.resolve([{}, updatedToken]))
  return c._signAndExecuteRequest('/url').then(() => {
    expect(c._jwt).toEqual(updatedToken.jwt)
    expect(c._jwtExpiresAtMS).toEqual(updatedToken.jwtExpiresAtMS)
  })
})

// ============================= //
// === Resource method tests ===
// ============================= //

/**
 * Helper to test a request for a single resource.
 *
 * The `args` param takes precedence over `id.
 * If `args` is not specified, `id` is passed as the first argument to the api method.
 *
 * @param {Object} options
 * @param {string} options.name - The name of the ReaQtaClient method
 * @param {string} options.url - The expected URL that should be used for this resource
 * @param {array<*>} [options.args] - The arguments to pass to the ReaQtaClient method (these are ...)
 * @param {string} [options.id] - The id of the resource (first and only arg passed to the ReaQtaClient method)
 * @param {string} [options.requestOptions = {}] - The expected request options
 */
function testSimpleReq({ name, url, id, args, requestOptions = {} }) {
  test(`ReaQtaClient.${name} calls signAndExecuteRequest with correct arguments, and returns result of promise`, () => {
    const c = new ReaQtaClient({ baseUrl: 'w', appId: '1', appSecret: 'x' })
    const tokenOptions = c.getTokenOptions()
    args = args || [id]

    const expectedRes = 'foo'
    mockExecuteRequest.mockReturnValueOnce(Promise.resolve([expectedRes, {}]))
    return c[name](...args).then(res => {
      expect(mockExecuteRequest).toHaveBeenCalledTimes(1)
      expect(mockExecuteRequest).toHaveBeenCalledWith(
        c.client,
        url,
        tokenOptions,
        requestOptions
      )
      expect(res).toEqual(expectedRes)
    })
  })
}

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

testSearch({ name: 'searchEndpoints', url: '/1/endpoints' })

testSimpleReq({ name: 'getEndpoint', id: 'abc123', url: '/1/endpoint/abc123' })

testSimpleReq({ name: 'getEndpointProcesses', id: 'abc123', url: '/1/endpoint/abc123/processes' })

testSimpleReq({
  name: 'killEndpointProcesses',
  args: ['abc123', [{ pid: 123, startTime: 456 }, { pid: 789, startTime: 123 }]],
  url: '/1/endpoint/abc123/processes/kill',
  requestOptions: { method: 'post', body: [{ pid: 123, startTime: 456 }, { pid: 789, startTime: 123 }] }
})

testSimpleReq({
  name: 'isolateEndpoint',
  id: 'abc123',
  url: '/1/endpoint/abc123/isolate',
  requestOptions: { method: 'post' }
})

testSimpleReq({
  name: 'requestFile',
  args: ['abc123', { path: '/path/to/file' }],
  url: '/1/endpoint/abc123/request-file',
  requestOptions: { method: 'post', body: { path: '/path/to/file' } }
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

const triggerOnPolicyHashDetails = { title: 'hello' }
testSimpleReq({
  name: 'createTriggerOnProcessHash',
  args: [triggerOnPolicyHashDetails],
  url: '/1/policy/trigger-on-process-hash',
  requestOptions: { method: 'post', body: triggerOnPolicyHashDetails }
})

testSearch({ name: 'searchAlerts', url: '/1/alerts' })

testSimpleReq({ name: 'getAlert', id: 'abc123', url: '/1/alert/abc123' })

testSimpleReq({
  name: 'closeAlertAsBenign',
  id: 'abc123',
  url: '/1/alert/abc123/close',
  requestOptions: { method: 'post', params: { malicious: false } }
})

testSimpleReq({
  name: 'closeAlertAsMalicious',
  id: 'abc123',
  url: '/1/alert/abc123/close',
  requestOptions: { method: 'post', params: { malicious: true } }
})

testSimpleReq({
  name: 'addTagToAlert',
  id: 'abc123',
  args: ['abc123', 'test tag'],
  url: '/1/alert/abc123/tags/test%20tag',
  requestOptions: { method: 'post' }
})

testSimpleReq({
  name: 'removeTagFromAlert',
  id: 'abc123',
  args: ['abc123', 'test tag'],
  url: '/1/alert/abc123/tag/test%20tag',
  requestOptions: { method: 'delete' }
})

testSimpleReq({
  name: 'addNotesToAlert',
  id: 'abc123',
  args: ['abc123', 'note'],
  url: '/1/alert/abc123/notes',
  requestOptions: { method: 'put', body: { notes: 'note' } }
})

testSearch({ name: 'searchGroups', url: '/1/endpoint-groups' })

testSimpleReq({ name: 'getGroup', id: 'abc123', url: '/1/endpoint-group/abc123' })

testSimpleReq({
  name: 'deleteGroup',
  id: 'abc123',
  url: '/1/endpoint-group/abc123',
  requestOptions: { method: 'delete' }
})

const endpointGroupIds = [1, 2, 3, 4]
testSimpleReq({
  name: 'addEndpointsToGroup',
  args: ['abc123', endpointGroupIds],
  url: '/1/endpoint-group/abc123/add-endpoints',
  requestOptions: { method: 'post', body: endpointGroupIds }
})

testSimpleReq({
  name: 'removeEndpointsFromGroup',
  args: ['abc123', endpointGroupIds],
  url: '/1/endpoint-group/abc123/remove-endpoints',
  requestOptions: { method: 'post', body: endpointGroupIds }
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
