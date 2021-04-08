The api client is packaged with a "retry" utility function, which you can use implement automatic retries for certain routes.

```js
const ReaqtaClient = require('@reaqta/hive-api')
const { retry } = require('@reaqta/hive-api/lib/retry')

const reaqtaClient = new ReaqtaClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: process.env.REAQTA_API_APP_ID,
  appSecret: process.env.REAQTA_API_SECRET_KEY,
  insecure: !!process.env.REAQTA_API_INSECURE
})

// Wrap the API call you want to make in a function
const endpointId = '987654321'
const executeGetEndpoint = () => reaqtaClient.getEndpoint(endpointId)

// Then, pass your wrapped API call to `retry`
// E.g., Retry the request at most once:
retry(executeGetEndpoint).then(result => {
  console.log('Endpoint:', result.data)
})

// E.g., Retry the request at most two times:
retry(executeGetEndpoint, 2).then(result => {
  console.log('Endpoint:', result.data)
})
```
