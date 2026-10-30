// ---- core: pure pricing + public snapshot (shared by page and build) ----
const TRANSPORT = {
  bus: { ua: 'Автобус', pl: 'Autokar', en: 'Coach', zh: '大巴', km: true },
  car: { ua: 'Авто / бус', pl: 'Samochód / bus', en: 'Car / van', zh: '汽车 / 面包车', km: true },
  plane: { ua: 'Літак', pl: 'Samolot', en: 'Plane', zh: '飞机', km: false },
  train: { ua: 'Потяг', pl: 'Pociąg', en: 'Train', zh: '火车', km: false },
  boat: { ua: 'Пором / човен', pl: 'Prom / łódź', en: 'Ferry / boat', zh: '渡轮 / 船', km: false },
  taxi: { ua: 'Таксі', pl: 'Taxi', en: 'Taxi', zh: '出租车', km: false },
  other: { ua: 'Інше', pl: 'Inne', en: 'Other', zh: '其他', km: false }
};
const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const itemCost = (it, pax) => num(it.amount) * (it.per === 'person' ? pax : 1);

function legCost(leg, pax) {
  const t = TRANSPORT[leg.type] || TRANSPORT.other;
  if (t.km) {
    const vehicles = Math.max(1, Math.ceil(pax / Math.max(1, num(leg.capacity) || 50)));
    const fuel = num(leg.km) / 100 * num(leg.consumption) * num(leg.fuelPrice);
    return { total: (fuel + num(leg.extra)) * vehicles, fuel: fuel * vehicles, vehicles };
  }
  return { total: itemCost(leg, pax), fuel: 0, vehicles: 0 };
}

function staffCost(s, days) {
  return num(s.rate) * Math.max(1, num(s.count)) * (s.unit === 'trip' ? 1 : (num(s.days) || days));
}

function calc(trip, paxOverride) {
  const pax = Math.max(1, Math.round(num(paxOverride ?? trip.pax)) || 1);
  const days = trip.days.length;
  const c = { transport: 0, fuel: 0, km: 0, hotels: 0, meals: 0, excursions: 0, staff: 0, perDay: [] };
  for (const d of trip.days) {
    const t = d.transport.reduce((a, l) => a + legCost(l, pax).total, 0);
    const f = d.transport.reduce((a, l) => a + legCost(l, pax).fuel, 0);
    const h = itemCost(d.hotel || {}, pax);
    const m = d.meals.reduce((a, i) => a + itemCost(i, pax), 0);
    const e = d.excursions.reduce((a, i) => a + itemCost(i, pax), 0);
    c.transport += t; c.fuel += f; c.hotels += h; c.meals += m; c.excursions += e;
    c.km += d.transport.reduce((a, l) => a + ((TRANSPORT[l.type] || {}).km ? num(l.km) : 0), 0);
    c.perDay.push(t + h + m + e);
  }
  c.staff = trip.staff.reduce((a, s) => a + staffCost(s, days), 0);
  c.cost = c.transport + c.hotels + c.meals + c.excursions + c.staff;
  c.inflation = c.cost * num(trip.inflation) / 100;
  c.margin = (c.cost + c.inflation) * num(trip.margin) / 100;
  c.total = c.cost + c.inflation + c.margin;
  const step = num(trip.rounding) || 1;
  c.perPerson = Math.ceil(c.total / pax / step) * step;
  c.revenue = c.perPerson * pax;
  c.profit = c.revenue - c.cost - c.inflation;
  c.pax = pax; c.days = days;
  return c;
}

const TIERS = [10, 15, 20, 25, 30, 35, 40, 45, 50];

function buildPublic(trip) {
  const c = calc(trip);
  const has = k => trip.days.some(d => k === 'hotel' ? num((d.hotel || {}).amount) > 0 : d[k].some(i => num(i.amount) > 0));
  const types = [...new Set(trip.days.flatMap(d => d.transport.map(l => l.type)))];
  return {
    title: trip.title, dates: trip.dates, intro: trip.intro, lang: trip.lang, currency: trip.currency,
    days: trip.days.map(d => ({
      title: d.title, overnight: d.overnight, program: d.program,
      transport: [...new Set(d.transport.map(l => l.type))],
      excursions: d.excursions.filter(i => i.name).map(i => i.name)
    })),
    nights: trip.days.filter(d => num((d.hotel || {}).amount) > 0).length,
    includes: { hotel: has('hotel'), meals: has('meals'), excursions: has('excursions'), transport: types, staff: trip.staff.map(s => s.role).filter(Boolean) },
    pax: c.pax, perPerson: c.perPerson,
    tiers: trip.showTiers ? TIERS.map(p => ({ pax: p, price: calc(trip, p).perPerson })) : null,
    updated: new Date().toISOString().slice(0, 10)
  };
}
if (typeof module !== 'undefined') module.exports = { calc, buildPublic };
