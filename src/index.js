#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const bitbar = require("bitbar");
const got = require("got");
const orderBy = require("lodash.orderby");
const execa = require("execa");
const entities = require("entities");
const pkg = require("../package.json");

const args = process.argv.slice(2);
const command = args[0];
const scriptContent =
  command === "dev" ? `node "${__filename}"` : "npx t2-server-xbar";

const bashScript = `#!/bin/bash

#  <xbar.title>Tribes 2 Server Status</xbar.title>
#  <xbar.version>v${pkg.version}</xbar.version>
#  <xbar.author>Brian Beck</xbar.author>
#  <xbar.author.github>exogen</xbar.author.github>
#  <xbar.desc>Show the status of a Tribes 2 server.</xbar.desc>
#  <xbar.dependencies>node,npx,imagemagick</xbar.dependencies>
#  <xbar.abouturl>https://github.com/exogen/t2-server-xbar</xbar.abouturl>

#  <xbar.var>string(VAR_SERVER_NAME="Discord PUB"): Server name to match (regular expression).</xbar.var>
#  <xbar.var>select(VAR_DISPLAY_MODE="image"): How to display the teams. [image, table, submenu]</xbar.var>

export PATH='/usr/local/bin:/usr/bin:/bin:$PATH'

${scriptContent}
`;

const fallbackServerName = "^(Discord PUB|TacoServer Dev)$";

async function fetchServerStatus(regex) {
  const response = await got("https://www.tribesnext.com/json", {
    responseType: "json",
  });
  const server = response.body.find((server) =>
    regex.test(server.info_hostname)
  );

  const teams = server.info_players.map((team) => {
    return {
      name: team.name,
      score: team.score,
      players: orderBy(
        Object.keys(team).reduce((players, key) => {
          if (/^\d+$/.test(key)) {
            players.push(team[key]);
          }
          return players;
        }, []),
        ["score"],
        ["desc"]
      ),
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

function sanitizeDrawText(name) {
  return name.replace(/"/g, '\\"');
}

async function drawImage(server) {
  const teamCount = server.gameTeams.length;
  const rows = server.rows;

  const leftColumn = teamCount > 1 ? 110 : 250;
  const leftScoreColumn = teamCount > 1 ? 390 : 200;
  let verticalPosition = teamCount > 1 ? 174 : 140;
  const rightColumn = 460;
  const rightScoreColumn = 36;

  const draw = ["fill #d6fff5 font-size 12 gravity NorthWest"];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row[0]) {
      draw.push(
        `text ${leftColumn},${verticalPosition + 36 * i} "${sanitizeDrawText(
          row[0].name
        )}"`
      );
    }
    if (teamCount > 1 && row[1]) {
      draw.push(
        `text ${rightColumn},${verticalPosition + 36 * i} "${sanitizeDrawText(
          row[1].name
        )}"`
      );
    }
  }
  draw.push("fill #79d5b6 font-size 10 gravity NorthEast");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row[0]) {
      draw.push(
        `text ${leftScoreColumn},${verticalPosition + 3 + 36 * i} "${
          row[0].score
        }"`
      );
    }
    if (teamCount > 1 && row[1]) {
      draw.push(
        `text ${rightScoreColumn},${verticalPosition + 3 + 36 * i} "${
          row[1].score
        }"`
      );
    }
  }

  const observerRowCount = Math.ceil(server.observerCount / teamCount);

  if (server.observerCount > 0) {
    let observerPosition = verticalPosition + 20 + rows.length * 36;
    draw.push(
      "fill #24ff8a font-size 13 gravity NorthWest",
      `text ${leftColumn},${observerPosition} "Observers"`
    );
    observerPosition += 44;
    draw.push("fill #d6fff5 font-size 12 gravity NorthWest");
    for (let i = 0; i < observerRowCount; i++) {
      const left = server.observerTeam.players[teamCount * i];
      const right = server.observerTeam.players[teamCount * i + 1];
      if (left) {
        draw.push(
          `text ${leftColumn},${observerPosition + 36 * i} "${sanitizeDrawText(
            left.name
          )}"`
        );
      }
      if (teamCount > 1 && right) {
        draw.push(
          `text ${rightColumn},${observerPosition + 36 * i} "${sanitizeDrawText(
            right.name
          )}"`
        );
      }
    }
  }

  let height;
  if (server.playerCount > 0) {
    if (teamCount > 1) {
      height = 210;
    } else {
      height = 178;
    }
  } else {
    height = 300;
  }
  height += rows.length * 36;
  if (observerRowCount) {
    height += 60 + observerRowCount * 36;
  }

  let playerString = "";

  if (server.playerCount > 0) {
    if (teamCount > 1) {
      playerString += `
        fill #24ff8a font-size 13 gravity NorthWest
        text ${leftColumn},130 "${sanitizeDrawText(server.gameTeams[0].name)}"
        text ${rightColumn},130 "${sanitizeDrawText(server.gameTeams[1].name)}"
        fill #fffa17 font-size 11 gravity NorthEast
        text ${leftScoreColumn},134 "${server.gameTeams[0].score}"
        text ${rightScoreColumn},134 "${server.gameTeams[1].score}"
      `;
    }
    playerString += draw.join("\n");
  } else {
    playerString += `
      fill #76b8a7 font-size 12 gravity North
      text 34,184 "No players online."
    `;
  }

  const { stdout: png } = await execa(
    "convert",
    [
      "-size",
      `800x${height}`,
      "-units",
      "PixelsPerInch",
      "-density",
      144,
      "xc:transparent",
      "-draw",
      `
      fill #0c3b3a stroke #2ae8bf stroke-width 2
      roundRectangle 72,2 796,${height - 4} 8,8
      fill #02312b stroke none
      roundRectangle 74,4 794,110 4,4
      stroke #2e6b66j
      line 75,110 793,110
      font "/System/Library/Fonts/HelveticaNeue.ttc" font-size 13 gravity North
      fill #81fff3 stroke none
      text 34,28 "${sanitizeDrawText(server.map)}"
      fill #79d5b6 font-size 10
      text 34,64 "${sanitizeDrawText(server.mapType)}"
      ${playerString}
      `,
      "png:-",
    ],
    {
      encoding: null,
    }
  );

  return png.toString("base64");
}

async function run() {
  const isDarkMode = process.env.XBARDarkMode === "true";
  const regex = new RegExp(process.env.VAR_SERVER_NAME || fallbackServerName);
  const displayMode = process.env.VAR_DISPLAY_MODE || "image";
  const normalColor = isDarkMode ? "#aaaaaa" : "#666666";
  const playerColor = "#888888";

  let server;
  try {
    server = await fetchServerStatus(regex);
  } catch (err) {
    console.error(err);
    bitbar([icon, bitbar.separator, "Error refreshing server info."]);
    return;
  }

  const lines = [];

  if (displayMode === "image") {
    try {
      const image = await drawImage(server);
      lines.push({
        text: "",
        image,
        refresh: true,
      });
    } catch (err) {
      if (err.code === "ENOENT") {
        // If ImageMagick isn't installed, fall back to `table` mode.
        displayMode = "table";
      } else {
        throw err;
      }
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

  if (displayMode === "submenu") {
    lines.push(
      {
        text: `${server.map} (${server.mapType})`,
        color: normalColor,
      },
      playerCountLine
    );
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
        text: "Observers",
        submenu: server.observerTeam.players.map((player) => ({
          text: sanitizeName(player.name),
          color: playerColor,
        })),
      });
    }
  } else if (displayMode === "table") {
    lines.push(
      {
        text: `${server.map} (${server.mapType})`,
        color: normalColor,
      },
      playerCountLine
    );
    if (server.rows.length) {
      const columnWidths = server.gameTeams.map((team) =>
        Math.max(
          (team.name || "Players").length,
          ...team.players.map((player) => player.name.length)
        )
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
          text: "Observers",
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

  bitbar([
    {
      ...icon,
      text: server.playerCount ? ` ${server.playerCount}` : "",
    },
    bitbar.separator,
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
