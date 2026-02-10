import { SlashCommandBuilder } from "discord.js";
import { callGas } from "../utils/gas.mjs";

export const data = new SlashCommandBuilder()
  .setName("onduty")
  .setDescription("作業開始を打刻します");

export async function execute(interaction) {
  try {
    const res = await callGas("onduty", {
      user_id: interaction.user.id,
      user_name: interaction.user.username,
    });

    if (res.already) {
      await interaction.reply({
        content: `すでに稼働中だよ（開始：${res.start_ts}）`,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: `✅ 作業開始を記録したよ！\n開始：${res.start_ts}`,
      ephemeral: true,
    });
  } catch (e) {
    console.error("onduty error:", e);
    await interaction.reply({
      content: `❌ エラーが出たよ：${e.message}`,
      ephemeral: true,
    });
  }
}
