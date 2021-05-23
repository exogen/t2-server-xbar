#!/usr/bin/env node
const express = require("express");
const compression = require("compression");
const { fetchServerStatus } = require("t2-server-xbar");
const { drawImage, drawFontTest } = require("./image");
const LRU = require("lru-cache");

const serverStatusCache = new LRU({
  max: 10,
  maxAge: 1000 * 30, // 30 seconds
});

const snapshotCache = new LRU({
  max: 100,
  maxAge: 1000 * 60 * 60, // 1 hour
});

const fileType = "image/png";
const port = process.env.PORT || 3000;

const app = express();

app.use(compression());

function parsePadding(paddingString) {
  if (/^[\d,]+$/.test(paddingString)) {
    const sides = paddingString.split(",").map((s) => parseInt(s, 10) || 0);
    switch (sides.length) {
      case 1:
        return {
          top: sides[0],
          right: sides[0],
          bottom: sides[0],
          left: sides[0],
        };
      case 2:
        return {
          top: sides[0],
          right: sides[1],
          bottom: sides[0],
          left: sides[1],
        };
      case 3:
        // I hate this possibility.
        return undefined;
      case 4:
        return {
          top: sides[0],
          right: sides[1],
          bottom: sides[2],
          left: sides[3],
        };
    }
  }
  // Use default.
  return undefined;
}

async function getServerStatus({ serverName, cache = true }) {
  let cacheKey = cache ? JSON.stringify({ serverName }) : null;
  let serverPromise;
  if (cacheKey) {
    serverPromise = serverStatusCache.get(cacheKey);
  }
  if (!serverPromise) {
    serverPromise = fetchServerStatus(serverName || undefined);
    if (cacheKey) {
      serverStatusCache.set(cacheKey, serverPromise);
    }
  }
  return serverPromise;
}

async function getServerSnapshot({
  serverName,
  paddingString,
  timestamp,
  cache = true,
}) {
  let cacheKey =
    cache && timestamp
      ? JSON.stringify({ serverName, paddingString, timestamp })
      : null;

  let snapshotPromise;
  if (cacheKey) {
    snapshotPromise = snapshotCache.get(cacheKey);
  }
  if (!snapshotPromise) {
    snapshotPromise = new Promise(async (resolve, reject) => {
      try {
        const server = await getServerStatus({ serverName, cache });
        const padding = parsePadding(paddingString);
        const canvas = drawImage(server, { padding });
        const buffer = canvas.toBuffer(fileType, { resolution: 144 });
        resolve({ server, buffer });
      } catch (err) {
        reject(err);
      }
    });
    if (cacheKey) {
      snapshotCache.set(cacheKey, snapshotPromise);
    }
  } else {
    console.log(`Found cached result for key: ${cacheKey}`);
  }
  return snapshotPromise;
}

app.get("/", async (req, res) => {
  const { serverName, padding: paddingString, t: timestamp } = req.query;
  const responseType =
    req.headers.accept === "application/json" ? "application/json" : fileType;

  try {
    const { server, buffer } = await getServerSnapshot({
      serverName,
      paddingString,
      timestamp,
    });
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

app.get("/:timestamp/image.png", async (req, res) => {
  const { timestamp } = req.params;
  const { serverName, padding: paddingString } = req.query;

  try {
    const { server, buffer } = await getServerSnapshot({
      serverName,
      paddingString,
      timestamp,
    });
    res.set("Content-Type", fileType);
    res.set("Content-Disposition", 'attachment; filename="t2-server.png"');
    res.set("Server-Player-Count", server.playerCount);
    res.send(buffer);
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
