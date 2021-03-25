/* eslint-disable no-console, comma-dangle */

require('colors')
const ReaQtaClient = require('../../client')

const client = new ReaQtaClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: 666,
  appSecret: '3'
})

test.skip('bad credentials return a 401 with auth failed message', () => {
  const authP = client.authenticate().catch(err => {
    expect(err.response).toMatchObject({ response: { status: 401, data: { message: 'Authentication failed' } } })
    throw err
  })
  return expect(authP).rejects.toThrow()
})
