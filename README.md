# Linux Stream Deck Dynamic OBS Recording and Streaming Buttons

This project combines [OBS's websocket interface](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md) with [`streamdeck-linux-gui`](https://github.com/streamdeck-linux-gui/streamdeck-linux-gui) to drive a buttons whose images change with the recording and streaming states & which toggles the appropriate state when pushed.

[Stream Deck Demo Video](https://github.com/dysbulic/stream-deck-obs-buttons/assets/181523/9136efeb-ffca-4125-82ec-be954a98fcfc)

## Use

**_(This program relies on a new feature in `streamdeck-linux-gui`, a control system via Unix socket called `streamdeckc`. At the time of this writing it is not included in the distribution packages & to use it one must [install from source](https://github.com/streamdeck-linux-gui/streamdeck-linux-gui/blob/main/docs/installation/source.md).)_**

To have the program monitor OBS and control states *(with logging)*, run:

```bash
npx stream-deck-obs-buttons watch -v
```

Running it with the `--help` flag will publish a list of available options:

```text
Commands:
  stream-deck-obs-buttons watch    Watch for changes in status.
  stream-deck-obs-buttons rstart   Start OBS recording.
  stream-deck-obs-buttons rstop    Stop OBS recording.
  stream-deck-obs-buttons rtoggle  Toggle OBS recording.
  stream-deck-obs-buttons sstart   Start OBS streaming.
  stream-deck-obs-buttons sstop    Stop OBS streaming.
  stream-deck-obs-buttons stoggle  Toggle OBS streaming.

Options:
      --version                 Show version number                    [boolean]
  -o, --recording-on-icon       Icon to use when recording.
    [string] [default: "~/tip/program/stream-deck-obs-buttons/recording-on.gif"]
  -f, --recording-off-icon      Icon to use when recording is stopped.
   [string] [default: "~/tip/program/stream-deck-obs-buttons/recording-off.gif"]
  -e, --recording-error-icon    Icon to use when something goes wrong.
      [string] [default: "~/tip/program/stream-deck-obs-buttons/error-icon.gif"]
  -p, --recording-button-page   Which page to put the recording button on.
                                                           [number] [default: 5]
  -i, --recording-button-index  Recording button position. [number] [default: 9]
  -O, --streaming-on-icon       Icon to use when streaming.
    [string] [default: "~/tip/program/stream-deck-obs-buttons/streaming-on.svg"]
  -F, --streaming-off-icon      Icon to use when streaming is stopped.
   [string] [default: "~/tip/program/stream-deck-obs-buttons/streaming-off.svg"]
  -E, --streaming-error-icon    Icon to use when something goes wrong.
      [string] [default: "~/tip/program/stream-deck-obs-buttons/error-icon.gif"]
  -P, --streaming-button-page   Which page to put the streaming button on.
                                                           [number] [default: 5]
  -I, --streaming-button-index  Streaming button position.[number] [default: 10]
  -r, --error-icon              Backup icon to use when something goes wrong.
      [string] [default: "~/tip/program/stream-deck-obs-buttons/error-icon.gif"]
  -c, --config                  Location of a JSON5 config file.
            [string] [default: "~/.config/stream-deck-obs-buttons/config.json5"]
  -v, --verbose                 Print more information.
                                                      [boolean] [default: false]
  -w, --very-verbose            Print even more information.
                                                      [boolean] [default: false]
  -h, --help                    Show help                              [boolean]
  ```

*(By default, the page where buttons are inserted is whatever page is currently open in the UI.)*

## Configuration

The program will optionally load a configuration from the path specified by `--config` or `~/.config/stream-deck-obs-buttons/config.json5`. *([JSON5](htttps://json5.org) is like JSON, but with looser parsing rules similar to those of JavaScript objects.)*

The JSON5 document can contain the flags from the `--help` section except camel cased rather than dashed. For example:

```js
{
  recordingButtonIndex: 12, // indexed from 1
  recordingButtonPage: 3,
  errorIcon: '~/.config/stream-deck-obs-buttons/error-icon.gif',
}
```
