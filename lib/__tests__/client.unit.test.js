const ReaQtaClient = require('../client')

test('ReaQtaClient initializes with correct app id and secret', () => {
  const c = new ReaQtaClient({
    baseUrl: 'http://localhost:8080',
    appId: '1',
    appSecret: 'x'
  })
  expect(c).toBeInstanceOf(ReaQtaClient)
  expect(c.appId).toBe('1')
  expect(c.appSecret).toBe('x')
})
