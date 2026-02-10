import { SlashCommandBuilder } from "discord.js";
import { callGas } from "../utils/gas.mjs";

export const data = new SlashCommandBuilder()
  .setName("onduty")
  .setDescription("作業開始を打刻します");

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await callGas("onduty", {
      user_id: interaction.user.id,
      user_name: interaction.user.username,
    });

    if (res.already) {
      await interaction.editReply(`すでに稼働中だよ（開始：${res.start_ts}）`);
      return;
    }

    await interaction.editReply(`✅ 作業開始！\n開始：${res.start_ts}`);
  } catch (e) {
    console.error("onduty error:", e);
    await interaction.editReply(`❌ エラー：${e.message}`);
  }
}
