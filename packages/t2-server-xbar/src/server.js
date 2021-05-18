const got = require("got");
const orderBy = require("lodash.orderby");
const entities = require("entities");

async function fetchServerStatus(regexString) {
  const regex = new RegExp(regexString);

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
    gameType: server.info_maptype,
    observerCount,
    playerCount,
    observerTeam,
    gameTeams,
    rowCount,
    rows,
  };
}

async function fetchServerImage(regexString) {
  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/"
      : "https://t2-server-xbar.herokuapp.com/";

  const response = await got(url, {
    responseType: "json",
    searchParams: {
      serverName: regexString,
    },
  });
  return response.body;
}

function getPlayersTable(server) {
  const columnCount = server.gameTeams.length || 1;

  const rowCount = Math.max(
    0,
    ...server.gameTeams.map((team) => team.players.length)
  );
  const rows = new Array(rowCount);
  for (let i = 0; i < rowCount; i++) {
    rows[i] = server.gameTeams.map((team) => team.players[i]);
  }

  const observerRowCount = Math.ceil(server.observerCount / columnCount);
  const observerRows = new Array(observerRowCount);
  for (let i = 0; i < observerRowCount; i++) {
    const index = i * columnCount;
    observerRows[i] = server.observerTeam.players.slice(
      index,
      index + columnCount
    );
  }

  return { columnCount, rowCount, rows, observerRowCount, observerRows };
}

module.exports = {
  fetchServerStatus,
  fetchServerImage,
  getPlayersTable,
};
