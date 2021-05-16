<div align="center">

<h1>
<img alt="Tribes 2 Server Status" src="icon.png" width="54">
</h1>

macOS xbar plugin for showing Tribes 2 server status.

<img src="screenshot.png" alt="Screenshot" width="430">

</div>

## Install

First, install [xbar](https://xbarapp.com).

Then run:

```console
$ npx t2-server-xbar install
```

If you’d like to develop this plugin and run it directly from a git checkout,
clone this repo, then run:

```console
$ yarn
$ yarn run dev
```

The plugin script will point to your working copy rather than the published
package.

## Options

To set options, select **xbar** ▸ **Open plugin…** from the menu.

#### Server name

A regular expression (case sensitive) to select the server shown.

#### Show team list as

Teams can be shown in two ways: `table` mode or `submenu` mode. Submenu mode
can be seen above, while table mode looks like:

<img src="screenshot-table.png" alt="Table mode screenshot" width="290">

As of v1.1.0, table mode is the default.

## Updating

Since the plugin uses `npx` to run the `t2-server-xbar` script from npm, it should stay up to date automatically.

However, if new options are added, you may need to run the install command (above) again for them to show up.
