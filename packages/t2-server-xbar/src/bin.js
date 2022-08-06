#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");
const { run } = require("./xbar");

const args = process.argv.slice(2);
const command = args[0];
const pluginDir = args[1] || path.join(
  process.env.HOME,
  "Library/Application Support/xbar/plugins"
);
const prologue = args[2] || '';
const scriptContent =
  command === "dev"
    ? `NODE_ENV=development node "${__filename}"`
    : `npx t2-server-xbar`;

const bashScript = `#!/bin/bash

#  <xbar.title>Tribes 2 Server Status</xbar.title>
#  <xbar.version>v${pkg.version}</xbar.version>
#  <xbar.author>Brian Beck</xbar.author>
#  <xbar.author.github>exogen</xbar.author.github>
#  <xbar.desc>Show the status of a Tribes 2 server.</xbar.desc>
#  <xbar.dependencies>node,npx</xbar.dependencies>
#  <xbar.abouturl>https://github.com/exogen/t2-server-xbar</xbar.abouturl>

#  <xbar.var>string(VAR_SERVER_NAME="Discord PUB"): Server name to match (regular expression).</xbar.var>
#  <xbar.var>select(VAR_DISPLAY_MODE="image"): How to display the teams. [image, table, submenu]</xbar.var>

export PATH='/usr/local/bin:/usr/bin:/bin:$PATH'

${prologue}

${scriptContent}
`;

if (command === "install" || command === "dev") {
  const pluginFile = path.join(pluginDir, "t2-server.5m.sh");
  console.log(`Installing to: ${pluginFile}`);
  try {
    fs.unlinkSync(pluginFile);
  } catch (err) {
    // It's fine.
  }
  try {
    fs.writeFileSync(pluginFile, bashScript, {
      encoding: "utf8",
      mode: 0o755,
    });
    console.log("✔ Success!");
  } catch (err) {
    console.error("Error installing plugin!");
    throw err;
  }
} else {
  run({
    isDarkMode: process.env.XBARDarkMode === "true",
    serverName: process.env.VAR_SERVER_NAME || undefined,
    displayMode: process.env.VAR_DISPLAY_MODE || undefined,
  });
}
