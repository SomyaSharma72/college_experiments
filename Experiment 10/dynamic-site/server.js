const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const app = express();
const port = process.env.PORT || 3010;
const page = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

app.get("/health", (request, response) => {
    response.json({ status: "ok" });
});

app.get("/", (request, response) => {
    response.set("Cache-Control", "no-store");
    response.type("html").send(page.replace("{{SERVER_TIME}}", new Date().toISOString()));
});

app.listen(port, () => {
    console.log(`Dynamic site is available at http://localhost:${port}`);
});
