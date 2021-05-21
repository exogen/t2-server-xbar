#!/usr/bin/env node
const express = require("express");
const compression = require("compression");
const { fetchServerStatus } = require("t2-server-xbar");
const { drawImage, drawFontTest } = require("./image");
const LRU = require("lru-cache");

const cache = new LRU({
  max: 10,
  maxAge: 30 * 1000,
});

const fileType = "image/png";
const port = process.env.PORT || 3000;

const app = express();

app.use(compression());

app.get("/", async (req, res) => {
  const { serverName } = req.query;
  const responseType =
    req.headers.accept === "application/json" ? "application/json" : fileType;
  try {
    const cacheKey = JSON.stringify({ serverName });
    let serverPromise = cache.get(cacheKey);
    if (!serverPromise) {
      serverPromise = fetchServerStatus(serverName || undefined);
      cache.set(cacheKey, serverPromise);
    }
    const server = await serverPromise;
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
