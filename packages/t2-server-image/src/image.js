const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { getPlayersTable } = require("t2-server-xbar");

registerFont(path.resolve(__dirname, "../fonts/SF-Pro-Text-Medium.otf"), {
  family: "SF Pro",
  weight: "normal",
});
registerFont(path.resolve(__dirname, "../fonts/SF-Pro-Text-Semibold.otf"), {
  family: "SF Pro",
  weight: "semibold",
});
registerFont(path.resolve(__dirname, "../fonts/SF-Pro-Text-Bold.otf"), {
  family: "SF Pro",
  weight: "bold",
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
  const topBorder = 2;
  const leftBorder = 72;
  const rightBorder = leftBorder + width;
  const bottomBorder = height - 4;
  const padding = columnCount === 1 ? 200 : 40;
  const centerPadding = 30;
  const leftColumn = leftBorder + padding;
  const leftScoreColumn =
    columnCount === 1
      ? rightBorder - padding
      : rightBorder - width / 2 - centerPadding;
  const rightColumn = leftBorder + width / 2 + centerPadding;
  const rightScoreColumn = rightBorder - padding;

  const canvas = createCanvas(800, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0c3b3a";
  ctx.strokeStyle = "#2ae8bf";
  ctx.lineWidth = 2;
  ctx.fillRect(leftBorder, topBorder, width, bottomBorder - topBorder);
  ctx.fillStyle = "#02312b";
  ctx.fillRect(leftBorder, topBorder, width, 120);
  ctx.strokeRect(leftBorder, topBorder, width, bottomBorder - topBorder);
  ctx.strokeStyle = "#2e6b66";
  ctx.moveTo(leftBorder + 2, 122);
  ctx.lineTo(rightBorder - 2, 122);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "26px SF Pro";
  ctx.fillStyle = "#81fff3";
  ctx.fillText(server.map, leftBorder + width / 2, 56);
  ctx.font = "20px SF Pro";
  ctx.fillStyle = "#6ec6a8";
  ctx.fillText(server.gameType, leftBorder + width / 2, 86);

  if (server.playerCount > 0) {
    ctx.textAlign = "left";
    ctx.font = "26px SF Pro";
    ctx.fillStyle = "#24ff8a";
    if (leftTeam) {
      ctx.fillText(leftTeam.name, leftColumn, bodyTop);
    }
    if (rightTeam) {
      ctx.fillText(rightTeam.name, rightColumn, bodyTop);
    }
    ctx.fillText("Observers", leftColumn, observersTop);

    ctx.textAlign = "right";
    ctx.font = "22px SF Pro";
    ctx.fillStyle = "#fffa17";
    if (leftTeam && leftTeam.name) {
      ctx.fillText(leftTeam.score, leftScoreColumn, bodyTop);
    }
    if (rightTeam && rightTeam.name) {
      ctx.fillText(rightTeam.score, rightScoreColumn, bodyTop);
    }

    ctx.textAlign = "left";
    ctx.font = "24px SF Pro";
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
    ctx.font = "20px SF Pro";
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
    ctx.font = "24px SF Pro";
    ctx.fillStyle = "#76b8a7";
    ctx.fillText("No players online.", leftBorder + width / 2, 212);
  }

  return canvas;
}

module.exports = { drawImage };