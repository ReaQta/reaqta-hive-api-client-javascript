# ReaQta-Hive API Client (JS)

A JavaScript client for interacting with the ReaQta-Hive API.

## Quick Start

Create an Application in your dashboard, and record its ID and Secret. You will need these to authenticate against the api.

Copy the `.env.example` file in the project root, like so:
```sh
$ cp .env.example .env
```

Then add your Application Id, Application Secret, and API url (including the base path to the api routes) to the `.env` file, like so:

```sh
REAQTA_API_URL="https://my-dashboard.secure.org:14643/path/to/api"
REAQTA_API_APP_ID="19189d32-af70-45c3-bbce-a1c2d27ddc74"
REAQTA_API_SECRET_KEY="trustno1"
```

Afterwards, you can modify and run the scripts available in the `recipes` folder. E.g.,

```sh
$ node recipes/alerts-polling
```

## Useful Notes

### Authentication

The ReaQta-Hive Api uses JSON Web Tokens to authenticate. The API client handles generating and refreshing these tokens automatically.

### Eventual Consistency

The ReaQta-Hive backend is eventually consistent. What this means in practice is that the resources you create might not be *immediately* available for retrieval. (They will likely show up after a couple hundred milliseconds.)

Some workflows may require you to create a new resource, and then immediately update some of its properties. You will want to incorporate retry logic whenever you retrieve a newly created resource, in the event that the first few requests for the resource return 404s.

### Endpoint Isolation

Isolating non-Windows endpoints does not work with the current version of the API. Your request will timeout, and you will receive a 504.
