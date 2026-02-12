import { Client, GatewayIntentBits, Collection, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
process.on("unhandledRejection", (err) => console.error("UNHANDLED REJECTION:", err));
process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));

const required = ["DISCORD_TOKEN", "CLIENT_ID", "GAS_WEBAPP_URL", "GAS_SECRET"];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`❌ ${k} が未設定です（RenderのEnvironmentを確認）`);
    process.exit(1);
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".mjs"));
  const json = [];

  for (const f of files) {
    const mod = await import(path.join(commandsPath, f));
    if (!mod?.data || !mod?.execute) {
      console.warn(`⚠️ ${f} は data/execute が無いのでスキップ`);
      continue;
    }
    client.commands.set(mod.data.name, mod);
    json.push(mod.data.toJSON());
    console.log(`✅ Loaded: /${mod.data.name}`);
  }
  return json;
}

async function registerCommands(commandsJson) {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const guildId = process.env.GUILD_ID;

  try {
    console.log("🔄 Registering slash commands...");
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commandsJson });
      console.log(`🎯 Guild commands registered (${guildId})`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsJson });
      console.log("🌍 Global commands registered");
    }
  } catch (e) {
    console.error("❌ Command registration failed:", e);
  }
}

client.once("ready", async () => {
  console.log(`🎉 Logged in as ${client.user.tag}`);
  const commandsJson = await loadCommands();
  await registerCommands(commandsJson);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) {
    // 念のため
    await interaction.reply({ content: "そのコマンドは見つからなかった…！", ephemeral: true }).catch(() => {});
    return;
  }

  try {
    await cmd.execute(interaction);
  } catch (e) {
    console.error(`❌ Error in /${interaction.commandName}:`, e);
    const msg = "コマンド実行中にエラーが出たよ。ログを確認してね🙏";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
});

console.log("🔄 Discord に接続中...");
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("✅ login() called"))
  .catch((error) => {
    console.error("❌ ログインに失敗しました:", error);
    process.exit(1);
  });


// Render用ヘルスチェック
const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.listen(port, () => console.log(`🌐 Web server on ${port}`));

process.on("unhandledRejection", (err) => console.error("UNHANDLED REJECTION:", err));
process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));

client.on("ready", () => console.log("✅ READY"));
client.on("shardDisconnect", (event, id) => console.log("⚠️ shardDisconnect", id, event?.code, event?.reason));
client.on("shardError", (error, id) => console.log("❌ shardError", id, error));
client.on("shardReconnecting", (id) => console.log("🔄 shardReconnecting", id));
client.on("shardResume", (id) => console.log("✅ shardResume", id));

// 30秒おきに生存ログ（ログが全く出ない問題の切り分けに効く）
setInterval(() => {
  console.log("💓 heartbeat", { uptime: process.uptime(), guilds: client.guilds?.cache?.size });
}, 30000);
