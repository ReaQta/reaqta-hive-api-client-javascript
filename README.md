<h1 class="h1-readme">ReaQta-Hive API Client (JS)</h1>

A JavaScript client for interacting with the ReaQta-Hive API.

## Quick Start

Create an Application in your dashboard, and record its Id and Secret. You will need these to authenticate against the api.

Copy the `.env.example` file in the project root, like so:
```sh
$ cp .env.example .env
```

Then, add your Application Id, Application Secret, and API url (*including the base path to the api routes!*) to the `.env` file, like so:

```sh
REAQTA_API_URL="https://my-dashboard.secure.org:14643/rqt-api"
REAQTA_API_APP_ID="19189d32-af70-45c3-bbce-a1c2d27ddc74"
REAQTA_API_SECRET_KEY="trustno1"
```

Afterwards, you can modify and run the scripts available in the `recipes` folder. E.g.,

```sh
$ node recipes/alerts-polling
```

Once you configure your `.env` file, an API client will be automatically created for you in the reply. (See: **REPL**, below)

## Documentation

Comprehensive API documentation for expected response data, as well as API search parameters, can be found on your ReaQta-Hive installation.

Documentation for this API client exists in the `docs` folder. You can serve the documentation locally by running:

```sh
# Install dependencies
$ npm install # or: `yarn`
# Generate docs
$ npm run docs # or: `yarn docs`
# Serve the docs locally
$ npm run docs:serve # or: `yarn docs:serve`
```

The docs will then be reachable at [http://localhost:61108]()

## REPL

This repository includes a basic REPL to play with the API client.

To start the repl:

1. Install dependencies (`npm install`)
2. Configure your `.env` file
3. Run the repl script (`npm run repl`)

If you have defined the necessary environment variables in your `.env` file, the repl will automatically instantiate an API client for you under the variable `client`.

## Usage Notes

Before using the api, it's good to know a few of its characteristics.

### Eventual Consistency

The ReaQta-Hive backend is eventually consistent. What this means in practice is that the resources you create might not be *immediately* available for retrieval. (They will likely show up after a couple hundred milliseconds.)

Some workflows may require you to create a new resource, and then directly update its properties. In this scenario, you will want to add retries when you retrieve a newly created resource, in the event that the first few requests for the resource return a 404.

### Authentication

The ReaQta-Hive API uses JSON Web Tokens (JWTs) to authenticate. As of writing, JWTs issued by the Api are typically valid for 15minutes.

The API client handles generating and refreshing these tokens automatically, so it is only necessary to provide your application's id and secret when you instantiate the client.

If you're interested in building your own api client, in javascript or any other language, feel free to look at the code in `lib/authentication` as an implementation reference.

### Endpoint Isolation

Isolating non-Windows endpoints does not work with the current version of the API. Your request will timeout, and you will receive a 504.
