import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

process.on("unhandledRejection", (err) => console.error("UNHANDLED:", err));
process.on("uncaughtException", (err) => console.error("UNCAUGHT:", err));

client.on("ready", () => {
  console.log("✅ READY:", client.user.tag);
});

client.on("error", (e) => {
  console.log("❌ client error:", e);
});

console.log("🔄 Discord login start");

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("✅ login() resolved"))
  .catch((e) => {
    console.log("❌ login() rejected:", e);
    process.exit(1);
  });

// Express（Render用）
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.listen(port, () => {
  console.log("🌐 Web server on", port);
});

// ハートビート
setInterval(() => {
  console.log("💓 heartbeat", {
    uptime: process.uptime(),
    guilds: client.guilds?.cache?.size,
  });
}, 30000);
