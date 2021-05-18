#!/usr/bin/env node
const express = require("express");
const compression = require("compression");
const { fetchServerStatus } = require("t2-server-xbar");
const { drawImage, drawFontTest } = require("./image");

const fileType = "image/png";
const port = process.env.PORT || 3000;

const app = express();

app.use(compression());

app.get("/", async (req, res) => {
  const { serverName } = req.query;
  const responseType =
    req.headers.accept === "application/json" ? "application/json" : fileType;
  try {
    const server = await fetchServerStatus(serverName || undefined);
    const canvas = drawImage(server);
    const buffer = canvas.toBuffer(fileType, { resolution: 144 });
    res.set("Content-Type", responseType);
    if (responseType === "application/json") {
      res.json({
        ...server,
        image: buffer.toString("base64"),
      });
    } else {
      res.set("Server-Player-Count", server.playerCount);
      res.send(buffer);
    }
  } catch (err) {
    res.set("Content-Type", "text/plain");
    res.status(500);
    res.send(err.toString());
  }
});

app.get("/font-test", (req, res) => {
  try {
    const canvas = drawFontTest();
    const buffer = canvas.toBuffer(fileType, { resolution: 144 });
    res.set("Content-Type", fileType);
    res.send(buffer);
  } catch (err) {
    res.set("Content-Type", "text/plain");
    res.status(500);
    res.send(err.toString());
  }
});

app.listen(port, () => {
  console.log(`Listening on ${port}...`);
});
