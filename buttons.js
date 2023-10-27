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

const setup = JSON.parse(fs.readFileSync(
  new URL('package.json', import.meta.url).pathname, 'utf-8'
))

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
  streamingOnIcon: (
    stripHome(new URL('streaming-on.svg', import.meta.url).pathname)
  ),
  streamingOffIcon: (
    stripHome(new URL('streaming-off.svg', import.meta.url).pathname)
  ),
  errorIcon: (
    stripHome(new URL('error-icon.gif', import.meta.url).pathname)
  ),
  recordingButtonPage: null,
  recordingButtonIndex: 9,
  streamingButtonPage: null,
  streamingButtonIndex: 10,
  streamdeckc: 'streamdeckc',
  config: path.join(
    '~', '.config', setup.name, 'config.json5'
  ),
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
      chalk.hex('#C75700')('Loading: ')
      + chalk.hex('#CB61F6')(defaults.config)
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
    default: defaults.streamingOnIcon,
    alias: 'O',
    description: 'Icon to use when streaming.'
  })
  .option('streaming-off-icon', {
    type: 'string',
    default: defaults.streamingOffIcon,
    alias: 'F',
    description: 'Icon to use when streaming is stopped.'
  })
  .option('streaming-error-icon', {
    type: 'string',
    default: defaults.streamingErrorIcon ?? defaults.errorIcon,
    alias: 'E',
    description: 'Icon to use when something goes wrong.'
  })
  .option('streaming-button-page', {
    type: 'number',
    default: defaults.streamingButtonPage,
    alias: 'P',
    description: 'Which page to put the streaming button on.'
  })
  .option('streaming-button-index', {
    type: 'number',
    default: defaults.streamingButtonIndex,
    alias: 'I',
    description: 'Streaming button position.'
  })
  .option('error-icon', {
    type: 'string',
    default: defaults.errorIcon,
    alias: 'r',
    description: 'Backup icon to use when something goes wrong.'
  })
  .option('streamdeckc', {
    type: 'string',
    default: defaults.streamdeckc,
    alias: 's',
    description: 'Location the `streamdeckc` program.'
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
  .option('very-verbose', {
    type: 'boolean',
    default: false,
    alias: 'w',
    description: 'Print even more information.'
  })
  .alias('h', 'help')
  .help()
  .showHelpOnFail(true, 'HELP!')
) 
const argv = await args.argv

if(argv.veryVerbose) {
  console.debug({ argv })
  argv.verbose = true
}

const deckcli = (action, type, opts) => {
  const capType = type[0].toUpperCase() + type.slice(1)
  const args = [
    '--action', action,
    // @ts-ignore
    '--button', String(argv[`${type}ButtonIndex`] - 1),
  ]
  if(argv[`${type}ButtonPage`] != null) {
    // @ts-ignore
    args.push('--page', String(argv[`${type}ButtonPage`] - 1))
  }
  switch(action) {
    case 'set_cmd': {
      const program = new URL(import.meta.url).pathname
      const shortArgs = (
        Object.entries(argv).filter(([k, v]) => (
          k.length === 1 && k !== '_' && v != null
        ))
      )
      const argPairs = shortArgs.map(([k, v]) => `-${k} "${v}"`)
      const cmd = `${program} ${argPairs.join(' ')}`
      args.push('--command', `${cmd} ${type[0]}toggle`)
      break
    }
    case 'set_text': {
      args.push(
        '--text',
        opts.time?.replace(/\.\d+$/, '')
        ?? opts.text?.replace(/ing$/g, '')
        ?? ''
      )
      break
    }
    case 'set_icon': {
      switch(opts.status) {
        case true: case 'recording': case 'streaming': {
          args.push('--icon', argv[`${type}OnIcon`])
          break
        }
        case false: case 'stopped': {
          args.push('--icon', argv[`${type}OffIcon`])
          deckcli('set_text', type, { text: `OBS\n${capType}` })
          break
        }
        case null: case 'error': {
          args.push('--icon', argv[`${type}ErrorIcon`] ?? argv.errorIcon)
          break
        }
        default: {
          throw new Error(`Unknown ${capType} Status: ${opts.status}`)
        }
      }
    }
  }
  if(argv.verbose) {
    console.debug(
      chalk.cyan('Executing: ')
      + chalk.green(`${argv.streamdeckc} ${args.join(' ')}`)
    )
  }
  const { output, status } = spawnSync(argv.streamdeckc, args)
  if(status !== 0 || argv.veryVerbose) {
    console.info(
      chalk.red('Executed: ')
      + chalk.bgHex('#7ED75A').hex('#063965')(status)
      + `  ${chalk.yellow(output?.join("\n  "))}`
    )
  }
}

const setRecordingStatus = (status) => {
  deckcli('set_icon', 'recording', { status })
}
const setStreamingStatus = (status) => {
  deckcli('set_icon', 'streaming', { status })
}

const obs = new OBSWebSocket()

try {
  await obs.connect()
} catch(err) {
  console.error(
    chalk.red('Error connecting to OBS: ')
    + chalk.yellow(err.message)
  )
  setRecordingStatus('error')
  setStreamingStatus('error')
  process.exit(1)
}

const { outputActive: recording } = await obs.call('GetRecordStatus')
await setRecordingStatus(recording)
const { outputActive: streaming } = await obs.call('GetStreamStatus')
await setStreamingStatus(streaming)

deckcli('set_cmd', 'recording')
deckcli('set_cmd', 'streaming')

let interval = null
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
        setRecordingStatus(outputActive)
      })
      obs.on('StreamStateChanged', ({ outputActive }) => {
        setStreamingStatus(outputActive)
      })
      interval = setInterval(async () => {
        const { outputActive: recording, outputTimecode: rTime } = (
          await obs.call('GetRecordStatus')
        )
        if(recording) {
          deckcli('set_text', 'recording', { time: rTime })
        }

        const { outputActive: streaming, outputTimecode: sTime } = (
          await obs.call('GetStreamStatus')
        )
        if(streaming) {
          deckcli('set_text', 'streaming', { time: sTime })
        }
      }, 1250)
      break
    }
    case 'rstart': {
      await obs.call('StartRecord')
      setRecordingStatus('recording')
      break
    }
    case 'rstop': {
      await obs.call('StopRecord')
      setRecordingStatus('stopped')
      break
    }
    case 'rtoggle': {
      await obs.call('ToggleRecord')
      setRecordingStatus(!recording)
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
    case 'sstart': {
      await obs.call('StartStream')
      setStreamingStatus('streaming')
      break
    }
    case 'sstop': {
      await obs.call('StopStream')
      setStreamingStatus('stopped')
      break
    }
    case 'stoggle': {
      await obs.call('ToggleStream')
      setStreamingStatus(!streaming)
      if(argv.verbose) {
        console.log(
          chalk.blue('Streaming: ')
          + chalk.hex(
            !streaming ? '#00B672' : '#FF2442'
          )(
            !streaming ? 'On' : 'Off'
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