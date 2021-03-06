const path = require("path");
const { createCanvas, registerFont } = require("canvas");
const { getPlayersTable } = require("t2-server-xbar");

// node-canvas doesn't select fonts correctly. I had to edit SF Text and SF
// Display in a font editor and give them new family names to get them to
// render correctly.
// See: https://github.com/Automattic/node-canvas/issues/1683
registerFont(path.resolve(__dirname, "../fonts/xbarSF-Regular.ttf"), {
  family: "xbar SF",
});
registerFont(path.resolve(__dirname, "../fonts/xbarSFDisplay-Regular.ttf"), {
  family: "xbar SF Display",
});

function drawImage(
  server,
  {
    padding = {
      top: 12,
      right: 2,
      bottom: 14,
      left: 72,
    },
  } = {}
) {
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

  const bodyTop = 175 + padding.top;
  const observersHeight = observerRowCount ? 40 + 36 * observerRowCount : 0;
  const observersTop = bodyTop + (teamsHeight ? teamsHeight + 30 : 0);

  let totalHeight = 176 + padding.top + padding.bottom;
  if (server.playerCount > 0) {
    if (teamsHeight) {
      totalHeight += teamsHeight + 10;
    }
    if (observersHeight) {
      if (teamsHeight) {
        totalHeight += 20;
      }
      totalHeight += observersHeight + 10;
    }
  } else {
    totalHeight += 120;
  }

  const totalWidth = 768 + padding.left + padding.right;
  const canvas = createCanvas(totalWidth, totalHeight);
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

  // Need to account for stroke width and add/subtract 1 around the border.
  const topBorder = padding.top + 1;
  const bottomBorder = totalHeight - padding.bottom - 1;
  const leftBorder = padding.left + 1;
  const rightBorder = totalWidth - padding.right - 1;
  const width = rightBorder - leftBorder;
  const height = bottomBorder - topBorder;
  let gutter = 40;
  if (columnCount === 1) {
    gutter = 220;
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

  const gradient = ctx.createLinearGradient(0, topBorder, 0, bottomBorder);
  gradient.addColorStop(0, "#043030");
  gradient.addColorStop(0.93, "#0c4644");
  gradient.addColorStop(1, "#035858");
  ctx.fillStyle = gradient;
  ctx.lineWidth = 2;
  // Fill container.
  drawRoundedRectangle(ctx, leftBorder, topBorder, width, height, 10);
  ctx.fill();
  // Fill header.
  ctx.fillStyle = "#00272688";
  drawRoundedRectangle(ctx, leftBorder + 2, topBorder + 2, width - 4, 120, {
    nw: 6,
    ne: 6,
    se: 0,
    sw: 0,
  });
  ctx.fill();
  ctx.strokeStyle = "#2e6b66";
  ctx.beginPath();
  ctx.moveTo(leftBorder + 2, topBorder + 122);
  ctx.lineTo(rightBorder - 2, topBorder + 122);
  ctx.stroke();

  // Stroke container.
  ctx.strokeStyle = "#2ae8bf";
  drawRoundedRectangle(ctx, leftBorder, topBorder, width, height, 10);
  ctx.stroke();
  ctx.shadowColor = "none";
  ctx.shadowBlur = 0;

  ctx.textAlign = "center";
  ctx.font = '26px "xbar SF"';
  ctx.fillStyle = "#81fff3";
  ctx.shadowColor = "#81fff388";
  ctx.shadowBlur = 8;
  ctx.fillText(server.map, leftBorder + width / 2, topBorder + 56);
  ctx.shadowColor = "none";
  ctx.shadowBlur = 0;
  ctx.font = '20px "xbar SF"';
  ctx.fillStyle = "#6ec6a8";
  ctx.fillText(server.gameType, leftBorder + width / 2, topBorder + 86);

  if (server.playerCount > 0) {
    ctx.textAlign = "left";
    ctx.font = '24px "xbar SF"';
    ctx.fillStyle = "#24ff8a";
    if (teamsHeight) {
      if (leftTeam && leftTeam.name) {
        ctx.fillText(leftTeam.name, leftColumn, bodyTop);
      }
      if (rightTeam && rightTeam.name) {
        ctx.fillText(rightTeam.name, rightColumn, bodyTop);
      }
    }
    if (server.observerCount > 0) {
      ctx.fillText("Observers", leftColumn, observersTop);
    }

    ctx.textAlign = "right";
    ctx.font = '22px "xbar SF Display"';
    ctx.fillStyle = "#fffa17";
    if (teamsHeight) {
      if (leftTeam && leftTeam.name) {
        ctx.fillText(leftTeam.score, leftScoreColumn, bodyTop);
      }
      if (rightTeam && rightTeam.name) {
        ctx.fillText(rightTeam.score, rightScoreColumn, bodyTop);
      }
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
    ctx.fillText("No players online.", leftBorder + width / 2, 222);
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
