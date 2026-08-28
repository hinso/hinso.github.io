const API_URL = 'https://api.bigballsdata.com/v1/matches?sport=football&league=epl&limit=50';
const TOKEN = 'Bearer bbs_live_000000UHtL5sEonxInQIIwtuklSRAoXwkijht65rc16b0p7M';
const MAX_DAYS = 10; // 今日起最多 10 日

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const dateTitle = document.getElementById('dateTitle');
const matchList = document.getElementById('matchList');

// 本地時區的「今日」與「上限日」（今日 + 9）
const today = startOfDay(new Date());
const maxDate = addDays(today, MAX_DAYS - 1);
let currentDate = new Date(today);

// 依日期分組的賽程
let matchesByDate = {};
// 英文隊名 -> 中文譯名
let teamNames = {};
// 英文隊名 -> 預設 logo（當 logo_url 為 null 時使用）
let teamLogos = {};

function translateName(name) {
  return teamNames[name] || name;
}

function teamLogo(team) {
  return team.logo_url || teamLogos[team.name] || null;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateTitle(d) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = weekdays[d.getDay()];
  return `${y}年${m}月${day}日 星期${wd}`;
}

function formatTime(utcStr) {
  const d = new Date(utcStr);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h < 12 ? '上午' : '下午';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${period}${h12}:${m}`;
}

function statusLabel(status) {
  switch (status) {
    case 'live': return '進行中';
    case 'finished': return '完場';
    case 'postponed': return '延期';
    case 'cancelled': return '取消';
    default: return '';
  }
}

function statusClass(status) {
  if (status === 'live') return 'live';
  if (status === 'finished') return 'finished';
  return '';
}

function render() {
  const key = dateKey(currentDate);
  dateTitle.textContent = formatDateTitle(currentDate);

  // 上下限：到頂/到底時按鈕停用（按了沒反應）
  prevBtn.disabled = currentDate <= today;
  nextBtn.disabled = currentDate >= maxDate;

  const matches = matchesByDate[key] || [];
  matchList.innerHTML = '';

  if (matches.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = '當日無賽事';
    matchList.appendChild(p);
    return;
  }

  // 按開賽時間排序
  matches.sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc));

  for (const m of matches) {
    const card = document.createElement('div');
    card.className = 'match-card';

    const time = document.createElement('div');
    time.className = 'match-time';
    time.textContent = formatTime(m.kickoff_utc);

    // 有比分時顯示在時間下方
    if (m.score && (m.score.home != null || m.score.away != null)) {
      const score = document.createElement('div');
      score.className = 'score';
      score.textContent = `${m.score.home ?? '-'} - ${m.score.away ?? '-'}`;
      time.appendChild(score);
    }

    const home = teamEl(m.home, 'home');
    const away = teamEl(m.away, 'away');

    card.appendChild(home);
    card.appendChild(time);
    card.appendChild(away);

    const tag = statusLabel(m.status);
    if (tag) {
      const t = document.createElement('span');
      t.className = 'status-tag ' + statusClass(m.status);
      t.textContent = tag;
      card.appendChild(t);
    }

    matchList.appendChild(card);
  }
}

function teamEl(team, side) {
  const el = document.createElement('div');
  el.className = 'team ' + side;

  const name = document.createElement('span');
  name.className = 'team-name';
  name.textContent = translateName(team.name);

  const logo = teamLogo(team);
  if (logo) {
    const img = document.createElement('img');
    img.src = logo;
    img.alt = translateName(team.name);
    img.loading = 'lazy';
    el.appendChild(img);
  }

  el.appendChild(name);
  return el;
}

async function load() {
  try {
    // 先載入中文譯名與預設 logo
    const nameRes = await fetch('team-names.json');
    if (nameRes.ok) {
      const data = await nameRes.json();
      teamNames = data.names || data;
      teamLogos = data.logos || {};
    }

    const res = await fetch(API_URL, {
      headers: { 'Authorization': TOKEN }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const data = json.data || [];

    matchesByDate = {};
    for (const m of data) {
      const k = dateKey(new Date(m.kickoff_utc));
      if (!matchesByDate[k]) matchesByDate[k] = [];
      matchesByDate[k].push(m);
    }
    render();
  } catch (err) {
    matchList.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = '載入失敗，請稍後再試';
    matchList.appendChild(p);
  }
}

prevBtn.addEventListener('click', () => {
  if (currentDate > today) {
    currentDate = addDays(currentDate, -1);
    render();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentDate < maxDate) {
    currentDate = addDays(currentDate, 1);
    render();
  }
});

load();