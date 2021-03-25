const fs = require('fs')
const path = require('path')
const https = require('https')
const qs = require('qs')
const axios = require('axios')

const { POST, DELETE } = require('./methods')
const { signAndExecuteRequest } = require('./authentication')
const ReaQtaResponse = require('./response')
const { pipeFilePromise, getFilenameFromHeaders } = require('./file-utils')

/**
 * A configuration object for {@link ReaQtaClient}
 *
 * @typedef {Object} ApiConfig
 * @property {string} appId - The id for your external application
 * @property {string} appSecret - The secret key for your external application
 * @property {number} baseUrl - The url, including path prefix, to your ReaQta-Hive Api
 * @property {number} timeout - Time (in ms) to wait before automatic timeout
 * @property {boolean} insecure - If true, ignore SSL verification errors (useful for self-signed certs)
 */

/**
 * @class ReaQtaClient
 *
 * Creates a new api client.
 *
 */
class ReaQtaClient {
  /**
   * @param {ApiConfig} config - The configuration object for the api client
   */
  constructor(config) {
    /**
     * The id of the external application.
     * @member {string} ReaQtaClient#appId
     * @ignore
     */
    this.appId = config.appId
    /**
     * The secret key for the external application.
     * @member {string} ReaQtaClient#appSecret
     * @ignore
     */
    this.appSecret = config.appSecret

    // NOTE: This ignores security errors from self-signed certificates, when `insecure === true`
    let httpsAgent
    if (config.insecure) {
      httpsAgent = new https.Agent({
        rejectUnauthorized: false
      })
    }

    /**
     * The http client used to execute requests against the api.
     * @member {Function} ReaQtaClient#client
     * @ignore
     */
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: { 'Content-Type': 'application/json' },
      paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
      httpsAgent
    })

    this._jwt = null
    this._jwtExpiresAtMS = null

    // Bind `_signAndExecuteRequest` to the instance, so we can pass it as a value
    this._signAndExecuteRequest = this._signAndExecuteRequest.bind(this)
  }

  _signAndExecuteRequest(url, requestOptions = {}) {
    const tokenOptions = {
      appId: this.appId,
      appSecret: this.appSecret,
      jwt: this._jwt,
      expiresAtMS: this._jwtExpiresAtMS
    }
    const doRequest = () => signAndExecuteRequest(this.client, url, tokenOptions, requestOptions)
    const handleResult = ([res, tokenOptions]) => {
      this._jwt = tokenOptions.jwt
      this._jwtExpiresAtMS = tokenOptions.expiresAtMS
      return new ReaQtaResponse(res, this._signAndExecuteRequest)
    }
    // TODO: Implement retries
    const requestP = doRequest()
    return requestP.then(handleResult)
  }

  /**
   * Search endpoints by various search criteria.
   * @param {Object} params - Search criteria (consult external api documentation)
   * @return {Promise<ReaQtaResponse>}
   */
  searchEndpoints(params = {}) {
    return this._signAndExecuteRequest(
      '/1/endpoints',
      { params }
    )
  }

  /**
   * Get the details of a single endpoint.
   * @param {string} id - The id of the endpoint
   * @return {Promise<ReaQtaResponse>}
   */
  getEndpoint(id) {
    return this._signAndExecuteRequest(
      `/1/endpoint/${id}`
    )
  }

  /**
   * List the running processes on an endpoint.
   * @param {string} id - The id of the endpoint
   * @return {Promise<ReaQtaResponse>}
   */
  getEndpointProcesses(id) {
    return this._signAndExecuteRequest(
      `/1/endpoint/${id}/processes`
    )
  }

  /**
   * A description of a running process that you wish to kill
   * @typedef {{ pid: number, startTime: number }} ProcessToKill
   */

  /**
   * List kill a set of running processes on an endpoint.
   * @param {string} id - The id of the endpoint
   * @param {ProcessToKill[]} procs - The list of processes to kill
   * @return {Promise<ReaQtaResponse>}
   */
  killEndpointProcesses(id, procs) {
    return this._signAndExecuteRequest(
      `/1/endpoint/${id}/processes/kill`,
      {
        method: POST,
        body: procs
      }
    )
  }

  /**
   * Isolate an endpoint. (As of v3.5.0, this is only supported on Windows machines.)
   * @param {string} id - The id of the endpoint
   * @return {Promise<ReaQtaResponse>}
   */
  isolateEndpoint(id) {
    return this._signAndExecuteRequest(
      `/1/endpoint/${id}/isolate`
    )
  }

  /**
   * Request a file from an endpoint.
   * The result payload will have a key, `uploadId`, which can be used with the {ReaQtaClient.getFileStatus} api
   * @see {@link ReaQtaClient.getFileStatus}
   *
   * @param {string} id - The id of the endpoint
   * @param {{ path: string }} options  - Object containing the path to the file on the endpoint
   * @return {Promise<ReaQtaResponse>}
   */
  requestFile(id, options) {
    const { path } = options
    return this._signAndExecuteRequest(
      `/1/endpoint/${id}/request-file`,
      {
        method: POST,
        body: { path }
      }
    )
  }

  /**
   * Check whether a requested file is available for download.
   * @see {@link ReaQtaClient.requestFile}
   * @param {string} uploadId - The id that tracks the upload status of the file
   * @return {Promise<ReaQtaResponse>}
   */
  getFileStatus(uploadId) {
    return this._signAndExecuteRequest(
      `/1/endpoint-file/${uploadId}/status`
    )
  }

  /**
   * Initiate a streaming file download.
   * @see {@link ReaQtaClient.getFileStatus}
   * @param {string} downloadId - The id of the file to download (obtained from {ReaQtaClient.getFileStatus} api)
   * @param {string} [directory='./downloads'] - The directory into which to download the file
   * @return {Promise<ReaQtaResponse>}
   */
  downloadFile(downloadId, directory = './downloads') {
    return this._signAndExecuteRequest(
      `/1/endpoint-file/${downloadId}/download`,
      { stream: true }
    ).then(res => {
      // NOTE: The name of the file is contained in the `content-disposition` header
      //       > E.g.: `Content-Disposition: filename="explorer.exe"`
      //       Here, we parse that header to find the filename
      const filename = getFilenameFromHeaders(res.getHeaders())
      const downloadTo = path.join(directory, filename)

      const fileReadStream = res.data
      const fileWriteStream = fs.createWriteStream(downloadTo)

      return pipeFilePromise(fileReadStream, fileWriteStream)
    })
  }

  /**
   * Search policies by various search criteria.
   * @param {Object} params - Search criteria (consult external api documentation)
   * @return {Promise<ReaQtaResponse>}
   */
  searchPolicies(params = {}) {
    return this._signAndExecuteRequest(
      '/1/policies',
      { params }
    )
  }

  /**
   * Get the details of a single policy.
   * @param {string} id - The id of the policy
   * @return {Promise<ReaQtaResponse>}
   */
  getPolicy(id) {
    return this._signAndExecuteRequest(`/1/policy/${id}`)
  }

  /**
   * Enable a policy.
   * @param {string} id - The id of the policy
   * @param {Object} [options = {}]
   * @param {string} [options.previousVersionId] - The last version id of the policy you're enabling. If present, used for concurrency control.
   * @param {string[]} [options.groupIds] - If updating a group policy, the list of groups that should be enabled
   * @return {Promise<ReaQtaResponse>}
   */
  enablePolicy(id, { previousVersionId, groupIds } = {}) {
    const url = `/1/policy/${id}/enable`
    const opts = {
      method: POST,
      params: {
        ...(previousVersionId && { previousVersionId }),
        ...(groupIds && { groupIds })
      }
    }
    return this._signAndExecuteRequest(url, opts)
  }

  /**
   * Disable a policy.
   * @param {string} id - The id of the policy
   * @param {Object} [options = {}]
   * @param {string} [options.previousVersionId] - The last version id of the policy you're disabling. If present, used for concurrency control.
   * @param {string[]} [options.groupIds] - If updating a group policy, the list of groups that should be disabled
   * @return {Promise<ReaQtaResponse>}
   */
  disablePolicy(id, { previousVersionId, groupIds } = {}) {
    const url = `/1/policy/${id}/disable`
    const opts = {
      method: POST,
      params: {
        ...(previousVersionId && { previousVersionId }),
        ...(groupIds && { groupIds })
      }
    }
    return this._signAndExecuteRequest(url, opts)
  }

  /**
   * Details for the trigger you wish to create.
   *
   * @typedef {Object} TriggerOnProcessHashOptions
   * @property {string} title - The title of the policy
   * @property {string} sha256 - The hash for which you wish to create a trigger
   * @property {string} [description] - The description of the policy
   * @property {boolean} [block=false] - Whether or not to block processes with this hash from running
   * @property {boolean} [disable=false] - Whether or not to disable this policy upon creation
   * @property {string[]} [enabledGroups] - If creating a group policy, list of group ids on which to enable this policy
   * @property {string[]} [disabledGroups] - If creating a group policy, list of group ids on which to disable this policy
   */
  /**
   * Create a blacklist policy for processes with a given sha256 hash.
   *
   * @param {TriggerOnProcessHashOptions} blacklistOptions - The options for the blacklist policy you wish to create
   * @return {Promise<ReaQtaResponse>}
   */
  createTriggerOnProcessHash(blacklistOptions) {
    return this._signAndExecuteRequest(
      '/1/policy/trigger-on-process-hash',
      {
        method: POST,
        body: blacklistOptions
      }
    )
  }

  /**
   * Search alerts by various search criteria.
   * @param {Object} params - Search criteria (consult external api documentation)
   * @return {Promise<ReaQtaResponse>}
   */
  searchAlerts(params = {}) {
    return this._signAndExecuteRequest(
      '/1/alerts',
      { params }
    )
  }

  /**
   * Get the details of a single alert.
   * @param {string} id - The id of the alert
   * @return {Promise<ReaQtaResponse>}
   */
  getAlert(id) {
    return this._signAndExecuteRequest(
      `/1/alert/${id}`
    )
  }

  /**
   * Close an alert as a false positive
   * @param {string} id - The id of the alert
   * @return {Promise<ReaQtaResponse>}
   */
  closeAlertAsBenign(id) {
    return this._signAndExecuteRequest(
      `/1/alert/${id}/close`,
      {
        method: POST,
        params: { malicious: false }
      }
    )
  }

  /**
   * Close an alert as a true positive
   * @param {string} id - The id of the alert
   * @return {Promise<ReaQtaResponse>}
   */
  closeAlertAsMalicious(id) {
    return this._signAndExecuteRequest(
      `/1/alert/${id}/close`,
      {
        method: POST,
        params: { malicious: true }
      }
    )
  }

  /**
   * Search groups by various search criteria.
   * @param {Object} params - Search criteria (consult external api documentation)
   * @return {Promise<ReaQtaResponse>}
   */
  searchGroups(params = {}) {
    return this._signAndExecuteRequest(
      '/1/endpoint-groups',
      { params }
    )
  }

  /**
   * Get the details of a single group.
   * @param {string} id - The id of the group
   * @return {Promise<ReaQtaResponse>}
   */
  getGroup(id) {
    return this._signAndExecuteRequest(
      `/1/endpoint-group/${id}`
    )
  }

  /**
   * Delete a group.
   * @param {string} id - The id of the group
   * @return {Promise<ReaQtaResponse>}
   */
  deleteGroup(id) {
    return this._signAndExecuteRequest(
      `/1/endpoint-group/${id}`,
      { method: DELETE }
    )
  }

  /**
   * Add endpoints to a group
   * @param {string} id - The id of the group
   * @param {string[]} endpointIds - A list of ids of endpoints you wish to add to the group
   * @return {Promise<ReaQtaResponse>}
   */
  addEndpointsToGroup(id, endpointIds) {
    return this._signAndExecuteRequest(
      `/1/endpoint-group/${id}/add-endpoints`,
      { method: POST, body: endpointIds }
    )
  }

  /**
   * Remove endpoints from a group
   * @param {string} id - The id of the group
   * @param {string[]} endpointIds - A list of ids of endpoints you wish to remove from the group
   * @return {Promise<ReaQtaResponse>}
   */
  removeEndpointsFromGroup(id, endpointIds) {
    return this._signAndExecuteRequest(
      `/1/endpoint-group/${id}/remove-endpoints`,
      { method: POST, body: endpointIds }
    )
  }

  /**
   * A valid license for an MSSP client (in MSSP mode)
   * @typedef {Object} ClientLicenseOptions
   * @property {string} expiration - ISO 8601 date string describing when the license expires
   * @property {{ maxMobileEndpointCount: number, maxEndpointCount: number}} limit - An object describing endpoint limits for this license
   */
  /**
   * Details for the group you wish to create
   * @typedef {Object} GroupCreateOptions
   * @property {string} name - The name of the group
   * @property {string} [description] - The description of the group
   * @property {string} [parentGroup] - The id of client to which the group belongs (if adding a group to an MSSP client)
   * @property {ClientLicenseOptions} [license] - The license for this client (if adding an MSSP client)
   */
  /**
   * Create an endpoint group, or MSSP client subgroup
   * @param {GroupCreateOptions} groupDetails - The options for the group you wish to create
   * @return {Promise<ReaQtaResponse>}
   */
  createGroup(groupDetails) {
    return this._signAndExecuteRequest(
      '1/endpoint-group',
      { method: POST, body: groupDetails }
    )
  }

  /**
   * Update the license for a client (in MSSP mode)
   * @param {string} id - The id of the client
   * @param {ClientLicenseOptions} licenseDetails - The new license for this client
   * @return {Promise<ReaQtaResponse>}
   */
  updateClientLicense(id, licenseDetails) {
    return this._signAndExecuteRequest(
      `1/endpoint-group/${id}/license`,
      { method: POST, body: licenseDetails }
    )
  }
}

module.exports = ReaQtaClient
