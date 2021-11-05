/* eslint-disable no-console, comma-dangle */

/**
 * @file An example of how to hunt events that are associated with alerts, and find their associated alerts.
 */

require('dotenv').config()
require('colors')
const ReaqtaClient = require('../lib')

const reaqtaClient = new ReaqtaClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: process.env.REAQTA_API_APP_ID,
  appSecret: process.env.REAQTA_API_SECRET_KEY,
  insecure: !!process.env.REAQTA_API_INSECURE
})

reaqtaClient.huntEvents('hasAlert = true').then(r => {
  const events = r.data.result
  return Promise.all(events.map(event => {
    const alertLocalId = event.payload.triggeredIncidents[0] || event.payload.incidents[0]
    const { endpointId } = event
    return reaqtaClient.getAlertByLocalId({
      localId: alertLocalId,
      endpointId
    })
  }))
})
