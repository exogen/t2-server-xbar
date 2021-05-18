const express = require("express");
const { createCanvas, loadImage } = require("canvas");

const app = express();

app.get("/", (req, res) => {
  const canvas = createCanvas(200, 200);
  try {
    const ctx = canvas.getContext("2d");

    // Write "Awesome!"
    ctx.font = "30px Impact";
    ctx.rotate(0.1);
    ctx.fillText("Awesome!", 50, 100);

    // Draw line under text
    var text = ctx.measureText("Awesome!");
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.lineTo(50, 102);
    ctx.lineTo(50 + text.width, 102);
    ctx.stroke();

    res.set("Content-Type", "text/html");
    res.send(`<img src="${canvas.toDataURL()}" />`);
  } catch (err) {
    res.status(500);
    res.send(err.toString());
  }
});

app.listen(process.env.PORT || 3000);
