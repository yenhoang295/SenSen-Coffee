const TEMPS = ['hot', 'cold', 'any'];
const CAFFEINE = ['yes', 'no', 'any'];

// Chuẩn hóa và kiểm tra khẩu vị khách gửi lên.
export function validateAdviceInput(body) {
  const errors = [];
  const temperature = body?.temperature ?? 'any';
  const caffeine = body?.caffeine ?? 'any';
  const sweetness = body?.sweetness ?? null;
  if (!TEMPS.includes(temperature)) errors.push('temperature');
  if (!CAFFEINE.includes(caffeine)) errors.push('caffeine');
  if (sweetness !== null && ![1, 2, 3].includes(sweetness)) errors.push('sweetness');
  return { errors, prefs: { temperature, caffeine, sweetness } };
}

// Chấm điểm từng món theo khẩu vị, trả về tối đa `limit` món tốt nhất kèm lý do.
export function calcAdvice(products, prefs, limit = 3) {
  const scored = [];
  for (const p of products) {
    if (p.status !== 'active' || p.quantity <= 0) continue;
    if (prefs.temperature !== 'any' && p.temperature !== 'both' && p.temperature !== prefs.temperature) continue;
    if (prefs.caffeine === 'no' && p.has_caffeine) continue;
    if (prefs.caffeine === 'yes' && !p.has_caffeine) continue;

    let score = 0;
    const reasons = [];
    if (prefs.temperature !== 'any') {
      score += p.temperature === prefs.temperature ? 3 : 2;
      reasons.push(prefs.temperature === 'hot' ? 'món nóng' : 'món lạnh');
    }
    if (prefs.sweetness !== null) {
      const gap = Math.abs(p.sweetness - prefs.sweetness);
      score += 3 - gap;
      if (gap === 0) reasons.push('đúng độ ngọt bạn chọn');
    }
    if (prefs.caffeine === 'no') reasons.push('không caffeine');
    if (prefs.caffeine === 'yes') reasons.push('có caffeine');
    if (p.best_seller) { score += 1; reasons.push('được nhiều người chọn'); }
    if (p.new_product) score += 0.5;
    if (p.monthly_special) score += 0.5;

    scored.push({
      productId: p.product_id,
      name: p.product_name,
      price: p.price,
      score,
      reason: reasons.length ? reasons.join(', ') : 'món được gợi ý',
    });
  }
  scored.sort((a, b) => b.score - a.score || a.productId - b.productId);
  return scored.slice(0, limit);
}
