/* eslint-disable no-console, comma-dangle */

/**
 * @file An example implementation of a script that test
 * the tag/notes new APIs ReaQta-Hive Api for newly seen alerts
 * 
 * @param {string} type - Tags or notes
 * @param {string} id - The id of the alert
 * @param {string} content - Content of the tag or note
 * @param {string} operation - Only works for tags: add or remove
 * expample:
 *  node alerts-notes-tag.js tag 830059572294057986 newTag add
 *  node alerts-notes-tag.js tag 830059572294057986 newTag remove
 *  node alerts-notes-tag.js tag 830059572294057986 'new Tag' remove
 *  node alerts-notes-tag.js note 830059572294057986 'new note'
 */

require('dotenv').config()
require('colors')
const ReaqtaClient = require('../lib')

const TAG = 'tag'
const NOTE = 'note'
const ADD = 'add'
const REMOVE = 'remove'

const type = process.argv.slice(2)[0]
const id = process.argv.slice(2)[1]
const content = process.argv.slice(2)[2]
const operation = process.argv.slice(2)[3]

const reaqtaClient = new ReaqtaClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: process.env.REAQTA_API_APP_ID,
  appSecret: process.env.REAQTA_API_SECRET_KEY,
  insecure: !!process.env.REAQTA_API_INSECURE
})

console.log(`Alert id ${id}`)
console.log(`Content ${content}`)

if (process.argv.length === 5 && type === NOTE) {
  reaqtaClient.addNotesToAlert(id, content).then(r => {
    console.log(`Success adding note ${content} to alert ${id}`)
  }).catch(err => console.log(`Something went wrong, ${err}`))
}
if (process.argv.length > 5 && type === TAG) {
  if (operation === ADD) {
    console.log(`operation ${operation}`)
    reaqtaClient.addTagToAlert(id, content).then(r => {
      console.log(`Tag ${content} successfully added to alert ${id}`)
    }).catch(err => console.log(`Something went wrong, ${err}`))
  }
  if (operation === REMOVE) {
    console.log(`operation ${operation}`)
    reaqtaClient.removeTagFromAlert(id, content).then(r => {
      console.log(`Tag ${content} successfully removed from alert ${id}`)
    }).catch(err => console.log(`Something went wrong, ${err}`))
  }
}

