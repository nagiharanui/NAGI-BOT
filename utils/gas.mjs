export async function callGas(action, payload) {
  const url = process.env.GAS_WEBAPP_URL;
  const secret = process.env.GAS_SECRET;

  if (!url || !secret) {
    throw new Error("GAS_WEBAPP_URL / GAS_SECRET が未設定");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, secret, ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.error || "GAS error");
  return data;
}
