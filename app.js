// Tour calculator — client page + agent calculator (Supabase storage)
'use strict';
// ---- page ----
const $root = document.getElementById('root');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const L = {
  uk: {days:'днів',nights:'ночей',price:'Ціна за особу',group:'при групі',persons:'осіб',day:'День',overnight:'Ночівля',includes:'У вартість входить',hotel:'Проживання',meals:'Харчування за програмою',exc:'Вхідні квитки та екскурсії',transport:'Транспорт',staff:'Супровід',tiers:'Ціна залежно від розміру групи',groupSize:'Група',pp:'за особу',route:'Маршрут',program:'Програма по днях',notpub:'Програма ще готується. Загляньте трохи пізніше.',updated:'Ціни актуальні на',tours:'Наші тури',from:'від',back:'← Усі тури'},
  pl: {days:'dni',nights:'nocy',price:'Cena za osobę',group:'przy grupie',persons:'osób',day:'Dzień',overnight:'Nocleg',includes:'Cena obejmuje',hotel:'Zakwaterowanie',meals:'Wyżywienie wg programu',exc:'Bilety wstępu i wycieczki',transport:'Transport',staff:'Opieka',tiers:'Cena zależnie od wielkości grupy',groupSize:'Grupa',pp:'za osobę',route:'Trasa',program:'Program dzień po dniu',notpub:'Program jest w przygotowaniu. Zajrzyj trochę później.',updated:'Ceny aktualne na',tours:'Nasze wycieczki',from:'od',back:'← Wszystkie wycieczki'},
  en: {days:'days',nights:'nights',price:'Price per person',group:'for a group of',persons:'people',day:'Day',overnight:'Overnight',includes:'The price includes',hotel:'Accommodation',meals:'Meals as per program',exc:'Entrance tickets and excursions',transport:'Transport',staff:'Escort',tiers:'Price by group size',groupSize:'Group of',pp:'per person',route:'Route',program:'Day-by-day program',notpub:'The program is being prepared. Please check back later.',updated:'Prices valid as of',tours:'Our tours',from:'from',back:'← All tours'},
  zh: {days:'天',nights:'晚',price:'每人价格',group:'团队人数',persons:'人',day:'第',overnight:'住宿',includes:'价格包含',hotel:'住宿',meals:'按行程安排的餐饮',exc:'景点门票和游览',transport:'交通',staff:'陪同',tiers:'不同团队人数的价格',groupSize:'团队',pp:'每人',route:'路线',program:'每日行程',notpub:'行程正在准备中，请稍后再来查看。',updated:'价格更新于',tours:'我们的行程',from:'起',back:'← 全部行程'}
};
const LANGS = [['uk', 'UA'], ['pl', 'PL'], ['en', 'EN'], ['zh', '中文']];
const langSwitch = (cur, act) => '<span class="langs" role="group" aria-label="Language">' + LANGS.map(([v, t]) => '<button data-act="' + act + '" data-l="' + v + '"' + (v === cur ? ' aria-pressed="true"' : '') + '>' + t + '</button>').join('') + '</span>';
let pubLang = null; try { pubLang = localStorage.getItem('pubLang'); } catch (e) {}
// ---- storage: Supabase (config.js) ----
const CFG = window.TOUR_CONFIG || {};
const sb = CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
// published client data: [{id, ...public}]
let PUBS = [], pubsLoaded = false, pubsError = '';
async function loadPublished() {
  if (!sb) { pubsLoaded = true; pubsError = 'config'; return; }
  const { data, error } = await sb.from('published').select('id,data,position').order('position');
  if (error) pubsError = error.message || 'error'; else PUBS = data.map(r => ({ id: r.id, ...r.data }));
  pubsLoaded = true;
}
const errText = e => (e && (e.message || e.code)) || u('помилка');
const pubLangFor = p => L[pubLang] ? pubLang : (p && L[p.lang] ? p.lang : 'pl');
function stopsOf(p) { const s = []; p.days.forEach(d => { const o = (d.overnight || '').trim(); if (o && s[s.length - 1] !== o) s.push(o); }); return s; }
function publicListHTML(list) {
  const lang = pubLangFor(list[0]), t = L[lang];
  return '<div class="pubbar">' + langSwitch(lang, 'pubLang') + '</div><div class="pub"><h1 style="font-size:clamp(28px,5vw,40px)">' + t.tours + '</h1><div class="tourlist">' +
    list.map(p => '<a class="tourcard" href="#t-' + esc(p.id) + '"><div class="eyebrow">' + esc(p.dates || (p.days.length + ' ' + t.days)) + '</div><h2>' + esc(p.title) + '</h2>' +
      '<div class="muted" style="font-size:14px">' + stopsOf(p).map(esc).join(' → ') + '</div>' +
      '<div class="tourfoot"><span class="chip">' + p.days.length + ' ' + t.days + '</span><span><span class="muted" style="font-size:13px">' + t.from + ' </span><b class="num">' + money(Math.min(p.perPerson, ...(p.tiers || []).map(r => r.price)), p.currency) + '</b></span></div></a>').join('') +
    '</div></div>';
}
const money = (v, cur) => new Intl.NumberFormat('uk-UA', {maximumFractionDigits: 0}).format(Math.round(v || 0)) + ' ' + esc(cur || '');

function programHTML(text) {
  let out = '', list = false;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim(); if (!line) continue;
    if (line.startsWith('- ')) { if (!list) { out += '<ul>'; list = true; } out += '<li>' + esc(line.slice(2)) + '</li>'; }
    else { if (list) { out += '</ul>'; list = false; } out += '<p>' + esc(line) + '</p>'; }
  }
  return out + (list ? '</ul>' : '');
}

function publicHTML(p, back) {
  const lang = pubLangFor(p);
  const sw = '<div class="pubbar">' + (back ? '<a class="backlink" href="#">' + L[lang].back + '</a>' : '') + langSwitch(lang, 'pubLang') + '</div>';
  if (!p) return sw + '<div class="empty"><h1>' + esc(L[lang].notpub) + '</h1></div>';
  const t = L[lang], tr = k => { const x = TRANSPORT[k] || TRANSPORT.other; return x[lang === 'uk' ? 'ua' : lang] || x.en; };
  const stops = stopsOf(p);
  const inc = [];
  if (p.includes.hotel) inc.push(t.hotel + (p.nights ? ' — ' + p.nights + ' ' + t.nights : ''));
  if (p.includes.meals) inc.push(t.meals);
  if (p.includes.excursions) inc.push(t.exc);
  if (p.includes.transport.length) inc.push(t.transport + ': ' + p.includes.transport.map(tr).join(', ').toLowerCase());
  if (p.includes.staff.length) inc.push(t.staff + ': ' + p.includes.staff.join(', ').toLowerCase());
  return sw + '<div class="pub">' +
    '<header class="hero"><div><div class="eyebrow">' + esc(p.dates || (p.days.length + ' ' + t.days)) + '</div><h1>' + esc(p.title) + '</h1>' +
      (p.intro ? '<p>' + esc(p.intro) + '</p>' : '') +
      '<div class="chips"><span class="chip">' + p.days.length + ' ' + t.days + '</span>' + (p.nights ? '<span class="chip">' + p.nights + ' ' + t.nights + '</span>' : '') +
      p.includes.transport.map(k => '<span class="chip">' + esc(tr(k)) + '</span>').join('') + '</div></div>' +
      '<div class="pricecard"><div class="eyebrow" style="color:inherit;opacity:.8">' + t.price + '</div><div class="big num">' + money(p.perPerson, p.currency) + '</div><div style="font-size:13px;opacity:.85;margin-top:6px">' + t.group + ' ' + p.pax + ' ' + t.persons + '</div></div></header>' +
    (stops.length > 1 ? '<section class="route" aria-label="' + t.route + '"><ol>' + stops.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol></section>' : '') +
    '<section><h2 style="font-size:24px;margin-bottom:4px">' + t.program + '</h2>' +
      p.days.map((d, i) => '<article class="pday"><div class="daynum">' + (i + 1) + '</div><div><div class="eyebrow">' + (lang === 'zh' ? '第 ' + (i + 1) + ' 天' : t.day + ' ' + (i + 1)) + '</div><h3>' + esc(d.title) + '</h3>' +
        '<div class="meta">' + [d.transport.map(tr).join(' · '), d.overnight ? t.overnight + ': ' + esc(d.overnight) : ''].filter(Boolean).join(' — ') + '</div>' +
        '<div class="prog">' + programHTML(d.program) + '</div></div></article>').join('') + '</section>' +
    (inc.length ? '<section class="box"><h2>' + t.includes + '</h2><ul class="inc">' + inc.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>' : '') +
    (p.tiers ? '<section class="box"><h2>' + t.tiers + '</h2><div style="overflow-x:auto"><table class="tiers"><tbody>' +
      p.tiers.map(r => '<tr' + (r.pax === p.pax ? ' class="cur"' : '') + '><td>' + t.groupSize + ' ' + r.pax + ' ' + t.persons + '</td><td class="num">' + money(r.price, p.currency) + ' ' + t.pp + '</td></tr>').join('') +
      '</tbody></table></div></section>' : '') +
    '<p class="muted" style="font-size:13px">' + t.updated + ' ' + esc(p.updated) + '</p></div>';
}

// ---- agent UI language ----
let uiLang = 'pl'; try { uiLang = localStorage.getItem('uiLang') || (/^(uk|ru)/.test(navigator.language) ? 'uk' : 'pl'); } catch (e) {}
const UI = { pl: {"Новий день": "Nowy dzień", "Нова поїздка": "Nowy wyjazd", "помилка": "błąd", "Не вдалося зберегти (": "Nie udało się zapisać (", "). Перевірте з’єднання і змініть будь-яке поле ще раз.": "). Sprawdź połączenie i zmień dowolne pole jeszcze raz.", "Зберігаю…": "Zapisuję…", "Збережено": "Zapisano", " · клієнти бачать стару версію": " · klienci widzą starą wersję", " · клієнти бачать актуальну версію": " · klienci widzą aktualną wersję", "за особу": "za osobę", "за групу": "za grupę", "Вид": "Rodzaj", "Ділянка / опис": "Odcinek / opis", "Км": "Km", "л/100 км": "l/100 km", "Пальне, за л": "Paliwo, za l", "Дод. витрати": "Inne koszty", "Місць": "Miejsc", "Вартість": "Koszt", "Як рахувати": "Jak liczyć", "\" aria-label=\"Видалити\">✕</button></div>": "\" aria-label=\"Usuń\">✕</button></div>", "Назва": "Nazwa", "Назва дня": "Nazwa dnia", "Ночівля (місто)": "Nocleg (miasto)", "Програма для клієнтів (рядок з «- » стане пунктом списку)": "Program dla klientów (wiersz zaczynający się od «- » będzie punktem listy)", "<div class=\"sub\"><h3>Транспорт</h3>": "<div class=\"sub\"><h3>Transport</h3>", "<div class=\"sub\"><h3>Готель</h3><div class=\"row r-item\">": "<div class=\"sub\"><h3>Hotel</h3><div class=\"row r-item\">", "Вартість за ніч": "Koszt za noc", "<div class=\"sub\"><h3>Харчування</h3>": "<div class=\"sub\"><h3>Wyżywienie</h3>", ".meals\">+ Прийом їжі</button></div></div>": ".meals\">+ Posiłek</button></div></div>", "<div class=\"sub\"><h3>Екскурсії та квитки</h3>": "<div class=\"sub\"><h3>Wycieczki i bilety</h3>", ".excursions\">+ Екскурсія</button></div></div>": ".excursions\">+ Wycieczka</button></div></div>", "\" data-dir=\"-1\">↑ Вище</button>": "\" data-dir=\"-1\">↑ Wyżej</button>", "\" data-dir=\"1\">↓ Нижче</button>": "\" data-dir=\"1\">↓ Niżej</button>", "\">Дублювати</button><button data-act=\"delDay\" data-i=\"": "\">Duplikuj</button><button data-act=\"delDay\" data-i=\"", "\" style=\"color:var(--danger)\">Видалити день</button></div></div></details>": "\" style=\"color:var(--danger)\">Usuń dzień</button></div></div></details>", "Роль": "Rola", "Ставка": "Stawka", "За що": "Za co", "за день": "za dzień", "за поїздку": "za wyjazd", "Осіб": "Osób", "Днів*": "Dni*", "<div class=\"preview-bar\"><span>Так клієнти побачать сторінку після публікації</span><span style=\"display:flex;gap:8px\"><button data-act=\"view\" data-v=\"edit\">← До налаштувань</button><button data-act=\"publish\">Опублікувати</button></span></div>": "<div class=\"preview-bar\"><span>Tak klienci zobaczą stronę po publikacji</span><span style=\"display:flex;gap:8px\"><button data-act=\"view\" data-v=\"edit\">← Do ustawień</button><button data-act=\"publish\">Opublikuj</button></span></div>", "<div class=\"top\"><div><div class=\"eyebrow\">Кабінет агента</div><h1>": "<div class=\"top\"><div><div class=\"eyebrow\">Panel agenta</div><h1>", "Поїздка": "Wyjazd", "<button data-act=\"view\" data-v=\"preview\">Вигляд для клієнтів</button><button class=\"btn-main\" data-act=\"publish\">Опублікувати</button></div></div>": "<button data-act=\"view\" data-v=\"preview\">Widok dla klientów</button><button class=\"btn-main\" data-act=\"publish\">Opublikuj</button></div></div>", "<div class=\"note\" style=\"margin-bottom:16px\">Ціни нижче — приклад, щоб показати розрахунок. Маршрут узято з вашого PDF. Замініть суми на свої, і ця примітка зникне після першої зміни. <button class=\"btn-ghost\" data-act=\"hideNote\">Сховати</button></div>": "<div class=\"note\" style=\"margin-bottom:16px\">Ceny poniżej to przykład pokazujący kalkulację. Trasa pochodzi z PDF. Wpisz własne kwoty, a ta notatka zniknie po pierwszej zmianie. <button class=\"btn-ghost\" data-act=\"hideNote\">Ukryj</button></div>", "<section class=\"sec\"><h2>Поїздка</h2><div class=\"fields\">": "<section class=\"sec\"><h2>Wyjazd</h2><div class=\"fields\">", "Назва для клієнтів": "Nazwa dla klientów", "Дати": "Daty", "12–17 травня 2027": "12–17 maja 2027", "Мова сторінки": "Język strony dla klientów", "Валюта": "Waluta", "Короткий опис": "Krótki opis", "<section class=\"sec\"><h2>Ціноутворення</h2><div class=\"fields\">": "<section class=\"sec\"><h2>Wycena</h2><div class=\"fields\">", "Туристів": "Turystów", "Маржа, %": "Marża, %", "Запас на інфляцію, %": "Rezerwa na inflację, %", "Округлення ціни до": "Zaokrąglaj cenę do", "Пальне за замовч., за л": "Paliwo domyślnie, za l", "Розхід за замовч., л/100 км": "Spalanie domyślnie, l/100 km", "<div class=\"dayacts\"><button data-act=\"applyFuel\">Застосувати пальне і розхід до всіх автобусів</button></div>": "<div class=\"dayacts\"><button data-act=\"applyFuel\">Zastosuj paliwo i spalanie do wszystkich autokarów</button></div>", "> Показувати клієнтам ціну для різних розмірів групи</label></section>": "> Pokazuj klientom ceny dla różnych wielkości grupy</label></section>", "<section class=\"sec\"><h2>Персонал <span class=\"num\" data-out=\"staffTotal\"></span></h2>": "<section class=\"sec\"><h2>Personel <span class=\"num\" data-out=\"staffTotal\"></span></h2>", "Водій": "Kierowca", "Гід": "Przewodnik", "Менеджер": "Manager", "Пілот групи": "Pilot grupy", "<div class=\"muted\" style=\"font-size:12px\">* Днів: 0 = уся поїздка.</div></section>": "<div class=\"muted\" style=\"font-size:12px\">* Dni: 0 = cały wyjazd.</div></section>", "<section><div style=\"display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 10px\"><h2 style=\"font-size:20px\">Маршрут по днях</h2><span class=\"muted num\" data-out=\"kmTotal\"></span></div>": "<section><div style=\"display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 10px\"><h2 style=\"font-size:20px\">Trasa dzień po dniu</h2><span class=\"muted num\" data-out=\"kmTotal\"></span></div>", "<button class=\"btn-add\" data-act=\"addDay\" style=\"width:100%;padding:12px\">+ Додати день</button></section>": "<button class=\"btn-add\" data-act=\"addDay\" style=\"width:100%;padding:12px\">+ Dodaj dzień</button></section>", "Без назви": "Bez nazwy", "ночівля: ": "nocleg: ", " авт.</span>": " aut.</span>", " км · пальне ": " km · paliwo ", "<div class=\"head\"><div class=\"eyebrow\" style=\"color:inherit;opacity:.8\">Ціна для клієнта, за особу</div><div class=\"big num\">": "<div class=\"head\"><div class=\"eyebrow\" style=\"color:inherit;opacity:.8\">Cena dla klienta za osobę</div><div class=\"big num\">", " туристів · ": " turystów · ", " днів</div></div>": " dni</div></div>", "Транспорт": "Transport", "у т.ч. пальне": "w tym paliwo", "Готелі": "Hotele", "Харчування": "Wyżywienie", "Екскурсії": "Wycieczki", "Персонал": "Personel", "<div class=\"kv sum\"><span>Собівартість</span><span class=\"num\">": "<div class=\"kv sum\"><span>Koszt własny</span><span class=\"num\">", "<div class=\"kv\"><span>Запас на інфляцію ": "<div class=\"kv\"><span>Rezerwa na inflację ", "<div class=\"kv\"><span>Маржа ": "<div class=\"kv\"><span>Marża ", "<div class=\"kv sum\"><span>Виручка (з округленням)</span><span class=\"num\">": "<div class=\"kv sum\"><span>Przychód (po zaokrągleniu)</span><span class=\"num\">", "<div class=\"kv\"><span>Собівартість на особу</span><span class=\"num\">": "<div class=\"kv\"><span>Koszt własny na osobę</span><span class=\"num\">", "<div class=\"kv\" style=\"color:var(--accent);font-weight:600\"><span>Ваш прибуток</span><span class=\"num\">": "<div class=\"kv\" style=\"color:var(--accent);font-weight:600\"><span>Twój zysk</span><span class=\"num\">", "</div><div class=\"body\"><div class=\"eyebrow\">Ціна від кількості туристів</div><table class=\"tiers\"><tbody>": "</div><div class=\"body\"><div class=\"eyebrow\">Cena wg liczby turystów</div><table class=\"tiers\"><tbody>", " осіб</td><td class=\"num\">": " osób</td><td class=\"num\">", "Натисніть ще раз, щоб видалити": "Kliknij jeszcze raz, aby usunąć", "Видалити день": "Usuń dzień", "Публікація недоступна тут": "Publikacja niedostępna w tym widoku", "Публікую…": "Publikuję…", "Сторінку щойно оновили, перезавантажую…": "Strona została właśnie zaktualizowana, przeładowuję…", "Немає прав на публікацію": "Brak uprawnień do publikacji", "Забагато публікацій, спробуйте за хвилину": "Za dużo publikacji, spróbuj za minutę", "Не вдалося опублікувати, спробуйте ще раз": "Nie udało się opublikować, spróbuj ponownie"}, en: {"Новий день": "New day", "Нова поїздка": "New trip", "помилка": "error", "Не вдалося зберегти (": "Could not save (", "). Перевірте з’єднання і змініть будь-яке поле ще раз.": "). Check your connection and change any field again.", "Зберігаю…": "Saving…", "Збережено": "Saved", " · клієнти бачать стару версію": " · clients see an old version", " · клієнти бачать актуальну версію": " · clients see the current version", "за особу": "per person", "за групу": "per group", "Вид": "Type", "Ділянка / опис": "Leg / description", "Км": "Km", "л/100 км": "l/100 km", "Пальне, за л": "Fuel, per l", "Дод. витрати": "Other costs", "Місць": "Seats", "Вартість": "Cost", "Як рахувати": "How to count", "\" aria-label=\"Видалити\">✕</button></div>": "\" aria-label=\"Delete\">✕</button></div>", "Назва": "Name", "Назва дня": "Day name", "Ночівля (місто)": "Overnight (city)", "Програма для клієнтів (рядок з «- » стане пунктом списку)": "Program for clients (a line starting with «- » becomes a bullet)", "<div class=\"sub\"><h3>Транспорт</h3>": "<div class=\"sub\"><h3>Transport</h3>", "<div class=\"sub\"><h3>Готель</h3><div class=\"row r-item\">": "<div class=\"sub\"><h3>Hotel</h3><div class=\"row r-item\">", "Вартість за ніч": "Cost per night", "<div class=\"sub\"><h3>Харчування</h3>": "<div class=\"sub\"><h3>Meals</h3>", ".meals\">+ Прийом їжі</button></div></div>": ".meals\">+ Meal</button></div></div>", "<div class=\"sub\"><h3>Екскурсії та квитки</h3>": "<div class=\"sub\"><h3>Excursions and tickets</h3>", ".excursions\">+ Екскурсія</button></div></div>": ".excursions\">+ Excursion</button></div></div>", "\" data-dir=\"-1\">↑ Вище</button>": "\" data-dir=\"-1\">↑ Up</button>", "\" data-dir=\"1\">↓ Нижче</button>": "\" data-dir=\"1\">↓ Down</button>", "\">Дублювати</button><button data-act=\"delDay\" data-i=\"": "\">Duplicate</button><button data-act=\"delDay\" data-i=\"", "\" style=\"color:var(--danger)\">Видалити день</button></div></div></details>": "\" style=\"color:var(--danger)\">Delete day</button></div></div></details>", "Роль": "Role", "Ставка": "Rate", "За що": "Paid", "за день": "per day", "за поїздку": "per trip", "Осіб": "People", "Днів*": "Days*", "<div class=\"preview-bar\"><span>Так клієнти побачать сторінку після публікації</span><span style=\"display:flex;gap:8px\"><button data-act=\"view\" data-v=\"edit\">← До налаштувань</button><button data-act=\"publish\">Опублікувати</button></span></div>": "<div class=\"preview-bar\"><span>This is what clients see after publishing</span><span style=\"display:flex;gap:8px\"><button data-act=\"view\" data-v=\"edit\">← Back to settings</button><button data-act=\"publish\">Publish</button></span></div>", "<div class=\"top\"><div><div class=\"eyebrow\">Кабінет агента</div><h1>": "<div class=\"top\"><div><div class=\"eyebrow\">Agent panel</div><h1>", "Поїздка": "Trip", "<button data-act=\"view\" data-v=\"preview\">Вигляд для клієнтів</button><button class=\"btn-main\" data-act=\"publish\">Опублікувати</button></div></div>": "<button data-act=\"view\" data-v=\"preview\">Client view</button><button class=\"btn-main\" data-act=\"publish\">Publish</button></div></div>", "<div class=\"note\" style=\"margin-bottom:16px\">Ціни нижче — приклад, щоб показати розрахунок. Маршрут узято з вашого PDF. Замініть суми на свої, і ця примітка зникне після першої зміни. <button class=\"btn-ghost\" data-act=\"hideNote\">Сховати</button></div>": "<div class=\"note\" style=\"margin-bottom:16px\">The prices below are an example of the calculation. The route comes from the PDF. Enter your own amounts and this note disappears after the first change. <button class=\"btn-ghost\" data-act=\"hideNote\">Hide</button></div>", "<section class=\"sec\"><h2>Поїздка</h2><div class=\"fields\">": "<section class=\"sec\"><h2>Trip</h2><div class=\"fields\">", "Назва для клієнтів": "Name for clients", "Дати": "Dates", "12–17 травня 2027": "12–17 May 2027", "Мова сторінки": "Client page language", "Валюта": "Currency", "Короткий опис": "Short description", "<section class=\"sec\"><h2>Ціноутворення</h2><div class=\"fields\">": "<section class=\"sec\"><h2>Pricing</h2><div class=\"fields\">", "Туристів": "Tourists", "Маржа, %": "Margin, %", "Запас на інфляцію, %": "Inflation reserve, %", "Округлення ціни до": "Round price to", "Пальне за замовч., за л": "Default fuel price, per l", "Розхід за замовч., л/100 км": "Default consumption, l/100 km", "<div class=\"dayacts\"><button data-act=\"applyFuel\">Застосувати пальне і розхід до всіх автобусів</button></div>": "<div class=\"dayacts\"><button data-act=\"applyFuel\">Apply fuel and consumption to all coaches</button></div>", "> Показувати клієнтам ціну для різних розмірів групи</label></section>": "> Show clients prices for different group sizes</label></section>", "<section class=\"sec\"><h2>Персонал <span class=\"num\" data-out=\"staffTotal\"></span></h2>": "<section class=\"sec\"><h2>Staff <span class=\"num\" data-out=\"staffTotal\"></span></h2>", "Водій": "Driver", "Гід": "Guide", "Менеджер": "Manager", "Пілот групи": "Tour leader", "<div class=\"muted\" style=\"font-size:12px\">* Днів: 0 = уся поїздка.</div></section>": "<div class=\"muted\" style=\"font-size:12px\">* Days: 0 = whole trip.</div></section>", "<section><div style=\"display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 10px\"><h2 style=\"font-size:20px\">Маршрут по днях</h2><span class=\"muted num\" data-out=\"kmTotal\"></span></div>": "<section><div style=\"display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 10px\"><h2 style=\"font-size:20px\">Route day by day</h2><span class=\"muted num\" data-out=\"kmTotal\"></span></div>", "<button class=\"btn-add\" data-act=\"addDay\" style=\"width:100%;padding:12px\">+ Додати день</button></section>": "<button class=\"btn-add\" data-act=\"addDay\" style=\"width:100%;padding:12px\">+ Add day</button></section>", "Без назви": "Untitled", "ночівля: ": "overnight: ", " авт.</span>": " veh.</span>", " км · пальне ": " km · fuel ", "<div class=\"head\"><div class=\"eyebrow\" style=\"color:inherit;opacity:.8\">Ціна для клієнта, за особу</div><div class=\"big num\">": "<div class=\"head\"><div class=\"eyebrow\" style=\"color:inherit;opacity:.8\">Client price per person</div><div class=\"big num\">", " туристів · ": " tourists · ", " днів</div></div>": " days</div></div>", "Транспорт": "Transport", "у т.ч. пальне": "incl. fuel", "Готелі": "Hotels", "Харчування": "Meals", "Екскурсії": "Excursions", "Персонал": "Staff", "<div class=\"kv sum\"><span>Собівартість</span><span class=\"num\">": "<div class=\"kv sum\"><span>Cost</span><span class=\"num\">", "<div class=\"kv\"><span>Запас на інфляцію ": "<div class=\"kv\"><span>Inflation reserve ", "<div class=\"kv\"><span>Маржа ": "<div class=\"kv\"><span>Margin ", "<div class=\"kv sum\"><span>Виручка (з округленням)</span><span class=\"num\">": "<div class=\"kv sum\"><span>Revenue (rounded)</span><span class=\"num\">", "<div class=\"kv\"><span>Собівартість на особу</span><span class=\"num\">": "<div class=\"kv\"><span>Cost per person</span><span class=\"num\">", "<div class=\"kv\" style=\"color:var(--accent);font-weight:600\"><span>Ваш прибуток</span><span class=\"num\">": "<div class=\"kv\" style=\"color:var(--accent);font-weight:600\"><span>Your profit</span><span class=\"num\">", "</div><div class=\"body\"><div class=\"eyebrow\">Ціна від кількості туристів</div><table class=\"tiers\"><tbody>": "</div><div class=\"body\"><div class=\"eyebrow\">Price by number of tourists</div><table class=\"tiers\"><tbody>", " осіб</td><td class=\"num\">": " people</td><td class=\"num\">", "Натисніть ще раз, щоб видалити": "Click again to delete", "Видалити день": "Delete day", "Публікація недоступна тут": "Publishing isn't available in this view", "Публікую…": "Publishing…", "Сторінку щойно оновили, перезавантажую…": "The page was just updated, reloading…", "Немає прав на публікацію": "No permission to publish", "Забагато публікацій, спробуйте за хвилину": "Too many publishes, try again in a minute", "Не вдалося опублікувати, спробуйте ще раз": "Could not publish, try again"}, zh: {"Новий день": "新的一天", "Нова поїздка": "新行程", "помилка": "错误", "Не вдалося зберегти (": "保存失败（", "). Перевірте з’єднання і змініть будь-яке поле ще раз.": "）。请检查网络连接，然后再修改任意字段。", "Зберігаю…": "正在保存…", "Збережено": "已保存", " · клієнти бачать стару версію": " · 客户看到的是旧版本", " · клієнти бачать актуальну версію": " · 客户看到的是最新版本", "за особу": "每人", "за групу": "每团", "Вид": "类型", "Ділянка / опис": "路段 / 说明", "Км": "公里", "л/100 км": "升/100公里", "Пальне, за л": "燃油，每升", "Дод. витрати": "其他费用", "Місць": "座位", "Вартість": "费用", "Як рахувати": "计费方式", "\" aria-label=\"Видалити\">✕</button></div>": "\" aria-label=\"删除\">✕</button></div>", "Назва": "名称", "Назва дня": "当天名称", "Ночівля (місто)": "住宿（城市）", "Програма для клієнтів (рядок з «- » стане пунктом списку)": "给客户的行程（以 «- » 开头的行会显示为列表项）", "<div class=\"sub\"><h3>Транспорт</h3>": "<div class=\"sub\"><h3>交通</h3>", "<div class=\"sub\"><h3>Готель</h3><div class=\"row r-item\">": "<div class=\"sub\"><h3>酒店</h3><div class=\"row r-item\">", "Вартість за ніч": "每晚费用", "<div class=\"sub\"><h3>Харчування</h3>": "<div class=\"sub\"><h3>餐饮</h3>", ".meals\">+ Прийом їжі</button></div></div>": ".meals\">+ 餐食</button></div></div>", "<div class=\"sub\"><h3>Екскурсії та квитки</h3>": "<div class=\"sub\"><h3>游览与门票</h3>", ".excursions\">+ Екскурсія</button></div></div>": ".excursions\">+ 游览</button></div></div>", "\" data-dir=\"-1\">↑ Вище</button>": "\" data-dir=\"-1\">↑ 上移</button>", "\" data-dir=\"1\">↓ Нижче</button>": "\" data-dir=\"1\">↓ 下移</button>", "\">Дублювати</button><button data-act=\"delDay\" data-i=\"": "\">复制</button><button data-act=\"delDay\" data-i=\"", "\" style=\"color:var(--danger)\">Видалити день</button></div></div></details>": "\" style=\"color:var(--danger)\">删除这一天</button></div></div></details>", "Роль": "职务", "Ставка": "费率", "За що": "计费", "за день": "每天", "за поїздку": "每次行程", "Осіб": "人数", "Днів*": "天数*", "<div class=\"preview-bar\"><span>Так клієнти побачать сторінку після публікації</span><span style=\"display:flex;gap:8px\"><button data-act=\"view\" data-v=\"edit\">← До налаштувань</button><button data-act=\"publish\">Опублікувати</button></span></div>": "<div class=\"preview-bar\"><span>发布后客户看到的页面</span><span style=\"display:flex;gap:8px\"><button data-act=\"view\" data-v=\"edit\">← 返回设置</button><button data-act=\"publish\">发布</button></span></div>", "<div class=\"top\"><div><div class=\"eyebrow\">Кабінет агента</div><h1>": "<div class=\"top\"><div><div class=\"eyebrow\">代理面板</div><h1>", "Поїздка": "行程", "<button data-act=\"view\" data-v=\"preview\">Вигляд для клієнтів</button><button class=\"btn-main\" data-act=\"publish\">Опублікувати</button></div></div>": "<button data-act=\"view\" data-v=\"preview\">客户视图</button><button class=\"btn-main\" data-act=\"publish\">发布</button></div></div>", "<div class=\"note\" style=\"margin-bottom:16px\">Ціни нижче — приклад, щоб показати розрахунок. Маршрут узято з вашого PDF. Замініть суми на свої, і ця примітка зникне після першої зміни. <button class=\"btn-ghost\" data-act=\"hideNote\">Сховати</button></div>": "<div class=\"note\" style=\"margin-bottom:16px\">以下价格仅为计算示例。路线来自 PDF。填入您自己的金额后，此提示会在第一次修改后消失。 <button class=\"btn-ghost\" data-act=\"hideNote\">隐藏</button></div>", "<section class=\"sec\"><h2>Поїздка</h2><div class=\"fields\">": "<section class=\"sec\"><h2>行程</h2><div class=\"fields\">", "Назва для клієнтів": "客户看到的名称", "Дати": "日期", "12–17 травня 2027": "2027年5月12–17日", "Мова сторінки": "客户页面语言", "Валюта": "货币", "Короткий опис": "简介", "<section class=\"sec\"><h2>Ціноутворення</h2><div class=\"fields\">": "<section class=\"sec\"><h2>定价</h2><div class=\"fields\">", "Туристів": "游客人数", "Маржа, %": "利润率，%", "Запас на інфляцію, %": "通胀储备，%", "Округлення ціни до": "价格取整到", "Пальне за замовч., за л": "默认油价，每升", "Розхід за замовч., л/100 км": "默认油耗，升/100公里", "<div class=\"dayacts\"><button data-act=\"applyFuel\">Застосувати пальне і розхід до всіх автобусів</button></div>": "<div class=\"dayacts\"><button data-act=\"applyFuel\">将油价和油耗应用到所有大巴</button></div>", "> Показувати клієнтам ціну для різних розмірів групи</label></section>": "> 向客户显示不同团队人数的价格</label></section>", "<section class=\"sec\"><h2>Персонал <span class=\"num\" data-out=\"staffTotal\"></span></h2>": "<section class=\"sec\"><h2>人员 <span class=\"num\" data-out=\"staffTotal\"></span></h2>", "Водій": "司机", "Гід": "导游", "Менеджер": "经理", "Пілот групи": "领队", "<div class=\"muted\" style=\"font-size:12px\">* Днів: 0 = уся поїздка.</div></section>": "<div class=\"muted\" style=\"font-size:12px\">* 天数：0 = 整个行程。</div></section>", "<section><div style=\"display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 10px\"><h2 style=\"font-size:20px\">Маршрут по днях</h2><span class=\"muted num\" data-out=\"kmTotal\"></span></div>": "<section><div style=\"display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 10px\"><h2 style=\"font-size:20px\">每日路线</h2><span class=\"muted num\" data-out=\"kmTotal\"></span></div>", "<button class=\"btn-add\" data-act=\"addDay\" style=\"width:100%;padding:12px\">+ Додати день</button></section>": "<button class=\"btn-add\" data-act=\"addDay\" style=\"width:100%;padding:12px\">+ 添加一天</button></section>", "Без назви": "未命名", "ночівля: ": "住宿：", " авт.</span>": " 辆</span>", " км · пальне ": " 公里 · 燃油 ", "<div class=\"head\"><div class=\"eyebrow\" style=\"color:inherit;opacity:.8\">Ціна для клієнта, за особу</div><div class=\"big num\">": "<div class=\"head\"><div class=\"eyebrow\" style=\"color:inherit;opacity:.8\">客户价格（每人）</div><div class=\"big num\">", " туристів · ": " 位游客 · ", " днів</div></div>": " 天</div></div>", "Транспорт": "交通", "у т.ч. пальне": "其中燃油", "Готелі": "酒店", "Харчування": "餐饮", "Екскурсії": "游览", "Персонал": "人员", "<div class=\"kv sum\"><span>Собівартість</span><span class=\"num\">": "<div class=\"kv sum\"><span>成本</span><span class=\"num\">", "<div class=\"kv\"><span>Запас на інфляцію ": "<div class=\"kv\"><span>通胀储备 ", "<div class=\"kv\"><span>Маржа ": "<div class=\"kv\"><span>利润率 ", "<div class=\"kv sum\"><span>Виручка (з округленням)</span><span class=\"num\">": "<div class=\"kv sum\"><span>收入（取整后）</span><span class=\"num\">", "<div class=\"kv\"><span>Собівартість на особу</span><span class=\"num\">": "<div class=\"kv\"><span>每人成本</span><span class=\"num\">", "<div class=\"kv\" style=\"color:var(--accent);font-weight:600\"><span>Ваш прибуток</span><span class=\"num\">": "<div class=\"kv\" style=\"color:var(--accent);font-weight:600\"><span>您的利润</span><span class=\"num\">", "</div><div class=\"body\"><div class=\"eyebrow\">Ціна від кількості туристів</div><table class=\"tiers\"><tbody>": "</div><div class=\"body\"><div class=\"eyebrow\">按游客人数计价</div><table class=\"tiers\"><tbody>", " осіб</td><td class=\"num\">": " 人</td><td class=\"num\">", "Натисніть ще раз, щоб видалити": "再点一次即可删除", "Видалити день": "删除这一天", "Публікація недоступна тут": "此视图无法发布", "Публікую…": "正在发布…", "Сторінку щойно оновили, перезавантажую…": "页面刚刚更新，正在重新加载…", "Немає прав на публікацію": "没有发布权限", "Забагато публікацій, спробуйте за хвилину": "发布过于频繁，请一分钟后再试", "Не вдалося опублікувати, спробуйте ще раз": "发布失败，请重试"} };
UI.pl['Сторінка клієнта'] = 'Strona klienta'; UI.en['Сторінка клієнта'] = 'Client page'; UI.zh['Сторінка клієнта'] = '客户页面';
Object.entries({"Мої тури": ["Moje wycieczki", "My tours"], "+ Новий тур": ["+ Nowa wycieczka", "+ New tour"], "← Усі тури": ["← Wszystkie wycieczki", "← All tours"], "Відкрити": ["Otwórz", "Open"], "Дублювати": ["Duplikuj", "Duplicate"], "Видалити": ["Usuń", "Delete"], "Чернетка": ["Wersja robocza", "Draft"], "На сторінці клієнта": ["Na stronie klienta", "On client page"], "Є неопубліковані зміни": ["Zmiany nieopublikowane", "Unpublished changes"], "Зникне зі сторінки клієнта після публікації": ["Zniknie ze strony klienta po publikacji", "Will leave the client page after publishing"], "Показувати клієнтам": ["Pokazuj klientom", "Show to clients"], "Опублікувати вибрані": ["Opublikuj wybrane", "Publish selected"], "Клієнти бачать актуальні тури.": ["Klienci widzą aktualne wycieczki.", "Clients see the current tours."], "Є зміни, яких клієнти ще не бачать. Натисніть «Опублікувати вибрані».": ["Są zmiany, których klienci jeszcze nie widzą. Kliknij «Opublikuj wybrane».", "Some changes are not visible to clients yet. Click «Publish selected»."], " (копія)": [" (kopia)", " (copy)"], "днів": ["dni", "days"], "Кожен тур зберігається автоматично як чернетка. Клієнти бачать лише тури з позначкою «Показувати клієнтам» після кнопки «Опублікувати вибрані».": ["Każda wycieczka zapisuje się automatycznie jako wersja robocza. Klienci widzą tylko wycieczki oznaczone «Pokazuj klientom» po kliknięciu «Opublikuj wybrane».", "Every tour saves automatically as a draft. Clients see only tours marked «Show to clients», after you click «Publish selected»."], "Тур видалено": ["Wycieczka usunięta", "Tour deleted"]}).forEach(([k, [pl, en]]) => { UI.pl[k] = pl; UI.en[k] = en; });
Object.assign(UI.zh, {"Мої тури": "我的行程", "+ Новий тур": "+ 新建行程", "← Усі тури": "← 全部行程", "Відкрити": "打开", "Дублювати": "复制", "Видалити": "删除", "Чернетка": "草稿", "На сторінці клієнта": "已在客户页面", "Є неопубліковані зміни": "有未发布的更改", "Зникне зі сторінки клієнта після публікації": "发布后将从客户页面移除", "Показувати клієнтам": "向客户显示", "Опублікувати вибрані": "发布所选", "Клієнти бачать актуальні тури.": "客户看到的是最新行程。", "Є зміни, яких клієнти ще не бачать. Натисніть «Опублікувати вибрані».": "有些更改客户还看不到。请点击“发布所选”。", " (копія)": "（副本）", "днів": "天", "Кожен тур зберігається автоматично як чернетка. Клієнти бачать лише тури з позначкою «Показувати клієнтам» після кнопки «Опублікувати вибрані».": "每个行程都会自动保存为草稿。只有勾选“向客户显示”的行程，在点击“发布所选”后才会出现在客户页面。", "Тур видалено": "行程已删除"});
const u = s => (UI[uiLang] && UI[uiLang][s]) ?? s;
const tn = k => { const t = TRANSPORT[k] || TRANSPORT.other; return t[uiLang === 'uk' ? 'ua' : uiLang] || t.en; };

// ---- agent state ----
let trips = {}, curId = null, trip = null, userEmail = '', view = 'list', openDays = new Set([0]), saving = Promise.resolve(), saveTimer = null, saveState = 'saved';
const blankDay = () => ({ title: u('Новий день'), overnight: '', program: '', transport: [], hotel: { name: '', amount: 0, per: 'person' }, meals: [], excursions: [] });
const blankTrip = () => ({ title: u('Нова поїздка'), dates: '', intro: '', lang: uiLang, currency: 'PLN', pax: 20, margin: 15, inflation: 5, fuelPrice: 6.2, consumption: 30, rounding: 10, showTiers: true, published: false, staff: [], days: [blankDay()] });
const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const newLeg = type => (TRANSPORT[type] || {}).km
  ? { type, note: '', km: 0, consumption: trip.consumption, fuelPrice: trip.fuelPrice, extra: 0, capacity: 50 }
  : { type, note: '', amount: 0, per: type === 'taxi' ? 'group' : 'person' };
function normalizeTrip(t) {
  t = JSON.parse(JSON.stringify(t || {}));
  for (const k of ['staff', 'days']) if (!Array.isArray(t[k])) t[k] = [];
  if (!t.days.length) t.days.push(blankDay());
  t.days.forEach(d => { d.transport = d.transport || []; d.meals = d.meals || []; d.excursions = d.excursions || []; d.hotel = d.hotel || { name: '', amount: 0, per: 'person' }; });
  return t;
}

function getPath(o, path) { return path.split('.').reduce((a, k) => a == null ? a : a[k], o); }
function setPath(o, path, v) { const ks = path.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }

const pubKey = p => { if (!p) return ''; const { id, updated, ...rest } = p; return JSON.stringify(rest); };
// live = on client page and current; changed = selected but clients see older or nothing; removing = still on client page but deselected/deleted
function tripState(id) {
  const t = trips[id], inPub = PUBS.find(x => x.id === id);
  if (!t) return inPub ? 'removing' : 'gone';
  if (t.published) return inPub && pubKey(buildPublic(t)) === pubKey(inPub) ? 'live' : 'changed';
  return inPub ? 'removing' : 'draft';
}
const anyDirty = () => Object.keys(trips).some(id => ['changed', 'removing'].includes(tripState(id))) || PUBS.some(x => !trips[x.id]);
const STATE_LABEL = { live: 'На сторінці клієнта', changed: 'Є неопубліковані зміни', removing: 'Зникне зі сторінки клієнта після публікації', draft: 'Чернетка' };

function scheduleSave() {
  saveState = 'saving'; paintStatus();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 700);
}
function saveNow() {
  clearTimeout(saveTimer);
  if (!curId || !trips[curId]) return saving;
  const id = curId, snapshot = JSON.parse(JSON.stringify(trips[id]));
  saving = saving.then(async () => {
      const { error } = await sb.from('trips').upsert({ id, data: snapshot, published: !!snapshot.published, updated_at: new Date().toISOString(), updated_by: userEmail });
      if (error) throw error;
    })
    .then(() => { saveState = 'saved'; paintStatus(); })
    .catch(e => { saveState = 'error:' + errText(e); paintStatus(); });
  return saving;
}
function paintStatus() {
  const el = document.getElementById('status'); if (!el) return;
  if (view === 'list') {
    const dirty = anyDirty();
    el.className = 'status' + (dirty ? ' dirty' : '');
    el.textContent = dirty ? u('Є зміни, яких клієнти ще не бачать. Натисніть «Опублікувати вибрані».') : u('Клієнти бачать актуальні тури.');
    return;
  }
  const st = tripState(curId), dirty = st === 'changed' || st === 'removing';
  el.className = 'status' + (dirty ? ' dirty' : '');
  el.textContent = saveState.startsWith('error') ? u('Не вдалося зберегти (') + saveState.slice(6) + u('). Перевірте з’єднання і змініть будь-яке поле ще раз.')
    : (saveState === 'saving' ? u('Зберігаю…') : u('Збережено')) + ' · ' + u(STATE_LABEL[st] || '');
}

function renderList() {
  const ids = Object.keys(trips).sort((x, y) => (trips[y].updatedAt || 0) - (trips[x].updatedAt || 0));
  $root.innerHTML =
    '<div class="top"><div><div class="eyebrow">' + u('Мої тури') + '</div><h1>' + u('Мої тури') + ' (' + ids.length + ')</h1><div id="status" class="status"></div></div>' +
    '<div class="acts">' + langSwitch(uiLang, 'uiLang') + '<a class="linkbtn" href="#">' + u('Сторінка клієнта') + '</a><button data-act="newTrip">' + u('+ Новий тур') + '</button><button class="btn-main" data-act="publish">' + u('Опублікувати вибрані') + '</button><button class="btn-ghost" data-act="logout">' + esc(lt().out) + '</button></div></div>' +
    '<div class="note" style="margin-bottom:16px">' + u('Кожен тур зберігається автоматично як чернетка. Клієнти бачать лише тури з позначкою «Показувати клієнтам» після кнопки «Опублікувати вибрані».') + '</div>' +
    '<div class="tripgrid">' + ids.map(id => {
      const t = trips[id], c = calc(t), st = tripState(id);
      return '<article class="tripcard st-' + st + '"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><span class="pill">' + u(STATE_LABEL[st]) + '</span><span class="num muted" style="font-size:13px">' + c.days + ' ' + u('днів') + '</span></div>' +
        '<h2>' + esc(t.title || u('Без назви')) + '</h2><div class="muted" style="font-size:13px">' + esc(t.dates || '') + '</div>' +
        '<div class="kv"><span>' + ({ pl: 'Cena za osobę', en: 'Price per person', zh: '每人价格' }[uiLang] || 'Ціна за особу') + '</span><b class="num">' + money(c.perPerson, t.currency) + '</b></div>' +
        '<label class="check"><input type="checkbox" id="pub-' + esc(id) + '" data-pub="' + esc(id) + '"' + (t.published ? ' checked' : '') + '> ' + u('Показувати клієнтам') + '</label>' +
        '<div class="dayacts"><button class="btn-main" data-act="open" data-id="' + esc(id) + '">' + u('Відкрити') + '</button><button data-act="dupTrip" data-id="' + esc(id) + '">' + u('Дублювати') + '</button><button data-act="delTrip" data-id="' + esc(id) + '" style="color:var(--danger)">' + u('Видалити') + '</button></div></article>';
    }).join('') + '</div>';
  paintStatus();
}

// ---- agent render ----
const opt = (val, cur, text) => '<option value="' + val + '"' + (val === cur ? ' selected' : '') + '>' + text + '</option>';
const numIn = (k, v, step) => '<input type="number" min="0" step="' + (step || 'any') + '" id="' + k + '" data-k="' + k + '" value="' + esc(v ?? 0) + '">';
const txtIn = (k, v, ph) => '<input type="text" id="' + k + '" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '">';
const fld = (label, inner, cls) => '<label class="f' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span>' + inner + '</label>';
const perSel = (k, v) => '<select id="' + k + '" data-k="' + k + '">' + opt('person', v, u('за особу')) + opt('group', v, u('за групу')) + '</select>';

function legRow(i, j, l) {
  const k = 'days.' + i + '.transport.' + j, km = (TRANSPORT[l.type] || {}).km;
  const typeSel = '<select id="' + k + '.type" data-k="' + k + '.type" data-re>' + Object.entries(TRANSPORT).map(([v, t]) => opt(v, l.type, tn(v))).join('') + '</select>';
  return '<div class="row r-leg' + (km ? '' : ' flat') + '">' + fld(u('Вид'), typeSel) + fld(u('Ділянка / опис'), txtIn(k + '.note', l.note, 'Kraków → Zakopane'), 'wide') +
    (km ? fld(u('Км'), numIn(k + '.km', l.km, 1)) + fld(u('л/100 км'), numIn(k + '.consumption', l.consumption)) + fld(u('Пальне, за л'), numIn(k + '.fuelPrice', l.fuelPrice)) +
      fld(u('Дод. витрати'), numIn(k + '.extra', l.extra)) + fld(u('Місць'), numIn(k + '.capacity', l.capacity, 1))
      : fld(u('Вартість'), numIn(k + '.amount', l.amount)) + fld(u('Як рахувати'), perSel(k + '.per', l.per))) +
    '<div class="cost" data-out="leg.' + i + '.' + j + '"></div><button class="btn-ghost" data-act="del" data-path="days.' + i + '.transport" data-i="' + j + u('" aria-label="Видалити">✕</button></div>');
}
function itemRow(base, j, it, ph) {
  const k = base + '.' + j;
  return '<div class="row r-item">' + fld(u('Назва'), txtIn(k + '.name', it.name, ph), 'wide') + fld(u('Вартість'), numIn(k + '.amount', it.amount)) + fld(u('Як рахувати'), perSel(k + '.per', it.per)) +
    '<div class="cost" data-out="item.' + k + '"></div><button class="btn-ghost" data-act="del" data-path="' + base + '" data-i="' + j + u('" aria-label="Видалити">✕</button></div>');
}
function dayHTML(d, i) {
  const k = 'days.' + i;
  return '<details class="day" data-day="' + i + '"' + (openDays.has(i) ? ' open' : '') + '><summary><span class="daynum">' + (i + 1) + '</span><span class="dayhead"><b data-out="dtitle.' + i + '">' + esc(d.title) + '</b><span class="muted" style="font-size:13px" data-out="dmeta.' + i + '"></span></span><span class="num" data-out="day.' + i + '"></span></summary>' +
    '<div class="daybody"><div class="fields">' + fld(u('Назва дня'), txtIn(k + '.title', d.title), '') + fld(u('Ночівля (місто)'), txtIn(k + '.overnight', d.overnight)) + '</div>' +
    fld(u('Програма для клієнтів (рядок з «- » стане пунктом списку)'), '<textarea id="' + k + '.program" data-k="' + k + '.program">' + esc(d.program) + '</textarea>') +
    u('<div class="sub"><h3>Транспорт</h3>') + d.transport.map((l, j) => legRow(i, j, l)).join('') +
      '<div class="dayacts">' + Object.entries(TRANSPORT).map(([v, t]) => '<button class="btn-add" data-act="addLeg" data-i="' + i + '" data-type="' + v + '">+ ' + tn(v) + '</button>').join('') + '</div></div>' +
    u('<div class="sub"><h3>Готель</h3><div class="row r-item">') + fld(u('Назва'), txtIn(k + '.hotel.name', d.hotel.name, 'Hotel …'), 'wide') + fld(u('Вартість за ніч'), numIn(k + '.hotel.amount', d.hotel.amount)) + fld(u('Як рахувати'), perSel(k + '.hotel.per', d.hotel.per)) + '<div class="cost" data-out="item.' + k + '.hotel"></div><span></span></div></div>' +
    u('<div class="sub"><h3>Харчування</h3>') + d.meals.map((it, j) => itemRow(k + '.meals', j, it, 'Obiad')).join('') + '<div><button class="btn-add" data-act="add" data-path="' + k + u('.meals">+ Прийом їжі</button></div></div>') +
    u('<div class="sub"><h3>Екскурсії та квитки</h3>') + d.excursions.map((it, j) => itemRow(k + '.excursions', j, it, 'Wawel')).join('') + '<div><button class="btn-add" data-act="add" data-path="' + k + u('.excursions">+ Екскурсія</button></div></div>') +
    '<div class="dayacts" style="justify-content:flex-end">' + (i > 0 ? '<button data-act="move" data-i="' + i + u('" data-dir="-1">↑ Вище</button>') : '') + (i < trip.days.length - 1 ? '<button data-act="move" data-i="' + i + u('" data-dir="1">↓ Нижче</button>') : '') +
      '<button data-act="dup" data-i="' + i + u('">Дублювати</button><button data-act="delDay" data-i="') + i + u('" style="color:var(--danger)">Видалити день</button></div></div></details>');
}
function staffRow(s, i) {
  const k = 'staff.' + i;
  return '<div class="row r-staff">' + fld(u('Роль'), txtIn(k + '.role', s.role, 'Kierowca'), 'wide') + fld(u('Ставка'), numIn(k + '.rate', s.rate)) +
    fld(u('За що'), '<select id="' + k + '.unit" data-k="' + k + '.unit">' + opt('day', s.unit, u('за день')) + opt('trip', s.unit, u('за поїздку')) + '</select>') +
    fld(u('Осіб'), numIn(k + '.count', s.count, 1)) + fld(u('Днів*'), numIn(k + '.days', s.days, 1)) +
    '<div class="cost" data-out="staff.' + i + '"></div><button class="btn-ghost" data-act="del" data-path="staff" data-i="' + i + u('" aria-label="Видалити">✕</button></div>');
}

function renderAgent() {
  if (view === 'list' || !trip) { view = 'list'; return renderList(); }
  if (view === 'preview') {
    $root.innerHTML = u('<div class="preview-bar"><span>Так клієнти побачать сторінку після публікації</span><span style="display:flex;gap:8px"><button data-act="view" data-v="edit">← До налаштувань</button><button data-act="publish">Опублікувати</button></span></div>') + publicHTML({ ...buildPublic(trip) });
    return;
  }
  const t = trip;
  $root.innerHTML =
    u('<div class="top"><div><div class="eyebrow">Кабінет агента</div><h1>') + esc(t.title || u('Поїздка')) + '</h1><div id="status" class="status"></div></div>' +
    '<div class="acts">' + langSwitch(uiLang, 'uiLang') + '<a class="linkbtn" href="#">' + u('Сторінка клієнта') + '</a>' + u('<button data-act="view" data-v="preview">Вигляд для клієнтів</button><button class="btn-main" data-act="publish">Опублікувати</button></div></div>') +
    '<div class="dayacts" style="margin:-6px 0 16px;align-items:center"><button data-act="list">' + u('← Усі тури') + '</button><label class="check"><input type="checkbox" id="published" data-k="published"' + (t.published ? ' checked' : '') + '> ' + u('Показувати клієнтам') + '</label></div>' +
    (t._example ? u('<div class="note" style="margin-bottom:16px">Ціни нижче — приклад, щоб показати розрахунок. Маршрут узято з вашого PDF. Замініть суми на свої, і ця примітка зникне після першої зміни. <button class="btn-ghost" data-act="hideNote">Сховати</button></div>') : '') +
    '<div class="grid"><div>' +
    u('<section class="sec"><h2>Поїздка</h2><div class="fields">') +
      fld(u('Назва для клієнтів'), txtIn('title', t.title), '') + fld(u('Дати'), txtIn('dates', t.dates, u('12–17 травня 2027'))) +
      fld(u('Мова сторінки'), '<select id="lang" data-k="lang">' + opt('uk', t.lang, 'Українська') + opt('pl', t.lang, 'Polski') + opt('en', t.lang, 'English') + opt('zh', t.lang, '中文') + '</select>') +
      fld(u('Валюта'), txtIn('currency', t.currency)) + '</div>' +
      fld(u('Короткий опис'), '<textarea id="intro" data-k="intro" style="min-height:60px">' + esc(t.intro) + '</textarea>') + '</section>' +
    u('<section class="sec"><h2>Ціноутворення</h2><div class="fields">') +
      fld(u('Туристів'), numIn('pax', t.pax, 1)) + fld(u('Маржа, %'), numIn('margin', t.margin)) + fld(u('Запас на інфляцію, %'), numIn('inflation', t.inflation)) +
      fld(u('Округлення ціни до'), numIn('rounding', t.rounding, 1)) + fld(u('Пальне за замовч., за л'), numIn('fuelPrice', t.fuelPrice)) + fld(u('Розхід за замовч., л/100 км'), numIn('consumption', t.consumption)) + '</div>' +
      u('<div class="dayacts"><button data-act="applyFuel">Застосувати пальне і розхід до всіх автобусів</button></div>') +
      '<label class="check"><input type="checkbox" id="showTiers" data-k="showTiers"' + (t.showTiers ? ' checked' : '') + u('> Показувати клієнтам ціну для різних розмірів групи</label></section>') +
    u('<section class="sec"><h2>Персонал <span class="num" data-out="staffTotal"></span></h2>') + t.staff.map(staffRow).join('') +
      '<div class="dayacts">' + [u('Водій'), u('Гід'), u('Менеджер'), u('Пілот групи')].map(r => '<button class="btn-add" data-act="addStaff" data-role="' + r + '">+ ' + r + '</button>').join('') + '</div>' +
      u('<div class="muted" style="font-size:12px">* Днів: 0 = уся поїздка.</div></section>') +
    u('<section><div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 10px"><h2 style="font-size:20px">Маршрут по днях</h2><span class="muted num" data-out="kmTotal"></span></div>') +
      t.days.map(dayHTML).join('') + u('<button class="btn-add" data-act="addDay" style="width:100%;padding:12px">+ Додати день</button></section>') +
    '</div><aside class="ticket" id="ticket"></aside></div>';
  paintComputed();
}

function paintComputed() {
  const c = calc(trip), cur = esc(trip.currency), m = v => money(v, trip.currency);
  const set = (k, html) => { const el = $root.querySelector('[data-out="' + k + '"]'); if (el) el.innerHTML = html; };
  trip.days.forEach((d, i) => {
    set('day.' + i, m(c.perDay[i]));
    set('dtitle.' + i, esc(d.title || u('Без назви')));
    set('dmeta.' + i, esc([d.overnight && u('ночівля: ') + d.overnight, d.transport.map(l => tn(l.type)).join(', ')].filter(Boolean).join(' · ')));
    d.transport.forEach((l, j) => { const r = legCost(l, c.pax); set('leg.' + i + '.' + j, m(r.total) + (r.vehicles > 1 ? '<br><span class="muted">' + r.vehicles + u(' авт.</span>') : '')); });
    const k = 'days.' + i;
    set('item.' + k + '.hotel', m(itemCost(d.hotel, c.pax)));
    d.meals.forEach((it, j) => set('item.' + k + '.meals.' + j, m(itemCost(it, c.pax))));
    d.excursions.forEach((it, j) => set('item.' + k + '.excursions.' + j, m(itemCost(it, c.pax))));
  });
  trip.staff.forEach((s, i) => set('staff.' + i, m(staffCost(s, c.days))));
  set('staffTotal', m(c.staff));
  set('kmTotal', c.km + u(' км · пальне ') + m(c.fuel));
  const tk = document.getElementById('ticket');
  if (tk) tk.innerHTML =
    u('<div class="head"><div class="eyebrow" style="color:inherit;opacity:.8">Ціна для клієнта, за особу</div><div class="big num">') + m(c.perPerson) + '</div><div style="font-size:13px;opacity:.85;margin-top:6px">' + c.pax + u(' туристів · ') + c.days + u(' днів</div></div>') +
    '<div class="body">' +
      [[u('Транспорт'), c.transport], [u('у т.ч. пальне'), c.fuel], [u('Готелі'), c.hotels], [u('Харчування'), c.meals], [u('Екскурсії'), c.excursions], [u('Персонал'), c.staff]]
        .map(([a, b]) => '<div class="kv' + (a === u('у т.ч. пальне') ? ' muted' : '') + '"><span>' + a + '</span><span class="num">' + m(b) + '</span></div>').join('') +
      u('<div class="kv sum"><span>Собівартість</span><span class="num">') + m(c.cost) + '</span></div>' +
      u('<div class="kv"><span>Запас на інфляцію ') + esc(trip.inflation) + '%</span><span class="num">' + m(c.inflation) + '</span></div>' +
      u('<div class="kv"><span>Маржа ') + esc(trip.margin) + '%</span><span class="num">' + m(c.margin) + '</span></div>' +
      u('<div class="kv sum"><span>Виручка (з округленням)</span><span class="num">') + m(c.revenue) + '</span></div>' +
      u('<div class="kv"><span>Собівартість на особу</span><span class="num">') + m(c.cost / c.pax) + '</span></div>' +
      u('<div class="kv" style="color:var(--accent);font-weight:600"><span>Ваш прибуток</span><span class="num">') + m(c.profit) + '</span></div>' +
    u('</div><div class="body"><div class="eyebrow">Ціна від кількості туристів</div><table class="tiers"><tbody>') +
      [...new Set([...TIERS, c.pax])].sort((a, b) => a - b).map(p => '<tr' + (p === c.pax ? ' class="cur"' : '') + '><td>' + p + u(' осіб</td><td class="num">') + m(calc(trip, p).perPerson) + '</td></tr>').join('') +
    '</tbody></table></div>';
  paintStatus();
}

// ---- agent events ----
$root.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset && el.dataset.pub && mode === 'agent') {
    const id = el.dataset.pub; trips[id].published = el.checked; trips[id].updatedAt = Date.now();
    const prev = curId; curId = id; saveNow(); curId = prev; renderList(); return;
  }
  const k = el.dataset && el.dataset.k; if (!k || !trip || mode !== 'agent') return;
  trip.updatedAt = Date.now();
  const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? 0 : Number(el.value)) : el.value;
  setPath(trip, k, v);
  if (trip._example) delete trip._example;
  if (el.hasAttribute('data-re')) {
    const m = k.match(/^days\.(\d+)\.transport\.(\d+)\.type$/);
    if (m) { const old = trip.days[m[1]].transport[m[2]]; trip.days[m[1]].transport[m[2]] = { ...newLeg(v), note: old.note }; }
    renderAgent();
  } else paintComputed();
  if (k === 'title') { const h = $root.querySelector('.top h1'); if (h) h.textContent = trip.title || u('Поїздка'); }
  scheduleSave();
});
$root.addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details.day'); if (!d) return; const i = +d.dataset.day; d.open ? openDays.add(i) : openDays.delete(i); }, true);
$root.addEventListener('click', async e => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  if (b.dataset.act === 'uiLang' || b.dataset.act === 'pubLang') {
    const l = b.dataset.l;
    try { localStorage.setItem(b.dataset.act, l); } catch (err) {}
    if (b.dataset.act === 'uiLang') uiLang = l; else pubLang = l;
    if (mode === 'agent') renderAgent(); else if (mode === 'login') renderLogin(); else $root.innerHTML = clientHTML();
    return;
  }
  if (b.dataset.act === 'logout') { await saving; await sb.auth.signOut(); trips = {}; trip = null; curId = null; loginError = ''; route(); return; }
  if (mode !== 'agent') return;
  const a = b.dataset.act, i = +b.dataset.i, id = b.dataset.id;
  if (a === 'list') { await saveNow(); curId = null; trip = null; view = 'list'; renderList(); window.scrollTo(0, 0); return; }
  if (a === 'open') { curId = id; trip = trips[id]; view = 'edit'; openDays = new Set([0]); saveState = 'saved'; renderAgent(); window.scrollTo(0, 0); return; }
  if (a === 'newTrip' || a === 'dupTrip') {
    const nid = newId(), t = a === 'newTrip' ? blankTrip() : normalizeTrip(trips[id]);
    if (a === 'dupTrip') { t.title = (t.title || '') + u(' (копія)'); t.published = false; delete t._example; }
    t.updatedAt = Date.now(); trips[nid] = t; curId = nid; trip = t; saveNow();
    view = 'edit'; openDays = new Set([0]); renderAgent(); window.scrollTo(0, 0); return;
  }
  if (a === 'delTrip') {
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = u('Натисніть ще раз, щоб видалити'); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = u('Видалити'); } }, 4000); return; }
    b.disabled = true;
    try { await saving; const { error } = await sb.from('trips').delete().eq('id', id); if (error) throw error; delete trips[id]; renderList(); }
    catch (err) { b.disabled = false; b.textContent = u('Не вдалося зберегти (') + errText(err) + ')'; }
    return;
  }
  if (!trip) return;
  let structural = true;
  if (a === 'view') { view = b.dataset.v; renderAgent(); window.scrollTo(0, 0); return; }
  if (a === 'publish') return publish(b);
  if (a === 'hideNote') { delete trip._example; }
  else if (a === 'addDay') { trip.days.push(blankDay()); openDays.add(trip.days.length - 1); }
  else if (a === 'dup') { trip.days.splice(i + 1, 0, JSON.parse(JSON.stringify(trip.days[i]))); openDays = new Set([i + 1]); }
  else if (a === 'move') { const j = i + +b.dataset.dir; [trip.days[i], trip.days[j]] = [trip.days[j], trip.days[i]]; openDays = new Set([j]); }
  else if (a === 'delDay') {
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = u('Натисніть ще раз, щоб видалити'); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = u('Видалити день'); } }, 4000); return; }
    trip.days.splice(i, 1); if (!trip.days.length) trip.days.push(blankDay()); openDays = new Set();
  }
  else if (a === 'addLeg') trip.days[i].transport.push(newLeg(b.dataset.type));
  else if (a === 'add') getPath(trip, b.dataset.path).push({ name: '', amount: 0, per: 'person' });
  else if (a === 'del') getPath(trip, b.dataset.path).splice(i, 1);
  else if (a === 'addStaff') trip.staff.push({ role: b.dataset.role, rate: 0, unit: 'day', count: 1, days: 0 });
  else if (a === 'applyFuel') trip.days.forEach(d => d.transport.forEach(l => { if ((TRANSPORT[l.type] || {}).km) { l.fuelPrice = trip.fuelPrice; l.consumption = trip.consumption; } }));
  else structural = false;
  if (structural) { if (a !== 'hideNote') delete trip._example; trip.updatedAt = Date.now(); renderAgent(); scheduleSave(); }
});

async function publish(btn) {
  btn.disabled = true; btn.textContent = u('Публікую…');
  try {
    await saveNow();
    const list = Object.entries(trips).filter(([, t]) => t.published).sort(([, x], [, y]) => (y.updatedAt || 0) - (x.updatedAt || 0)).map(([id, t]) => ({ id, ...buildPublic(t) }));
    const { error } = await sb.rpc('publish_trips', { items: list });
    if (error) throw error;
    PUBS = list;
    renderAgent();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = u('Не вдалося опублікувати, спробуйте ще раз') + ' (' + errText(err) + ')';
  }
}

// ---- routing + login ----
// plain link = client page; #kalkulator = calculator (only for invited accounts with edit access)
const LOGIN = {
  uk: { h: 'Вхід до калькулятора', email: 'Email', pass: 'Пароль', go: 'Увійти', bad: 'Неправильний email або пароль.', no: 'Цей акаунт не має доступу до калькулятора. Попросіть власника додати ваш email.', wait: 'Перевіряю доступ…', client: 'Відкрити сторінку для клієнтів', out: 'Вийти', cfg: 'Сайт ще не підключено до бази. Заповніть config.js.' },
  pl: { h: 'Logowanie do kalkulatora', email: 'E-mail', pass: 'Hasło', go: 'Zaloguj się', bad: 'Nieprawidłowy e-mail lub hasło.', no: 'To konto nie ma dostępu do kalkulatora. Poproś właściciela o dodanie Twojego e-maila.', wait: 'Sprawdzam dostęp…', client: 'Otwórz stronę dla klientów', out: 'Wyloguj', cfg: 'Strona nie jest jeszcze połączona z bazą. Uzupełnij config.js.' },
  en: { h: 'Calculator sign-in', email: 'Email', pass: 'Password', go: 'Sign in', bad: 'Wrong email or password.', no: 'This account has no access to the calculator. Ask the owner to add your email.', wait: 'Checking access…', client: 'Open the client page', out: 'Sign out', cfg: 'The site is not connected to the database yet. Fill in config.js.' },
  zh: { h: '登录计算器', email: '邮箱', pass: '密码', go: '登录', bad: '邮箱或密码错误。', no: '此账户无权访问计算器。请联系所有者添加您的邮箱。', wait: '正在检查权限…', client: '打开客户页面', out: '退出登录', cfg: '网站尚未连接数据库。请填写 config.js。' }
};
const lt = () => LOGIN[uiLang] || LOGIN.pl;
let mode = 'client', loginState = 'wait';
function clientHTML() {
  if (!pubsLoaded) return '<div class="empty muted">…</div>';
  const h = location.hash.startsWith('#t-') ? location.hash.slice(3) : '';
  const one = h && PUBS.find(x => x.id === h);
  if (one) return publicHTML(one, PUBS.length > 1);
  if (PUBS.length === 1) return publicHTML(PUBS[0], false);
  if (!PUBS.length) return publicHTML(null);
  return publicListHTML(PUBS);
}
const isCalc = () => location.hash === '#kalkulator';
let loginError = '';
function renderLogin() {
  const t = lt();
  const body = loginState === 'wait' ? '<h1>' + esc(t.wait) + '</h1>'
    : loginState === 'config' ? '<h1>' + esc(t.cfg) + '</h1>'
    : loginState === 'denied' ? '<h1>' + esc(t.no) + '</h1><div class="dayacts"><button data-act="logout">' + esc(t.out) + '</button></div>'
    : '<h1>' + esc(t.h) + '</h1><form id="loginForm" class="login-form" novalidate>' +
        '<label class="f"><span>' + esc(t.email) + '</span><input type="email" id="loginEmail" autocomplete="username" required></label>' +
        '<label class="f"><span>' + esc(t.pass) + '</span><input type="password" id="loginPass" autocomplete="current-password" required></label>' +
        (loginError ? '<div class="status dirty" role="alert">' + esc(loginError) + '</div>' : '') +
        '<button class="btn-main" type="submit" id="loginBtn">' + esc(t.go) + '</button></form>';
  $root.innerHTML = '<div class="pubbar">' + langSwitch(uiLang, 'uiLang') + '</div><div class="login box">' + body +
    (loginState === 'wait' ? '' : '<p><a href="#">' + esc(t.client) + ' →</a></p>') + '</div>';
}
$root.addEventListener('submit', async e => {
  if (e.target.id !== 'loginForm') return;
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim(), password = document.getElementById('loginPass').value;
  if (!email || !password) { loginError = lt().bad; renderLogin(); return; }
  const btn = document.getElementById('loginBtn'); btn.disabled = true; btn.textContent = lt().wait;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  loginError = error ? lt().bad : '';
  if (error) { renderLogin(); const el = document.getElementById('loginEmail'); if (el) el.value = email; return; }
  route();
});
async function loadAgent() {
  if (!sb) return 'config';
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return 'signin';
  userEmail = session.user.email || '';
  const me = await sb.from('agents').select('email').limit(1);
  if (me.error || !me.data.length) return 'denied';
  if (Object.keys(trips).length) return 'ok';
  const { data, error } = await sb.from('trips').select('id,data');
  if (error) return 'denied';
  trips = {};
  data.forEach(r => { trips[r.id] = normalizeTrip(r.data); });
  if (!Object.keys(trips).length) { const id = newId(); trips[id] = blankTrip(); curId = id; saveNow(); curId = null; }
  return 'ok';
}
async function route() {
  if (!isCalc()) { mode = 'client'; $root.innerHTML = clientHTML(); return; }
  mode = 'login'; loginState = 'wait'; renderLogin();
  const r = await loadAgent();
  if (!isCalc()) return;
  if (r === 'ok') { mode = 'agent'; if (!trip) view = 'list'; renderAgent(); }
  else { loginState = r; renderLogin(); }
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
$root.innerHTML = clientHTML();
loadPublished().then(() => route());
