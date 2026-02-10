export async function callGas(action, payload) {
  const url = process.env.GAS_WEBAPP_URL;
  const secret = process.env.GAS_SECRET;
  if (!url || !secret) throw new Error("GAS_WEBAPP_URL / GAS_SECRET が未設定");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 9000); // 9秒で打ち切り

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, secret, ...payload }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(data.error || "GAS error");
    return data;
  } finally {
    clearTimeout(t);
  }
}
