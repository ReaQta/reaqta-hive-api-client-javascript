ReaQta-Hive search APIs return paginated api responses.

If there are additional pages of results for your search query, the response returned by the api client will have a `getNextPage` method.

Unsurprisingly, you can use this method to fetch the next page of results.

```js
const ReaqtaClient = require('@reaqta/hive-api')

const reaqtaClient = new ReaqtaClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: process.env.REAQTA_API_APP_ID,
  appSecret: process.env.REAQTA_API_SECRET_KEY,
  insecure: !!process.env.REAQTA_API_INSECURE
})

reaqtaClient
  .searchEndpoints()
  .then(response => {
    if (response.hasNextPage()) {
      return response.getNextPage()
    }
    return response
  })
```

### Example: Collect all search results

If you would like to paginate through all responses, and collect their results into a single array, there is a helper function to do that:

```js
const ReaqtaClient = require('@reaqta/hive-api')
const { collectPageResults } = require('@reaqta/hive-api/lib/pagination')

const reaqtaClient = new ReaqtaClient({
  baseUrl: process.env.REAQTA_API_URL,
  appId: process.env.REAQTA_API_APP_ID,
  appSecret: process.env.REAQTA_API_SECRET_KEY,
  insecure: !!process.env.REAQTA_API_INSECURE
})

// This promise will return once we've fetched all pages.
// The `data` property of the result will contain an array with all search results.
reaqtaClient
  .searchEndpoints()
  .then(collectPageResults())
  .then(r => console.log('All Endpoints:', r.data))
```
