const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, REDIRECT_URL, ALLOWED_ORIGINS } = process.env;

const app = express();
const allowed = (ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => (!origin || allowed.length === 0 || allowed.includes(origin)) ? cb(null, true) : cb(new Error("Origin not allowed"), false)
}));

app.get("/", (_req, res) => res.send("OK"));

app.get("/auth", (_req, res) => {
  const url = "https://github.com/login/oauth/authorize"
    + `?client_id=${GITHUB_CLIENT_ID}`
    + `&redirect_uri=${encodeURIComponent(REDIRECT_URL)}`
    + `&scope=repo`;
  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");
  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Accept": "application/json" },
    body: new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URL
    })
  });
  const data = await r.json();
  const token = data.access_token;
  if (!token) return res.status(401).json(data);
  res.send(`<script>window.opener.postMessage('authorization:github:${token}','*');window.close();</script>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("OAuth running on", port));
