/* eslint-disable no-console, comma-dangle */

/**
 * @file A script that iterates through all event types,
 *       and builds a directory containing one file for each event type present on the installation,
 *       where the file contains a JSON sample of the most recent events of that type
 */

require('dotenv').config()
require('colors')
const fs = require('fs')
const path = require('path')
const ReaqtaClient = require('../lib')

const reaqtaClient = new ReaqtaClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: process.env.REAQTA_API_APP_ID,
  appSecret: process.env.REAQTA_API_SECRET_KEY,
  insecure: !!process.env.REAQTA_API_INSECURE
})

const OUTPUT_DIR = 'samples'

// NOTE - At the time of writing, ReaQta-Hive has 92 events, numbered from 0 to 91
const EVENT_TYPES = Array.from({ length: 92 }).map((_, i) => i)

sampleEventTypes(EVENT_TYPES).then(writeSamplesDir)

/**
 * Given an array of (numeric) eventTypes,
 * returns an object whose keys are the numeric event types,
 * and whose values are the results of hunting that specific event
 */
function sampleEventTypes(eventTypes) {
  return eventTypes.reduce((promiseChain, eventType) => {
    return promiseChain.then(samples => {
      return reaqtaClient.huntEvents('eventType = ' + eventType).then(r => r.data.result).then(events => {
        samples[eventType] = events
        return samples
      }, err => {
        samples[eventType] = err
        return samples
      })
    })
  }, Promise.resolve({}))
}

/**
 * Given an object that maps event types to arrays of events,
 * creates a directory called `samples` and creates a file in that dir
 * for each event type that has an associated nonempty array of events
 */
function writeSamplesDir(eventSamples) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR)
  }
  Object.entries(eventSamples).forEach(([eventType, events]) => {
    if (events.length) {
      const filename = `event-${eventType.toString().padStart(2, '0')}.json`
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(events, null, 2))
    }
  })
}
