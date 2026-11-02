// Kiểm tra kết nối Supabase. KHÔNG ghi khóa vào file này.
const url = process.env.SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishable || !secret) {
  console.error("Thiếu biến môi trường. Cần SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY");
  process.exit(1);
}

async function dem(bang, key, nhan) {
  const res = await fetch(`${url}/rest/v1/${bang}?select=*&limit=0`, {
    headers: { apikey: key, Prefer: "count=exact" },
  });
  const range = res.headers.get("content-range"); // dạng 0-0/12 hoặc */12
  const tong = range ? range.split("/")[1] : "?";
  const ok = res.ok ? "OK  " : "LỖI";
  console.log(`${ok} [${nhan}] ${bang}: HTTP ${res.status}, số dòng = ${tong}`);
  if (!res.ok) console.log("     ", (await res.text()).slice(0, 200));
}

console.log("Project:", url, "\n");
await dem("products", publishable, "publishable");
await dem("dining_tables", publishable, "publishable");
await dem("products", secret, "secret");
await dem("dining_tables", secret, "secret");
await dem("profiles", secret, "secret");
await dem("profiles", publishable, "publishable");