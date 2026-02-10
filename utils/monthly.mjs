import { appendRow, getAllValues, updateRow } from "./sheets.mjs";
import { nowJstString } from "./time.mjs";

const SHEET_MONTHLY = process.env.SHEET_MONTHLY ?? "monthly_summary";

/**
 * monthly_summary の (month_key, user_id) 行を探し、
 * あれば total_minutes を上書き更新、なければ追記する。
 */
export async function upsertMonthlyTotal({ monthKey, userId, userName, totalMinutes }) {
  const rows = await getAllValues(SHEET_MONTHLY, "A2:E"); // [month, userId, userName, total, updated]
  const idx = rows.findIndex((r) => r?.[0] === monthKey && r?.[1] === userId);

  const updatedTs = nowJstString();

  if (idx === -1) {
    await appendRow(SHEET_MONTHLY, [
      monthKey,
      userId,
      userName,
      String(totalMinutes),
      updatedTs,
    ]);
    return { action: "insert" };
  }

  // 実際のシート行番号：A2 が idx=0 なので +2
  const rowNum = idx + 2;
  // A〜E全部まとめて更新（整合性が出る）
  await updateRow(SHEET_MONTHLY, rowNum, [
    monthKey,
    userId,
    userName,
    String(totalMinutes),
    updatedTs,
  ], "A");

  return { action: "update", rowNum };
}

/** キャッシュから (month_key, user_id) の total_minutes を取得（なければ null） */
export async function getMonthlyTotalCached({ monthKey, userId }) {
  const rows = await getAllValues(SHEET_MONTHLY, "A2:E");
  const r = rows.find((x) => x?.[0] === monthKey && x?.[1] === userId);
  if (!r) return null;
  const n = Number(r?.[3]);
  return Number.isNaN(n) ? null : n;
}
