#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const bitbar = require("bitbar");
const got = require("got");
const entities = require("entities");

const args = process.argv.slice(2);
const command = args[0];
const scriptContent =
  command === "dev" ? `node "${__filename}"` : "npx t2-server-xbar";

const bashScript = `#!/bin/bash

#  <xbar.title>Tribes 2 Server Status</xbar.title>
#  <xbar.version>v1.0</xbar.version>
#  <xbar.author>Brian Beck</xbar.author>
#  <xbar.author.github>exogen</xbar.author.github>
#  <xbar.desc>Show the status of a Tribes 2 server.</xbar.desc>
#  <xbar.dependencies>node,npx</xbar.dependencies>
#  <xbar.abouturl>https://github.com/exogen/t2-server-xbar</xbar.abouturl>

#  <xbar.var>string(VAR_SERVER_NAME="Discord PUB"): Server name to match (regular expression).</xbar.var>
#  <xbar.var>select(VAR_SHOW_TEAM_LIST_AS="table"): How to display the teams. [table, submenu]</xbar.var>

export PATH='/usr/local/bin:/usr/bin:/bin:$PATH'

${scriptContent}
`;

const fallbackServerName = "^(Discord PUB|TacoServer Dev)$";

async function fetchServerStatus() {
  const response = await got("https://www.tribesnext.com/json", {
    responseType: "json",
  });
  const regex = new RegExp(process.env.VAR_SERVER_NAME || fallbackServerName);
  const server = response.body.find((server) =>
    regex.test(server.info_hostname)
  );

  const teams = server.info_players.map((team) => {
    return {
      name: team.name,
      score: team.score,
      players: Object.keys(team).reduce((players, key) => {
        if (/^\d+$/.test(key)) {
          players.push(team[key]);
        }
        return players;
      }, []),
    };
  });

  const observerTeam = teams.find((team) => team.name === "Unassigned");
  const gameTeams = teams.filter((team) => team.name !== "Unassigned");

  const playerCount = teams.reduce(
    (count, team) => count + team.players.length,
    0
  );
  const observerCount = observerTeam ? observerTeam.players.length : 0;
  const rowCount = Math.max(0, ...gameTeams.map((team) => team.players.length));
  const rows = new Array(rowCount);

  for (let i = 0; i < rowCount; i++) {
    rows[i] = [];
    gameTeams.forEach((team, j) => {
      rows[i][j] = team.players[i];
    });
  }

  return {
    map: entities.decodeHTML(server.info_map),
    mapType: server.info_maptype,
    observerCount,
    playerCount,
    observerTeam,
    gameTeams,
    rowCount,
    rows,
  };
}

const icon = {
  text: "",
  templateImage:
    "iVBORw0KGgoAAAANSUhEUgAAABsAAAAgCAQAAABJYMuwAAAACXBIWXMAABYlAAAWJQFJUiTwAAAA20lEQVQ4y+2TsQ2CUBRFT1zABdSEEWgojaFjAYagZRQ6doAZaB3BgsbQwQKEkGfBQwh+QOw0Xhruve+E8D5Arx0RBQ5mORRE7F6LGEGoCQxQQI0gxNMiRJ7Xq4YuHMc2jcYlvgHzKbVvsIf4qmHOYebdjuQ6c+2jswZ3TszrxF3nzl2QqvVYlqdzKYBFiyAkrKt7QIs17NB9A3OHfSZ6u38D2+tsArfRqZjOztTeoPoAq9CFbMNac7yGCZPBeWziPsTM3/pSsvCL/DJ2UX/ZhmXqs22YzPg/9tXYAxsnW9qVI5jgAAAAAElFTkSuQmCC",
  trim: false,
};

// xbar has no escaping mechanism, so replace special characters.
function sanitizeName(name) {
  return name.replace(/[|]/g, "│");
}

async function run() {
  const isDarkMode = process.env.XBARDarkMode === "true";
  const teamListStyle = process.env.VAR_SHOW_TEAM_LIST_AS || "table";
  const normalColor = isDarkMode ? "#aaaaaa" : "#666666";
  const playerColor = "#888888";

  let server;
  try {
    server = await fetchServerStatus();
  } catch (err) {
    console.error(err);
    bitbar([icon, bitbar.separator, "Error refreshing server info."]);
    return;
  }

  const lines = [];

  if (teamListStyle === "submenu") {
    lines.push(
      ...server.gameTeams.map((team) => ({
        text: team.name || "Players",
        submenu: team.players.map((player) => ({
          text: sanitizeName(player.name),
          color: playerColor,
        })),
      }))
    );

    if (server.observerCount) {
      lines.push({
        text: "Observer",
        submenu: server.observerTeam.players.map((player) => ({
          text: sanitizeName(player.name),
          color: playerColor,
        })),
      });
    }
  } else {
    if (server.rows.length) {
      const columnWidths = server.gameTeams.map((team) =>
        Math.max(...team.players.map((player) => player.name.length))
      );
      lines.push(
        bitbar.separator,
        {
          text: server.gameTeams
            .map((team, i) => (team.name || "Players").padEnd(columnWidths[i]))
            .join("    "),
          font: "Menlo",
          color: normalColor,
          size: 11,
        },
        bitbar.separator
      );
      lines.push(
        ...server.rows.map((row) => ({
          text: row
            .map((player, i) =>
              (player ? sanitizeName(player.name) : "").padEnd(columnWidths[i])
            )
            .join("    "),
          font: "Menlo",
          color: playerColor,
          trim: false,
          size: 11,
        }))
      );
    }
    if (server.observerCount) {
      lines.push(
        bitbar.separator,
        {
          text: "Observer",
          font: "Menlo",
          color: normalColor,
          size: 11,
        },
        bitbar.separator
      );
      lines.push(
        ...server.observerTeam.players.map((player) => ({
          text: sanitizeName(player.name),
          font: "Menlo",
          color: playerColor,
          size: 11,
        }))
      );
    }
  }

  const playerCountLine = {
    text: `${server.playerCount || "No"} ${
      server.playerCount === 1 ? "player" : "players"
    } online`,
  };
  if (server.playerCount > 0) {
    playerCountLine.color = normalColor;
  }

  bitbar([
    {
      ...icon,
      text: server.playerCount ? ` ${server.playerCount}` : "",
    },
    bitbar.separator,
    {
      text: `${server.map} (${server.mapType})`,
      color: normalColor,
    },
    playerCountLine,
    ...lines,
  ]);
}

if (command === "install" || command === "dev") {
  const pluginDir = path.join(
    process.env.HOME,
    "Library/Application Support/xbar/plugins"
  );
  const pluginFile = path.join(pluginDir, "t2-server.5m.sh");
  console.log(`Installing to: ${pluginFile}`);
  fs.unlinkSync(pluginFile);
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
  run();
}
