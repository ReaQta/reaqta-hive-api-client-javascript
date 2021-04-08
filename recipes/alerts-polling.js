/* eslint-disable no-console, comma-dangle */

/**
 * @file An example implementation of a script that polls ReaQta-Hive Api for newly seen alerts
 */

require('dotenv').config()
require('colors')
const fs = require('fs')
const ReaqtaClient = require('../lib')
const { collectPageResults } = require('../lib/pagination')

const LAST_SEEN_ALERT_ID_FILENAME = '.lastSeenAlertId'
/**
 * An interface to persist the last observed alertId beyond the lifecycle of this script.
 * (This implementation saves the last seen alert id to a local file.)
 */
class LastSeenDatabase {
  constructor(filename = LAST_SEEN_ALERT_ID_FILENAME) {
    this._filename = filename
    this.createFileIfNotExistsSync()
  }

  createFileIfNotExistsSync() {
    const exists = fs.existsSync(this._filename)
    if (!exists) {
      fs.writeFileSync(this._filename, '')
    }
  }

  getLastSeenAlertId() {
    return new Promise((resolve, reject) => {
      try {
        this.createFileIfNotExistsSync()
        fs.readFile(this._filename, (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data.toString())
          }
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  updateLastSeenAlertId(alertId) {
    console.debug('Saving last seen id:', alertId)
    return new Promise((resolve, reject) => {
      fs.writeFile(this._filename, alertId, { flag: 'w' }, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

/**
 * Create an interface to poll the alerts search API
 */
class AlertPoller {
  constructor(db, apiClient, newAlertsHandler) {
    this.db = db
    this.client = apiClient
    this.newAlertsHandler = newAlertsHandler
    this._intervalId = null
  }

  start(intervalMS) {
    this._intervalId = setInterval(this.poll.bind(this), intervalMS)
    this.poll()
    return this
  }

  cancel() {
    clearInterval(this._intervalId)
    return this
  }

  poll() {
    return this.db.getLastSeenAlertId().then(alertId => {
      if (alertId) {
        return this.onPoll(alertId)
      }
      return this.onFirstPoll()
    })
  }

  onFirstPoll() {
    return this.client.searchAlerts({ count: 1 })
      .then(res => res.data.result)
      // NOTE: Default sort is id descending for a sort without lastSeenId parameter
      .then(alerts => alerts && alerts.length && alerts[0])
      .then(alert => {
        const lastSeen = alert && alert.id
        if (lastSeen) {
          console.debug('Initializing with lastSeenId:', lastSeen)
          return this.db.updateLastSeenAlertId(lastSeen).then(() => {
            this.newAlertsHandler([alert])
          })
        }
        console.debug('No alerts available')
      })
  }

  onPoll(alertId) {
    return this.getAllAlertsSince(alertId).then(res => {
      const alerts = res.data
      if (alerts && alerts.length) {
        // NOTE: Default sort is id (ascending) for a sort with lastSeenId parameter
        //       So, we have to take the last item in our list of alerts
        const lastSeen = alerts[alerts.length - 1].id
        return this.db.updateLastSeenAlertId(lastSeen)
          .then(() => this.newAlertsHandler(alerts))
      }
      console.debug('No new alerts')
      return alerts
    })
  }

  getAllAlertsSince(lastSeenId) {
    const collectAllPages = collectPageResults([])
    return this.client.searchAlerts({ lastSeenId }).then(collectAllPages)
  }
}

// === polling script === //
//
// Interval polling works by keeping track of the last seen alert's id
// and using that as a search parameter with the searchAlerts API
//

const reaqtaClient = new ReaqtaClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: process.env.REAQTA_API_APP_ID,
  appSecret: process.env.REAQTA_API_SECRET_KEY,
  insecure: !!process.env.REAQTA_API_INSECURE
})
// Create a way to persist the last seen alert
const lastSeenDb = new LastSeenDatabase()
// NOTE: Replace this `handleNewAlerts` callback with whatever logic you would like to apply to newly seen alerts
const handleNewAlerts = (alerts) => {
  const alertsCount = alerts && alerts.length ? alerts.length : 0
  console.debug(`Observed ${alertsCount} new alerts!`)
}
// Instantiate the poller
const poller = new AlertPoller(lastSeenDb, reaqtaClient, handleNewAlerts)
// Start polling the ReaQta-Hive API every minute to check for new alerts
const ONE_MINUTE = 60000
poller.start(ONE_MINUTE)
