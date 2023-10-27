#!/usr/bin/env node

import OBSWebSocket from 'obs-websocket-js'
import yargs from 'yargs/yargs'
import JSON5 from 'json5'
import chalk from 'chalk'
import { spawnSync } from 'node:child_process'
import { URL } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const stripHome = (path) => (
  path.replace(new RegExp(`^${os.homedir()}`), '~')
)
const addHome = (path) => (
  path.replace(new RegExp(/^~/), os.homedir())
)

const defaults = {
  recordingOnIcon: (
    stripHome(new URL('recording-on.gif', import.meta.url).pathname)
  ),
  recordingOffIcon: (
    stripHome(new URL('recording-off.gif', import.meta.url).pathname)
  ),
  errorIcon: (
    stripHome(new URL('error-icon.gif', import.meta.url).pathname)
  ),
  recordingButtonPage: null,
  recordingButtonIndex: 9,
  config: path.join('~', '.config', 'stream-deck-obs-button', 'config.json5'),
}

const configArgs = (
  yargs(process.argv.slice(2))
  .option('config', {
    type: 'string',
    default: defaults.config,
    alias: 'c',
  })
  .option('verbose', {
    type: 'boolean',
    default: false,
    alias: 'v',
  })
  .help(false)
)
const configArgv = await configArgs.argv

if(fs.existsSync(addHome(defaults.config))) {
  if(configArgv.verbose) {
    console.debug(
      chalk.cyan('Loading: ')
      + chalk.green(defaults.config)
    )
  }
  const config = (
    fs.readFileSync(addHome(configArgv.config), 'utf-8')
  )
  Object.assign(defaults, JSON5.parse(config))
} else {
  if(configArgv.verbose) {
    console.debug(
      chalk.red('No Config Found: ')
      + chalk.yellow(configArgv.config)
    )
  }
}

process.on('SIGINT', () => { throw new Error('Interrupted') })
process.on('SIGTERM', () => { throw new Error('Terminated') })

const args = (
  yargs(process.argv.slice(2))
  .command('watch', 'Watch for changes in status.')
  .command('rstart', 'Start OBS recording.')
  .command('rstop', 'Stop OBS recording.')
  .command('rtoggle', 'Toggle OBS recording.')
  .command('sstart', 'Start OBS streaming.')
  .command('sstop', 'Stop OBS streaming.')
  .command('stoggle', 'Toggle OBS streaming.')
  .option('recording-on-icon', {
    type: 'string',
    default: defaults.recordingOnIcon,
    alias: 'o',
    description: 'Icon to use when recording.'
  })
  .option('recording-off-icon', {
    type: 'string',
    default: defaults.recordingOffIcon,
    alias: 'f',
    description: 'Icon to use when recording is stopped.'
  })
  .option('recording-error-icon', {
    type: 'string',
    default: defaults.recordingErrorIcon ?? defaults.errorIcon,
    alias: 'e',
    description: 'Icon to use when something goes wrong.'
  })
  .option('recording-button-page', {
    type: 'number',
    default: defaults.recordingButtonPage,
    alias: 'p',
    description: 'Which page to put the recording button on.'
  })
  .option('recording-button-index', {
    type: 'number',
    default: defaults.recordingButtonIndex,
    alias: 'i',
    description: 'Recording button position.'
  })
  .option('streaming-on-icon', {
    type: 'string',
    default: defaults.streamingOn,
    alias: 's',
    description: 'Icon to use when streaming.'
  })
  .option('streaming-off-icon', {
    type: 'string',
    default: defaults.streamingOff,
    alias: 'n',
    description: 'Icon to use when streaming is stopped.'
  })
  .option('streaming-button-page', {
    type: 'number',
    default: defaults.streamingButtonPage,
    alias: 'g',
    description: 'Which page to put the streaming button on.'
  })
  .option('streaming-button-index', {
    type: 'number',
    default: defaults.streamingButtonIndex,
    alias: 'b',
    description: 'Streaming button position.'
  })
  .option('streaming-error-icon', {
    type: 'string',
    default: defaults.streamingErrorIcon ?? defaults.errorIcon,
    alias: 'r',
    description: 'Icon to use when something goes wrong.'
  })
  .option('error-icon', {
    type: 'string',
    default: defaults.errorIcon,
    alias: 'E',
    description: 'Backup icon to use when something goes wrong.'
  })
  .option('config', {
    type: 'string',
    default: configArgv.config,
    alias: 'c',
    description: 'Location of a JSON5 config file.'
  })
  .option('verbose', {
    type: 'boolean',
    default: false,
    alias: 'v',
    description: 'Print more information.'
  })
  .alias('h', 'help')
  .help()
  .showHelpOnFail(true, 'HELP!')
) 
const argv = await args.argv

const setStatus = (status) => {
  let args = [
    '--action', 'set_icon',
    '--button', String(argv.recordingButtonIndex - 1),
  ]
  if(argv.recordingButtonPage != null) {
    args.push('--page', String(argv.recordingButtonPage - 1))
  }

  switch(status) {
    case true: case 'recording': {
      args.push('--icon', argv.recordingOnIcon,)
      break
    }
    case false: case 'stopped': {
      args.push('--icon', argv.recordingOffIcon)
      break
    }
    case null: case 'error': {
      args.push('--icon', argv.recordingErrorIcon ?? argv.errorIcon)
      break
    }
    default: {
      throw new Error(`Unknown Status: ${status}`)
    }
  }
  if(argv.verbose) {
    console.log(
      chalk.cyan('Executing: ')
      + chalk.hex('#C75700')(`streamdeckc ${args.join(' ')}`)
    )
  }
  spawnSync('streamdeckc', args)
}

const obs = new OBSWebSocket()

try {
  await obs.connect()
} catch(err) {
  console.error(
    chalk.red('Error connecting to OBS: ')
    + chalk.yellow(err.message)
  )
  setStatus('error')
  process.exit(1)
}

const { outputActive: recording } = await obs.call('GetRecordStatus')
await setStatus(recording)

const program = new URL(import.meta.url).pathname
const shortArgs = (
  Object.entries(argv).filter(([k, v]) => (
    k.length === 1 && k !== '_' && v != null
  ))
)
const argPairs = shortArgs.map(([k, v]) => `-${k} "${v}"`)
const cmd = `${program} ${argPairs.join(' ')}`
const cmdArgs = [
  '--action', 'set_cmd',
  '--button', String(argv.recordingButtonIndex - 1),
  '--command', `${cmd} rtoggle`,
]
if(argv.recordingButtonPage != null) {
  cmdArgs.push('--page', String(argv.recordingButtonPage - 1))
}
if(argv.verbose) {
  console.debug(
    chalk.cyan('Executing: ')
    + chalk.green(`streamdeckc ${cmdArgs.join(' ')}`)
  )
}
spawnSync('streamdeckc', cmdArgs)

for(const command of argv._) {  
  if(argv.verbose) {
    console.log(
      chalk.cyan('Executing Command: ')
      + chalk.green(command)
    )
  }

  switch(command) {
    case 'watch': {
      obs.on('RecordStateChanged', ({ outputActive }) => {
        setStatus(outputActive)
      })
      break
    }
    case 'rstart': {
      await obs.call('StartRecord')
      setStatus('recording')
      break
    }
    case 'rstop': {
      await obs.call('StopRecord')
      setStatus('stopped')
      break
    }
    case 'rtoggle': {
      await obs.call('ToggleRecord')
      setStatus(!recording)
      if(argv.verbose) {
        console.log(
          chalk.blue('Recording: ')
          + chalk.hex(
            !recording ? '#00B672' : '#FF2442'
          )(
            !recording ? 'On' : 'Off'
          )
        )
      }
      break
    }
    default: {
      throw new Error(`Unknown Command: ${command}`)
    }
  }
}

if(!argv._.includes('watch')) {
  await obs.disconnect()
  process.exit(0)
}