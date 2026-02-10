// main.mjs - Discord Botのメインプログラム

import { Client, GatewayIntentBits, Collection, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

// ---- 必須ENVチェック ----
const required = ["DISCORD_TOKEN", "CLIENT_ID"];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`❌ ${k} が .env に設定されていません！`);
    process.exit(1);
  }
}
// Sheets系は使う時に必要（onduty/offdutyで落ちるので早めにチェックするならここで）
const sheetRequired = ["SPREADSHEET_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"];
for (const k of sheetRequired) {
  if (!process.env[k]) {
    console.warn(`⚠️ ${k} が未設定です（Sheets連携コマンドでエラーになります）`);
  }
}

// ---- Discord Client ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // ※スラッシュコマンドだけならメッセージ系intentsは不要
    // ただし記事通りのままでもOK（最小化したいなら消せる）
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// ---- commands 自動読み込み ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((f) => f.endsWith(".mjs"));

  const commandsJson = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);

    if (!command?.data || !command?.execute) {
      console.warn(`⚠️ ${file} は data/execute が無いのでスキップ`);
      continue;
    }

    client.commands.set(command.data.name, command);
    commandsJson.push(command.data.toJSON());
    console.log(`✅ Loaded command: /${command.data.name}`);
  }

  return commandsJson;
}

// ---- スラッシュコマンド登録（グローバル or ギルド） ----
async function registerCommands(commandsJson) {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  // 1) 開発中はGUILD_ID指定が超おすすめ（反映が秒〜数分）
  // 2) 本番はグローバル登録（反映に最大1時間くらいかかることがある）
  const guildId = process.env.GUILD_ID;

  try {
    console.log("🔄 Registering slash commands...");

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commandsJson }
      );
      console.log(`🎯 Guild commands registered (GUILD_ID=${guildId})`);
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandsJson }
      );
      console.log("🌍 Global commands registered");
    }
  } catch (error) {
    console.error("❌ Command registration failed:", error);
  }
}

// ---- ready ----
client.once("ready", async () => {
  console.log(`🎉 ${client.user.tag} が正常に起動しました！`);
  console.log(`📊 ${client.guilds.cache.size} つのサーバーに参加中`);

  // 起動時に commands 読み込み＆登録
  const commandsJson = await loadCommands();
  await registerCommands(commandsJson);
});

// ---- interactionCreate（/コマンド実行） ----
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply({ content: "そのコマンドは見つからなかった…！", ephemeral: true }).catch(() => {});
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error in /${interaction.commandName}:`, error);

    // 返信済みかどうかで処理を分ける（discord.jsあるある）
    const msg = "コマンド実行中にエラーが出たよ。運営にログを投げてね🙏";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
});

// ---- エラーハンドリング ----
client.on("error", (error) => {
  console.error("❌ Discord クライアントエラー:", error);
});

process.on("SIGINT", () => {
  console.log("🛑 Botを終了しています...");
  client.destroy();
  process.exit(0);
});

// ---- Discord Login ----
console.log("🔄 Discord に接続中...");
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("❌ ログインに失敗しました:", error);
  process.exit(1);
});

// ---- Express（Render用） ----
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    status: "Bot is running! 🤖",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    guilds: client.guilds.cache.size,
    commands: client.commands?.size ?? 0,
  });
});

app.listen(port, () => {
  console.log(`🌐 Web サーバーがポート ${port} で起動しました`);
});
