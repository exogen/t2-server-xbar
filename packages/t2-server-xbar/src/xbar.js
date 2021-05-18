const bitbar = require("bitbar");
const {
  fetchServerImage,
  fetchServerStatus,
  getPlayersTable,
} = require("./server");

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

async function run({ isDarkMode = false, serverName, displayMode = "image" }) {
  const normalColor = isDarkMode ? "#aaaaaa" : "#666666";
  const playerColor = "#888888";

  let server;
  try {
    server =
      displayMode === "image"
        ? await fetchServerImage(serverName)
        : await fetchServerStatus(serverName);
  } catch (err) {
    console.error(err);
    bitbar([icon, bitbar.separator, "Error refreshing server info."]);
    return;
  }

  const lines = [];

  if (displayMode === "image") {
    lines.push({
      text: "",
      image: server.image,
      refresh: true,
    });
  } else {
    const mapLine = {
      text: `${server.map} (${server.gameType})`,
      color: normalColor,
    };
    const playerCountLine = {
      text: `${server.playerCount || "No"} ${
        server.playerCount === 1 ? "player" : "players"
      } online`,
    };
    if (server.playerCount > 0) {
      playerCountLine.color = normalColor;
    }
    lines.push(mapLine, playerCountLine);

    if (displayMode === "submenu") {
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
              .map((team, i) =>
                (team.name || "Players").padEnd(columnWidths[i])
              )
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
                (player ? sanitizeName(player.name) : "").padEnd(
                  columnWidths[i]
                )
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

module.exports = { run };
