import { SlashCommandBuilder } from "discord.js";
import { callGas } from "../utils/gas.mjs";

function formatHM(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined) return "（未集計）";
  const m = Number(totalMinutes);
  if (Number.isNaN(m) || m < 0) return "0時間0分";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}時間${mm}分`;
}

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("稼働中一覧と今月の累計作業時間（自分）を表示します");

export async function execute(interaction) {
  try {
    const res = await callGas("status", {
      user_id: interaction.user.id,
      user_name: interaction.user.username,
    });

    const active = Array.isArray(res.active) ? res.active : [];
    const mk = res.month_key ?? "";
    const myTotalText = formatHM(res.my_total_minutes);

    if (active.length === 0) {
      await interaction.reply({
        content: `🟢 稼働中：0人\nあなたの今月累計（${mk}）：**${myTotalText}**`,
        ephemeral: true,
      });
      return;
    }

    // 表示長対策：最大20件
    const lines = active.slice(0, 20).map((x) => {
      const name = x.user_name ?? "unknown";
      const start = x.start_ts ?? "unknown";
      return `• **${name}**（開始：${start}）`;
    });
    const more = active.length > 20 ? `\n…他 ${active.length - 20}人` : "";

    await interaction.reply({
      content:
        `🟢 稼働中：**${active.length}人**\n` +
        lines.join("\n") +
        more +
        `\n\nあなたの今月累計（${mk}）：**${myTotalText}**`,
      ephemeral: true,
    });
  } catch (e) {
    console.error("status error:", e);
    await interaction.reply({
      content: `❌ エラーが出たよ：${e.message}`,
      ephemeral: true,
    });
  }
}
