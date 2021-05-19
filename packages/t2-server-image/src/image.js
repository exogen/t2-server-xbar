const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { getPlayersTable } = require("t2-server-xbar");

// node-canvas doesn't select fonts correctly. For now, only register one weight
// and use Medium instead of Regular.
// See: https://github.com/Automattic/node-canvas/issues/1683
registerFont(path.resolve(__dirname, "../fonts/xbarSF-Regular.ttf"), {
  family: "xbar SF",
});
registerFont(path.resolve(__dirname, "../fonts/xbarSFDisplay-Regular.ttf"), {
  family: "xbar SF Display",
});

function drawImage(server) {
  const { columnCount, rowCount, rows, observerRowCount, observerRows } =
    getPlayersTable(server);

  const [leftTeam, rightTeam] = server.gameTeams;

  let teamsHeight = 0;
  if (rowCount) {
    if (leftTeam.name) {
      teamsHeight += 40;
    }
    teamsHeight += 36 * rowCount;
  }

  const bodyTop = 176;
  const observersHeight = observerRowCount ? 40 + 36 * observerRowCount : 0;
  const observersTop = bodyTop + (teamsHeight ? teamsHeight + 30 : 0);

  let height = 180;
  if (server.playerCount > 0) {
    if (teamsHeight) {
      height += teamsHeight + 10;
    }
    if (observersHeight) {
      if (teamsHeight) {
        height += 20;
      }
      height += observersHeight + 10;
    }
  } else {
    height += 120;
  }

  const width = 726;
  const canvas = createCanvas(800, height);
  const ctx = canvas.getContext("2d");

  // Find max player name length.
  ctx.font = '22px "xbar SF"';
  const playerNameWidths = [];
  server.gameTeams.forEach((team) => {
    team.players.forEach((player) => {
      playerNameWidths.push(ctx.measureText(player.name).width);
    });
  });
  if (server.observerTeam) {
    server.observerTeam.players.forEach((player) => {
      playerNameWidths.push(ctx.measureText(player.name).width);
    });
  }
  const maxPlayerNameWidth = Math.max(0, ...playerNameWidths);
  // Maximum length before decreasing gutter size.
  const playerNameWidthLimit = 234;

  const topBorder = 2;
  const leftBorder = 72;
  const rightBorder = leftBorder + width;
  const bottomBorder = height - 4;
  let gutter = 40;
  if (columnCount === 1) {
    gutter = 200;
  } else if (maxPlayerNameWidth > playerNameWidthLimit) {
    gutter = 30;
  }
  const centerGutter = maxPlayerNameWidth > playerNameWidthLimit ? 16 : 30;
  const leftColumn = leftBorder + gutter;
  const leftScoreColumn =
    columnCount === 1
      ? rightBorder - gutter
      : rightBorder - width / 2 - centerGutter;
  const rightColumn = leftBorder + width / 2 + centerGutter;
  const rightScoreColumn = rightBorder - gutter;

  ctx.fillStyle = "#0c3b3a";
  ctx.strokeStyle = "#2ae8bf";
  ctx.lineWidth = 2;
  drawRoundedRectangle(
    ctx,
    leftBorder,
    topBorder,
    width,
    bottomBorder - topBorder,
    10
  );
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#02312b";
  drawRoundedRectangle(ctx, leftBorder + 2, topBorder + 2, width - 4, 120 - 4, {
    nw: 6,
    ne: 6,
    se: 0,
    sw: 0,
  });
  ctx.fill();
  ctx.strokeStyle = "#2e6b66";
  ctx.beginPath();
  ctx.moveTo(leftBorder + 2, 122);
  ctx.lineTo(rightBorder - 2, 122);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = '26px "xbar SF"';
  ctx.fillStyle = "#81fff3";
  ctx.fillText(server.map, leftBorder + width / 2, 56);
  ctx.font = '20px "xbar SF"';
  ctx.fillStyle = "#6ec6a8";
  ctx.fillText(server.gameType, leftBorder + width / 2, 86);

  if (server.playerCount > 0) {
    ctx.textAlign = "left";
    ctx.font = '24px "xbar SF"';
    ctx.fillStyle = "#24ff8a";
    if (leftTeam && leftTeam.name) {
      ctx.fillText(leftTeam.name, leftColumn, bodyTop);
    }
    if (rightTeam && rightTeam.name) {
      ctx.fillText(rightTeam.name, rightColumn, bodyTop);
    }
    if (server.observerCount > 0) {
      ctx.fillText("Observers", leftColumn, observersTop);
    }

    ctx.textAlign = "right";
    ctx.font = '22px "xbar SF Display"';
    ctx.fillStyle = "#fffa17";
    if (leftTeam && leftTeam.name) {
      ctx.fillText(leftTeam.score, leftScoreColumn, bodyTop);
    }
    if (rightTeam && rightTeam.name) {
      ctx.fillText(rightTeam.score, rightScoreColumn, bodyTop);
    }

    ctx.textAlign = "left";
    ctx.font = '22px "xbar SF"';
    ctx.fillStyle = "#d6fff5";

    rows.forEach((row, i) => {
      const [left, right] = row;
      const textBottom = bodyTop + (leftTeam.name ? 40 : 0) + 36 * i;
      if (left) {
        ctx.fillText(left.name, leftColumn, textBottom);
      }
      if (right) {
        ctx.fillText(right.name, rightColumn, textBottom);
      }
    });

    observerRows.forEach((row, i) => {
      const [left, right] = row;
      const textBottom = observersTop + 40 + 36 * i;
      if (left) {
        ctx.fillText(left.name, leftColumn, textBottom);
      }
      if (right) {
        ctx.fillText(right.name, rightColumn, textBottom);
      }
    });

    ctx.textAlign = "right";
    ctx.font = '20px "xbar SF Display"';
    ctx.fillStyle = "#79d5b6";

    rows.forEach((row, i) => {
      const [left, right] = row;
      const textBottom = bodyTop + (leftTeam.name ? 40 : 0) + 36 * i;
      if (left) {
        ctx.fillText(left.score, leftScoreColumn, textBottom);
      }
      if (right) {
        ctx.fillText(right.score, rightScoreColumn, textBottom);
      }
    });
  } else {
    ctx.textAlign = "center";
    ctx.font = '24px "xbar SF"';
    ctx.fillStyle = "#76b8a7";
    ctx.fillText("No players online.", leftBorder + width / 2, 212);
  }

  return canvas;
}

function drawRoundedRectangle(ctx, x, y, width, height, radius = 0) {
  if (typeof radius === "number") {
    radius = { nw: radius, ne: radius, se: radius, sw: radius };
  }

  const xEnd = x + width;
  const yEnd = y + height;

  ctx.beginPath();
  ctx.moveTo(x + radius.nw, y);
  ctx.lineTo(xEnd - radius.ne, y);
  ctx.quadraticCurveTo(xEnd, y, xEnd, y + radius.ne);
  ctx.lineTo(xEnd, yEnd - radius.se);
  ctx.quadraticCurveTo(xEnd, yEnd, xEnd - radius.se, yEnd);
  ctx.lineTo(x + radius.sw, yEnd);
  ctx.quadraticCurveTo(x, yEnd, x, yEnd - radius.sw);
  ctx.lineTo(x, y + radius.nw);
  ctx.quadraticCurveTo(x, y, x + radius.nw, y);
}

function drawFontTest() {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0c3b3a";
  ctx.strokeStyle = "#2ae8bf";
  ctx.lineWidth = 2;

  drawRoundedRectangle(ctx, 0, 0, 800, 600, 10);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#d6fff5";
  [
    "ultralight",
    "thin",
    "light",
    "normal",
    "medium",
    "semibold",
    "bold",
    "heavy",
    "black",
  ].forEach((weight, i) => {
    ctx.font = `${weight} 22px "xbar SF"`;
    ctx.fillText("Team combat at an epic scale!", 400, 36 + 64 * i);
    ctx.font = `${weight} 22px "xbar SF Display"`;
    ctx.fillText("Team combat at an epic scale!", 400, 36 + 32 + 64 * i);
  });

  return canvas;
}

module.exports = { drawImage, drawFontTest };
