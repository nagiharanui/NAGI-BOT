import { SlashCommandBuilder } from "discord.js";
import { callGas } from "../utils/gas.mjs";

function formatHM(totalMinutes) {
  const m = Number(totalMinutes);
  if (Number.isNaN(m) || m < 0) return "0時間0分";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}時間${mm}分`;
}

export const data = new SlashCommandBuilder()
  .setName("offduty")
  .setDescription("作業終了を打刻し、今月の累計作業時間を表示します");

export async function execute(interaction) {
  try {
    const res = await callGas("offduty", {
      user_id: interaction.user.id,
      user_name: interaction.user.username,
    });

    if (res.not_active) {
      await interaction.reply({
        content: "まだ /onduty してないっぽい！先に開始打刻してね。",
        ephemeral: true,
      });
      return;
    }

    const minutes = res.minutes ?? 0;
    const monthTotal = res.month_total_minutes ?? 0;
    const mk = res.month_key ?? "";

    await interaction.reply({
      content:
        `✅ 作業終了を記録したよ！\n` +
        `今回：${formatHM(minutes)}（${res.start_ts} → ${res.end_ts}）\n` +
        `今月累計（${mk}）：**${formatHM(monthTotal)}**`,
      ephemeral: true,
    });
  } catch (e) {
    console.error("offduty error:", e);
    await interaction.reply({
      content: `❌ エラーが出たよ：${e.message}`,
      ephemeral: true,
    });
  }
}
