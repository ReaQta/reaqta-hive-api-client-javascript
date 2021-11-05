/* eslint-disable no-console, comma-dangle */

/**
 * @file An example of how to hunt for events that are associated with alerts, and find their associated alerts.
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

// NOTE - This does not optimize requests against the API
//        if there are N events with M associated alerts,
//        we'll make N * M requests to the backend
reaqtaClient.huntEvents('hasAlert = true').then(r => r.data).then(async r => {
  const events = r.result

  // Add the property `alerts` to each event,
  // which contains the alert details for all alerts associated with the event
  const fetchEnrichedEvents = events.map(async event => {
    // Get all associated alerts
    // (recall: these are *local* ids of the alerts)
    const alertLocalIds = [
      ...event.payload.triggeredIncidents,
      ...event.payload.incidents
    ].filter(Boolean).filter(uniqFilter)

    const { endpointId } = event

    const fetchAssociatedAlerts = Promise.all(
      alertLocalIds.map(localId =>
        reaqtaClient.getAlertByLocalId({
          localId,
          endpointId
        })
      )
    )

    const alerts = await fetchAssociatedAlerts

    return { ...event, alerts }
  })

  const enrichedEvents = await Promise.all(fetchEnrichedEvents)

  return {
    ...r,
    result: enrichedEvents
  }
})

/**
 * Helper to filter an array so that it only contains unique elements
 */
function uniqFilter(item, index, ary) {
  return index === ary.indexOf(item)
}
