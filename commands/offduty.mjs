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
  .setDescription("作業終了を打刻し、今月累計を表示します");

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await callGas("offduty", {
      user_id: interaction.user.id,
      user_name: interaction.user.username,
    });

    if (res.not_active) {
      await interaction.editReply("まだ /onduty してないっぽい！先に開始打刻してね。");
      return;
    }

    await interaction.editReply(
      `✅ 作業終了！\n` +
      `今回：${formatHM(res.minutes)}（${res.start_ts} → ${res.end_ts}）\n` +
      `今月累計（${res.month_key}）：**${formatHM(res.month_total_minutes)}**`
    );
  } catch (e) {
    console.error("offduty error:", e);
    await interaction.editReply(`❌ エラー：${e.message}`);
  }
}
