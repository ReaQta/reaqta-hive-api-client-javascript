/* eslint-disable no-console */
require('colors')
const fs = require('fs')
const repl = require('repl')

const { ReaQtaClient } = require('./lib/client')
const { retry } = require('./lib/retry')
const { collectPageResults } = require('./lib/pagination')

const SUNFLOWER = '\u{1F33B}'

// NOTE: The context is what's loaded into the repl as global vars
const replContext = {
  ReaQtaClient,
  retry,
  collectPageResults
}

function instantiateClientFromEnv() {
  const appId = process.env.REAQTA_API_APP_ID
  const appSecret = process.env.REAQTA_API_SECRET_KEY
  const baseUrl = process.env.REAQTA_API_URL

  const requiredConfigVars = [appId, appSecret, baseUrl]
  const canConfigure = requiredConfigVars.every(v => !!v)

  if (canConfigure) {
    const insecure = !!process.env.REAQTA_API_INSECURE
    const client = new ReaQtaClient({
      appId,
      appSecret,
      baseUrl,
      insecure
    })
    return client
  }
  return null
}

/**
 * Helps set the repl prompt to `rqt-api >`
 */
function getPrompt() {
  const prompt = `${SUNFLOWER} rqt-api `.grey + '> '
  return prompt
}

const HISTORY_FILE = '.repl_history'
const MAX_REPL_HISTORY = 1000
function saveHistory(ourReplServer) {
  const commands = ourReplServer.lines.filter(i => i && i !== '\n')
  if (commands.length) {
    commands.push('\n')
    const history = commands.join('\n')
    fs.appendFileSync(HISTORY_FILE, history)
  }
}

/**
 * Sets up the REPL.
 * - Loads history file into replServer, if it exists
 * - Informs user of custom commands
 * - Instantiates an api client, if env vars are defined
 * - Sets the repl prompt
 */
function setupReplEnvironment(ourReplServer) {
  // Try loading history file
  try {
    fs.statSync(HISTORY_FILE)
    fs
      .readFileSync(HISTORY_FILE)
      .toString()
      .split('\n')
      .reverse()
      .filter(line => line.trim())
      .slice(0, MAX_REPL_HISTORY)
      .map(line => ourReplServer.history.push(line))

    ourReplServer.write(`\u25E6 Loaded REPL history from ${HISTORY_FILE.bold}`.green)
  } catch (e) {
    ourReplServer.write('\u25E6 No repl history found.'.yellow.italic)
  }

  if (fs.existsSync('.env')) {
    require('dotenv').config()
    replServer.write('', { ctrl: true, name: 'c' })
    replServer.write('\u25E6 Loaded .env file'.green)
  }

  // HACK: Use control-c to create linebreaks
  replServer.write('', { ctrl: true, name: 'c' })
  replServer.write('\u25E6 Type `.reaqta-help` to list predefined vars.'.magenta)
  // replServer.write('', { ctrl: true, name: 'c' })
  // replServer.write('\u25E6 Type `.reaqta-env` to load a custom .env file.')
  replServer.write('', { ctrl: true, name: 'c' })
  replServer.write('\u25E6 Type `.help` for a list of other useful commands.')

  const client = instantiateClientFromEnv()
  if (client) {
    replContext.client = client
    replServer.write('', { ctrl: true, name: 'c' })
    replServer.write('\u2661 Automatically instantiated an API client as variable `client`'.blue)
  }

  replServer.setPrompt(getPrompt())
  replServer.write('', { ctrl: true, name: 'c' })
}

const replServer = repl.start({
  prompt: '', // NOTE: Start with an empty prompt because we set the prompt after loading the repl history
  useColors: true
})

setupReplEnvironment(replServer)

replServer.once('exit', () => {
  saveHistory(replServer)
  process.exit(0)
})

Object.assign(replServer.context, replContext)

const replDocumentation = {
  ReaQtaClient: 'Instantiates a new instance of an API client',
  retry: 'Helper for retrying requests',
  collectPageResults: 'Helper for greedily paginating API responses'
}

const printDocString = (name, padToLength = 1) => {
  const docString = replDocumentation[name]
  if (docString) {
    console.log(`${name.padEnd(padToLength).yellow.bold}  ${docString}`)
  } else {
    console.error(`Variable ${name.bold} not found`.red)
  }
}

replServer.defineCommand('reaqta-help', {
  help: 'List predefined variables in the repl',
  action(name) {
    this.clearBufferedCommand()
    console.log()
    if (name) {
      printDocString(name)
    } else {
      const allVars = Object.keys(replDocumentation)
      const maxNameLength = allVars.reduce((cMax, cName) => cName.length > cMax ? cName.length : cMax, 0)
      allVars.forEach(varName => printDocString(varName, maxNameLength))
    }
    console.log()
    this.displayPrompt()
  }
})

replServer.defineCommand('reaqta-env', {
  help: 'Load environment variables from file (defaults to using .env in current directory)',
  action(rawPath) {
    let path = rawPath
    if (path && path.trim) {
      path = path.trim()
    }
    this.clearBufferedCommand()
    require('dotenv').config(path && { path })
    const msgSuffx = `from ${path || '.env'}`
    const msg = `Configured environment variables ${msgSuffx}`
    console.log(msg.green)
    this.displayPrompt()
  }
})
