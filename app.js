'use strict';
let DATA, songs, stats, lastFocus;
const main = document.querySelector('main'),
  tip = document.querySelector('#chart-tip');
const state = {
  page: 1,
  query: '',
  filter: 'all',
  sort: 'title',
  version: 'full',
  lab: 'agreement',
  yearVersion: 'full',
  year: 'all',
  song: '',
  detailVersion: 'full',
};

const defaults = { ...state };
function readUrlState() {
  const params = new URLSearchParams(location.search);
  Object.assign(state, defaults);
  for (const key of ['query', 'year', 'song']) state[key] = params.get(key) || defaults[key];
  for (const [key, allowed] of Object.entries({
    filter: ['all', 'opposed', 'same', 'sensitive', 'reviewed'],
    sort: ['title', 'gap', 'sensitive'], version: ['full', 'unique'],
    yearVersion: ['full', 'unique'], detailVersion: ['full', 'unique'],
    lab: ['agreement', 'repetition', 'pilot'],
  })) if (allowed.includes(params.get(key))) state[key] = params.get(key);
  const page = Number(params.get('page'));
  state.page = Number.isSafeInteger(page) && page > 0 ? page : 1;
  if (!songs.some((s) => String(s.year) === state.year)) state.year = 'all';
  if (!songs.some((s) => String(s.id) === state.song)) state.song = '';
}
function syncUrl() {
  const url = new URL(location.href);
  for (const key of Object.keys(defaults)) {
    if (state[key] === defaults[key]) url.searchParams.delete(key);
    else url.searchParams.set(key, state[key]);
  }
  history.replaceState(null, '', url);
}
function goExplorer({ year = 'all', filter = 'all', version = 'full' } = {}) {
  Object.assign(state, { year: String(year), filter, version, query: '', page: 1, song: '', sort: 'title' });
  const url = new URL(location.href);
  url.hash = 'explorer';
  history.pushState(null, '', url);
  route({ focusSelector: '#search' });
}

const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fmt = (v, n = 3) => Number(v).toFixed(n),
  pct = (a, b) => `${((a / b) * 100).toFixed(1)}%`;
const vlabel = (v) => (v >= 0.05 ? 'positive' : v <= -0.05 ? 'negative' : 'neutral');
const tlabel = (v) => (v >= 0 ? 'positive' : 'negative');
const badge = (label) =>
  /* HTML */ `<span class="pill ${esc(label)}"
    >${esc(label.charAt(0).toUpperCase() + label.slice(1))}</span
  >`;
const stat = (value, title, note) =>
  /* HTML */ `<div class="stat">
    <div class="stat-value">${value}</div>
    <div class="stat-title">${title}</div>
    <div class="stat-note">${note}</div>
  </div>`;
const pageHeader = (eyebrow, title, desc) =>
  /* HTML */ `<div class="page-header">
    <div class="eyebrow">${eyebrow}</div>
    <h1>${title}</h1>
    <p>${desc}</p>
  </div>`;
function scatter(version = 'full') {
  const W = 520,
    H = 290,
    L = 46,
    R = 16,
    T = 16,
    B = 42,
    w = W - L - R,
    h = H - T - B;
  const x = (v) => L + ((v + 1) / 2) * w,
    y = (v) => T + ((1 - v) / 2) * h;
  let svg = `<svg
    class="chart"
    viewBox="0 0 ${W} ${H}"
    role="img"
    aria-label="Scatter plot of VADER and DistilBERT scores for ${songs.length} records; each point opens its song details"
  >`;
  for (const v of [-1, -0.5, 0, 0.5, 1]) {
    svg += `<path d="M${x(v)} ${T}V${T + h}M${L} ${y(v)}H${L + w}" stroke="${v === 0 ? '#d4d8d2' : '#f0f1eb'}" stroke-dasharray="${v === 0 ? '4 4' : '0'}"/><text x="${x(v)}" y="${H - 24}" text-anchor="middle" font-size="9" fill="#7d8989">${v}</text><text x="${L - 9}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="#7d8989">${v}</text>`;
  }
  for (const s of songs) {
    const v = version === 'full' ? s.v : s.uv,
      t = version === 'full' ? s.t : s.ut,
      op = vlabel(v) !== 'neutral' && vlabel(v) !== tlabel(t);
    svg += `<circle class="point" tabindex="-1" data-song="${s.id}" data-text-version="${version}" cx="${x(v)}" cy="${y(t)}" r="2.6" fill="${op ? '#d57963' : '#4c847e'}" opacity=".48"><title>${esc(s.title)} · ${esc(s.artist)}: VADER ${fmt(v)}, DistilBERT ${fmt(t)}. Open details.</title></circle>`;
  }
  svg += `<text x="${L + w / 2}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#6d7a7b">VADER compound →</text><text transform="translate(11 ${T + h / 2}) rotate(-90)" text-anchor="middle" font-size="9" fill="#6d7a7b">DistilBERT transformed score →</text></svg>`;
  return svg + `<a class="text-link chart-alternative" href="#explorer">Browse the chart records in the searchable song table →</a>`;
}
function caseCard(id, index, desc) {
  const s = songs.find((x) => x.id === id);
  return /* HTML */ `<button class="case" data-song="${s.id}">
    <span class="case-index">CASE ${index} / MODEL DISAGREEMENT</span
    ><span class="arrow">↗</span>
    <h3>${esc(s.title)}</h3>
    <div class="small-label">${esc(s.artist)}</div>
    <div class="case-scores">
      <span class="${s.vl}">VADER ${fmt(s.v, 2)}</span><span>↔</span
      ><span class="${s.tl}">DistilBERT ${fmt(s.t, 2)}</span>
    </div>
    <p>${desc}</p>
  </button>`;
}
// 首頁：研究摘要、圖表與案例入口。
function overview() {
  return /* HTML */ `<section class="view">
    <div class="hero">
      <div>
        <div class="eyebrow">A closer listen to language</div>
        <h1>One song.<br /><em>Two readings.</em></h1>
        <p>
          What happens when two sentiment models read the same lyrics? Explore where they
          agree, where they diverge, and how repetition changes the story.
        </p>
        <div class="actions">
          <a class="button" href="#explorer">Explore the songs <span>↗</span></a
          ><a class="text-link" href="#methods">Behind the analysis</a>
        </div>
      </div>
      <div
        class="hero-art"
        aria-label="Illustrative model scores for Everytime by Britney Spears"
      >
        <div class="record" aria-hidden="true">
          <svg class="record-lettering" viewBox="0 0 100 100">
            <defs><path id="lyrics-arc" d="M 18,50 A 32,32 0 0,1 82,50" /></defs>
            <text>
              <textPath href="#lyrics-arc" startOffset="50%" text-anchor="middle">
                Lyrics
              </textPath>
            </text>
          </svg>
        </div>
        <div class="art-chip chip-v">
          <span class="chip-label">VADER · Everytime</span>
          <div class="chip-row">
            <span class="positive">+0.954</span><span class="pill">Positive</span>
          </div>
        </div>
        <div class="art-chip chip-t">
          <span class="chip-label">DistilBERT · Everytime</span>
          <div class="chip-row">
            <span class="negative">−0.990</span
            ><span class="pill negative">Negative</span>
          </div>
        </div>
        <div class="chip-song">Same text. Different interpretations.</div>
        <span class="art-caption">Text analysis, not audio mood</span>
      </div>
    </div>
    <div class="stat-grid">
      ${stat(
        String(songs.length),
        'Song records analysed',
        'Records retained after lyric cleaning, deduplication and English-language screening.',
      )}
      ${stat(
        `${fmt(stats.agreement * 100, 1)}<small>%</small>`,
        'Same positive / negative direction',
        `The models agree on ${stats.nonneutral - stats.opposed} of ${stats.nonneutral} non-neutral VADER records. Agreement does not mean accuracy.`,
      )}
      ${stat(
        fmt(stats.correlation),
        'Weak score correlation',
        'The scores tend to rise together, but the relationship is weak. The models often read the same lyrics differently.',
      )}
      ${stat(
        `${fmt(stats.vflips / songs.length * 100, 1)}<small>%</small>`,
        'VADER labels changed',
        `Removing repeated lines changes the label for ${stats.vflips} of ${songs.length} records.`,
      )}
    </div>
    <div class="section-heading">
      <div>
        <span class="section-tag">01 / The big picture</span>
        <h2>Agreement has its limits.</h2>
        <p>Each point is a record. Select a point to look closer.</p>
      </div>
      <a class="text-link" href="#lab">Open model lab ↗</a>
    </div>
    <div class="panel-grid">
      <div class="card">
        <div class="card-top">
          <div class="small-title">Two models, one lyric text</div>
          <span class="pill outline">FULL TEXT</span>
        </div>
        <div class="legend">
          <span><i class="dot"></i>Same label / VADER neutral</span
          ><span><i class="dot coral"></i>Opposite polarity</span>
        </div>
        ${scatter()}
        <div class="chart-note">
          <strong>How to read this chart</strong><br />
          Each dot represents one song record. Further right means a more positive VADER
          score; further up means a more positive DistilBERT score.<br />
          Coral dots mean one model labels the lyrics positive and the other negative.
          Teal dots mean matching labels or a neutral VADER result. Select a dot to
          compare the song's results.<br />
        </div>
      </div>
      <div class="card">
        <div class="small-title">Does the chorus change the reading?</div>
        <div class="highlight-number">${pct(stats.vflips, songs.length)} of records.</div>
        <p class="subtext">
          Removing repeated lyric lines changes the assigned sentiment label for a
          noticeable subset of records.
        </p>
        <div class="mini-bars">${sensitivityBars()}</div>
        <div class="insight">
          The average VADER score barely moves, while ${stats.vflips} individual labels change. An
          aggregate can hide song-level instability.
        </div>
        <a
          class="text-link"
          href="#lab"
          data-go-lab="repetition"
          style="display:inline-block;margin-top:19px"
          >Explore the sensitivity analysis ↗</a
        >
      </div>
    </div>
    <div class="section-heading">
      <div>
        <span class="section-tag">02 / Look closer</span>
        <h2>The interesting part is the disagreement.</h2>
      </div>
    </div>
    <div class="case-grid">
      ${caseCard(28, '01', 'Expressions of love sit beside regret and loss. Does the model capture the overall narrative?')}${caseCard(402, '02', 'A threatening narrative can receive a strongly positive lexical score. Inspect context before trusting a label.')}${caseCard(588, '03', 'A warm relationship narrative produces opposite predictions. Negation and repetition are hypotheses to investigate.')}
    </div>
    ${yearSection()}
  </section>`;
}

// 按資料年份分組；兩個模型都以當年全部紀錄為比例分母。
function annualRows(version = state.yearVersion) {
  const years = [...new Set(songs.map((s) => Number(s.year)))].sort((a, b) => a - b);
  return years.map((year) => {
    const records = songs.filter((s) => Number(s.year) === year);
    const count = (key) => records.filter((s) => s[key] === 'positive').length;
    const vp = count(version === 'full' ? 'vl' : 'uvl');
    const tp = count(version === 'full' ? 'tl' : 'utl');
    const vn = records.filter(
      (s) => s[version === 'full' ? 'vl' : 'uvl'] === 'neutral',
    ).length;
    return { year, n: records.length, vp, tp, vn };
  });
}

// 完整的 SVG 一次組裝；避免格式化工具提前關閉圖形標籤。
function annualChart(rows, model) {
  const W = 620,
    H = 300,
    L = 55,
    R = 20,
    T = 25,
    B = 55;
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, rows.length - 1);
  const y = (v) => T + (1 - v) * (H - T - B);
  const countKey = model === 'VADER' ? 'vp' : 'tp';
  const color = model === 'VADER' ? '#4c847e' : '#d57963';
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (v) =>
        `<g><path d="M${L} ${y(v)}H${W - R}" stroke="#dedfd7"/><text x="${L - 10}" y="${y(v) + 5}" text-anchor="end">${v * 100}%</text></g>`,
    )
    .join('');
  const ticks = rows
    .map((r, i) =>
      i % 4 === 0 || i === rows.length - 1
        ? `<text x="${x(i)}" y="${H - 30}" text-anchor="middle">${r.year}</text>`
        : '',
    )
    .join('');
  const line = rows
    .map((r, i) => `${i ? 'L' : 'M'}${x(i)} ${y(r[countKey] / r.n)}`)
    .join(' ');
  const dots = rows
    .map(
      (r, i) =>
        `<a href="#explorer" data-year="${r.year}" data-year-version="${state.yearVersion}" aria-label="Explore ${r.n} records from ${r.year}, ${model} positive share ${pct(r[countKey], r.n)}"><circle cx="${x(i)}" cy="${y(r[countKey] / r.n)}" r="4.5" fill="${color}" stroke="white" stroke-width="1.5"><title>${r.year}: ${r[countKey]} of ${r.n} records positive (${pct(r[countKey], r.n)}). Open this year’s records.</title></circle></a>`,
    )
    .join('');
  return `<svg class="annual-chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="${model} positive share by album or version year. Exact values are in the annual table."><text x="${L}" y="15">Positive share</text>${grid}${ticks}<path d="${line}" fill="none" stroke="${color}" stroke-width="3"/>${dots}<text x="${W / 2}" y="${H - 5}" text-anchor="middle">Album / version year</text></svg>`;
}

function yearSection() {
  const rows = annualRows();
  const card = (model) => {
    const key = model === 'VADER' ? 'vp' : 'tp';
    const ranked = [...rows].sort((a, b) => b[key] / b.n - a[key] / a.n);
    const high = ranked[0],
      low = ranked.at(-1);
    return `<div class="card"><h3>${model}</h3>${annualChart(rows, model)}<p class="subtext">Highest positive share: <strong>${high.year} · ${pct(high[key], high.n)}</strong> (${high[key]} / ${high.n}). Lowest: <strong>${low.year} · ${pct(low[key], low.n)}</strong> (${low[key]} / ${low.n}).</p></div>`;
  };
  return `<section class="year-section" aria-labelledby="year-heading">
    <div class="section-heading"><div><span class="section-tag">03 / Across the years</span><h2 id="year-heading">How do lyrics change across the years?</h2><p>Compare the share of lyrics labelled positive by each model.</p></div></div>
    <div class="year-toolbar"><label for="year-version">Lyric version</label><select id="year-version"><option value="full" ${state.yearVersion === 'full' ? 'selected' : ''}>Full lyrics</option><option value="unique" ${state.yearVersion === 'unique' ? 'selected' : ''}>Without repeated lines</option></select><span>${songs.length} records · ${rows[0].year}–${rows.at(-1).year}</span></div>
    <div class="year-grid">${card('VADER')}${card('DistilBERT')}</div>
    <p class="subtext">A higher point means a larger share of that year's records was labelled positive. Select a point or a year in the table to explore its records. Hover over a point for its count. Switch lyric versions to see how removing repeated lines changes the pattern.</p>
    <details><summary>Annual counts and sentiment breakdown</summary><p>Each percentage uses all records in that year. VADER also has a neutral class; DistilBERT assigns positive or negative.</p><div class="table-wrap"><table class="annual-table"><thead><tr><th>Year</th><th>Records</th><th>VADER positive</th><th>Neutral</th><th>Negative</th><th>DistilBERT positive</th><th>Negative</th></tr></thead><tbody>${rows.map((r) => `<tr><td><a class="text-link" href="#explorer" data-year="${r.year}" data-year-version="${state.yearVersion}">${r.year}</a></td><td>${r.n}</td><td>${pct(r.vp, r.n)} (${r.vp})</td><td>${pct(r.vn, r.n)} (${r.vn})</td><td>${pct(r.n - r.vp - r.vn, r.n)} (${r.n - r.vp - r.vn})</td><td>${pct(r.tp, r.n)} (${r.tp})</td><td>${pct(r.n - r.tp, r.n)} (${r.n - r.tp})</td></tr>`).join('')}</tbody></table></div></details>
  </section>`;
}

document.addEventListener('change', (e) => {
  if (e.target.id !== 'year-version') return;
  state.yearVersion = e.target.value;
  syncUrl();
  document.querySelector('.year-section').outerHTML = yearSection();
  document.querySelector('#year-version').focus({ preventScroll: true });
});

function sensitivityBars() {
  return [['VADER', stats.vflips, ''], ['DistilBERT', stats.tflips, 'coral']]
    .map(([name, count, color]) => `<div class="bar-row"><div class="bar-head"><span>${name} <span class="small-label">${count} / ${songs.length}</span></span><span class="bar-number">${pct(count, songs.length)}</span></div><div class="bar-track"><div class="bar-fill ${color}" style="width:${count / songs.length * 100}%"></div></div></div>`).join('') +
    '<div class="chart-note">Bars use a 0–100% scale. VADER includes neutral transitions; DistilBERT switches between positive and negative.</div>';
}
// 搜尋頁：先建立控制項，再由 renderResults 填入歌曲。
function explorer() {
  return /* HTML */ `<section class="view">
    ${pageHeader('The research collection', 'Find a song. Question the label.', `Search the ${songs.length} analysed records and compare full-text scores with the repeated-line-removed version. Select any row for the details.`)}
    <div class="filters">
      <label class="search"
        ><span class="small-label" style="display:block;margin-bottom:7px"
          >SONG OR ARTIST</span
        ><input
          id="search"
          type="search"
          placeholder="Search, e.g. Everytime or Muse"
          value="${esc(state.query)}" /></label
      ><label
        ><span class="small-label" style="display:block;margin-bottom:7px">SHOW</span
        ><select id="filter">
          <option value="all">All records</option>
          <option value="opposed">Opposite polarity</option>
          <option value="same">Same model label</option>
          <option value="sensitive">Repetition-sensitive</option>
          <option value="reviewed">${songs.filter((s) => s.review).length} reviewed pilot cases</option>
        </select></label
      ><label
        ><span class="small-label" style="display:block;margin-bottom:7px">SORT</span
        ><select id="sort">
          <option value="title">Song A–Z</option>
          <option value="sensitive">Largest processing change</option>
          <option value="gap">Largest score gap*</option>
        </select></label
      >
      <label><span class="small-label" style="display:block;margin-bottom:7px">ALBUM / VERSION YEAR</span><select id="year-filter"><option value="all">All years</option>${[...new Set(songs.map((s) => s.year))].sort((a,b) => a-b).map((year) => `<option value="${year}" ${String(year) === state.year ? 'selected' : ''}>${year}</option>`).join('')}</select></label>
      <div>
        <span class="small-label" style="display:block;margin-bottom:7px"
          >TEXT VERSION</span
        >
        <div class="toggle-group">
          <button data-version="full" class="${state.version === 'full' ? 'active' : ''}">
            Full lyrics</button
          ><button
            data-version="unique"
            class="${state.version === 'unique' ? 'active' : ''}"
          >
            Unique lines
          </button>
        </div>
      </div>
    </div>
    <button class="export" id="reset-filters">Reset filters</button>
    <div id="result-status" class="result-status" role="status" aria-live="polite"></div>
    <div id="explorer-results"></div>
    <div class="chart-note">
      *A score gap is descriptive, not a calibrated measure of model error. Version dates
      are omitted here because original release years are unverified. “Reviewed” means AI
      draft labels reviewed by the user, not independent ground truth.
    </div>
  </section>`;
}
// 資料處理：搜尋、篩選與排序；不修改原始 songs。
function filtered() {
  let rows = songs.filter((s) =>
    `${s.title} ${s.artist}`.toLowerCase().includes(state.query.trim().toLowerCase()) &&
    (state.year === 'all' || String(s.year) === state.year),
  );
  rows = rows.filter((s) => {
    const v = state.version === 'full' ? s.vl : s.uvl,
      t = state.version === 'full' ? s.tl : s.utl;
    return state.filter === 'opposed'
      ? v !== 'neutral' && v !== t
      : state.filter === 'same'
        ? v === t
        : state.filter === 'sensitive'
          ? s.vl !== s.uvl || s.tl !== s.utl
          : state.filter === 'reviewed'
            ? !!s.review
            : true;
  });
  return rows.sort((a, b) =>
    state.sort === 'gap'
      ? Math.abs(
          (state.version === 'full' ? b.v : b.uv) -
            (state.version === 'full' ? b.t : b.ut),
        ) -
        Math.abs(
          (state.version === 'full' ? a.v : a.uv) -
            (state.version === 'full' ? a.t : a.ut),
        )
      : state.sort === 'sensitive'
        ? Math.max(Math.abs(b.v - b.uv), Math.abs(b.t - b.ut)) -
          Math.max(Math.abs(a.v - a.uv), Math.abs(a.t - a.ut))
        : a.title.localeCompare(b.title),
  );
}
// 表格顯示：處理每頁 12 筆及上一頁／下一頁。
function renderResults(focusSelector) {
  const rows = filtered(),
    per = 12,
    pages = Math.max(1, Math.ceil(rows.length / per));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * per;
  syncUrl();
  document.querySelector('#result-status').textContent = `${rows.length} matching records${state.year === 'all' ? '' : ` · Album/version year ${state.year}`}`;
  document.querySelector('#explorer-results').innerHTML = /* HTML */ `<div
      class="section-heading"
      style="margin-top:8px"
    >
      <span class="small-label">${rows.length} matching records</span
      ><button class="export" id="export">Download filtered scores ↓</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Song / artist</th>
            <th>VADER</th>
            <th>DistilBERT</th>
            <th>Comparison</th>
            <th>Processing</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${
            rows
              .slice(start, start + per)
              .map((s) => {
                const v = state.version === 'full' ? s.v : s.uv,
                  t = state.version === 'full' ? s.t : s.ut,
                  vl = vlabel(v),
                  tl = tlabel(t);
                return /* HTML */ `<tr
                  data-song="${s.id}"
                  tabindex="0"
                  role="button"
                  aria-label="Open ${esc(s.title)} by ${esc(s.artist)}"
                >
                  <td>
                    <div class="song-title">${esc(s.title)}</div>
                    <div class="artist">
                      ${esc(s.artist)}${s.review ? ' · Reviewed pilot' : ''}
                    </div>
                  </td>
                  <td>
                    <span class="num ${vl}">${fmt(v)}</span>
                    <div style="margin-top:5px">${badge(vl)}</div>
                  </td>
                  <td>
                    <span class="num ${tl}">${fmt(t)}</span>
                    <div style="margin-top:5px">${badge(tl)}</div>
                  </td>
                  <td>
                    ${vl === tl ? '<span class="small-label">Same label</span>' : vl === 'neutral' ? '<span class="small-label">VADER neutral</span>' : '<span class="negative">Opposite polarity</span>'}
                  </td>
                  <td>
                    <span class="small-label"
                      >${s.vl !== s.uvl || s.tl !== s.utl ? 'Label changes' : 'Labels stable'}</span
                    >
                  </td>
                  <td>↗</td>
                </tr>`;
              })
              .join('') ||
            '<tr><td colspan="6" class="empty">No matching records. Try another search or filter.</td></tr>'
          }
        </tbody>
      </table>
    </div>
    <div class="pager">
      <span
        >${rows.length ? `${start + 1}–${Math.min(start + per, rows.length)} of ${rows.length}` : '0 records'}</span
      >
      <div class="pager-buttons">
        <button id="prev" ${state.page <= 1 ? 'disabled' : ''}>← Previous</button
        ><span style="padding:8px">${state.page} / ${pages}</span
        ><button id="next" ${state.page >= pages ? 'disabled' : ''}>Next →</button>
      </div>
    </div>`;
  document.querySelector('#prev').onclick = () => {
    state.page--;
    renderResults('#prev');
  };
  document.querySelector('#next').onclick = () => {
    state.page++;
    renderResults('#next');
  };
  document.querySelector('#export').onclick = () => exportRows(rows);
  if (focusSelector) {
    const target = document.querySelector(focusSelector);
    (target.disabled
      ? document.querySelector('.pager button:not(:disabled)') ||
        document.querySelector('#export')
      : target
    ).focus({ preventScroll: true });
  }
}
function exportRows(rows) {
  const q = (x) => {
    const text = String(x ?? '');
    const safe = typeof x === 'string' && /^[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  const lines = [
    [
      'source_row_id',
      'song',
      'artist',
      'album_version_year',
      'text_version',
      'vader_score',
      'distilbert_score',
      'vader_label',
      'distilbert_label',
      'annotation_provenance',
    ],
    ...rows.map((s) => [
      s.id,
      s.title,
      s.artist,
      s.year,
      state.version,
      state.version === 'full' ? s.v : s.uv,
      state.version === 'full' ? s.t : s.ut,
      state.version === 'full' ? s.vl : s.uvl,
      state.version === 'full' ? s.tl : s.utl,
      s.review ? 'AI draft, user reviewed' : 'not annotated',
    ]),
  ].map((r) => r.map(q).join(','));
  const url = URL.createObjectURL(
      new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }),
    ),
    a = document.createElement('a');
  a.href = url;
  a.download = `lyrics-lens-${state.year}-${state.version}-scores.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function matrix() {
  const cnt = (v, t) => songs.filter((s) => s.vl === v && s.tl === t).length;
  return /* HTML */ `<div class="matrix">
    <span></span><span class="axis">DistilBERT negative</span
    ><span class="axis">DistilBERT positive</span
    >${['negative', 'positive'].map((v) => /* HTML */ `<span class="axis">VADER<br />${v}</span>${['negative', 'positive'].map((t) => /* HTML */ `<div class="cell ${v !== t ? 'disagree' : ''}"><strong>${cnt(v, t)}</strong><small>${v === t ? 'SAME LABEL' : 'OPPOSITE POLARITY'}</small></div>`).join('')}`).join('')}
  </div>`;
}
function lab() {
  return /* HTML */ `<section class="view">
    ${pageHeader('The model lab', 'Different methods. Different readings.', 'Explore model agreement, processing sensitivity, and the limits of a small reviewed pilot. These are research diagnostics, not proof of model accuracy.')}
    <div class="toggle-group" style="width:max-content;margin-bottom:22px">
      <button data-lab="agreement" class="${state.lab === 'agreement' ? 'active' : ''}">
        Model agreement</button
      ><button
        data-lab="repetition"
        class="${state.lab === 'repetition' ? 'active' : ''}"
      >
        Repetition sensitivity</button
      ><button data-lab="pilot" class="${state.lab === 'pilot' ? 'active' : ''}">
        Reviewed pilot
      </button>
    </div>
    <div id="lab-content">${labContent()}</div>
  </section>`;
}
function labContent() {
  if (state.lab === 'repetition')
    return /* HTML */ `<div class="lab-grid">
      <div class="card">
        <h2>Small average. Real changes.</h2>
        <p class="subtext">
          Full text versus unique lyric lines, with the first occurrence retained. Both
          models process the same token-decoded chunks.
        </p>
        ${sensitivityBars()}
        <div class="insight">
          This is processing sensitivity. Removing repeated lines also changes context,
          length and chunk boundaries. It does not isolate a causal chorus effect.
        </div>
      </div>
      <div class="card">
        <h2>What the average misses</h2>
        <table style="margin-top:22px">
          <thead>
            <tr>
              <th>Score mean</th>
              <th>Full text</th>
              <th>Unique lines</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>VADER</td>
              <td>${fmt(songs.reduce((sum, s) => sum + s.v, 0) / songs.length, 4)}</td>
              <td>${fmt(songs.reduce((sum, s) => sum + s.uv, 0) / songs.length, 4)}</td>
            </tr>
            <tr>
              <td>DistilBERT</td>
              <td>${fmt(songs.reduce((sum, s) => sum + s.t, 0) / songs.length, 4)}</td>
              <td>${fmt(songs.reduce((sum, s) => sum + s.ut, 0) / songs.length, 4)}</td>
            </tr>
          </tbody>
        </table>
        <p class="subtext" style="margin-top:18px">
          Mean absolute per-record score changes: VADER ${fmt(songs.reduce((sum, s) => sum + Math.abs(s.v - s.uv), 0) / songs.length, 4)}; DistilBERT ${fmt(songs.reduce((sum, s) => sum + Math.abs(s.t - s.ut), 0) / songs.length, 4)}.
          Opposing changes can cancel out in the aggregate.
        </p>
        <button class="button secondary" id="show-sensitive" style="margin-top:24px">
          Browse sensitive records ↗
        </button>
        <div class="chart-note">
          The two model scales have different meanings and are not directly
          interchangeable.
        </div>
      </div>
    </div>`;
  if (state.lab === 'pilot')
    return /* HTML */ `<div class="intro-note">
        Provenance matters: AI drafted these 20 labels, and the user reviewed them. The
        pilot helps discuss annotation rules and errors; it is not a blinded independent
        benchmark. It has no neutral or unclear examples.
      </div>
      <div class="lab-grid">
        <div class="card">
          <h2>20 records, reviewed.</h2>
          <div class="mini-bars">
            ${[
              ['Positive', 10, ''],
              ['Negative', 5, 'coral'],
              ['Mixed', 5, ''],
            ]
              .map(
                ([label, n, color]) =>
                  /* HTML */ `<div class="bar-row">
                    <div class="bar-head">
                      <span>${label}</span><span>${n} records</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill ${color}" style="width:${n * 5}%"></div>
                    </div>
                  </div>`,
              )
              .join('')}
          </div>
          <p class="subtext">
            Mixed is not neutral: positive and negative emotional strands can both be
            important.
          </p>
          <button class="button secondary" id="show-reviewed" style="margin-top:18px">
            Read the pilot cases ↗
          </button>
        </div>
        <div class="card">
          <h2>A limited reference.</h2>
          <div class="highlight-number">
            15
            <span style="font-size:19px;color:var(--muted)">binary-labelled cases</span>
          </div>
          <p class="subtext">
            The five mixed cases are excluded from this positive/negative comparison.
          </p>
          <table style="margin-top:22px">
            <thead>
              <tr>
                <th>Model</th>
                <th>Matches</th>
                <th>Proportion</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>VADER</td>
                <td>12 / 15</td>
                <td>80.0%</td>
              </tr>
              <tr>
                <td>DistilBERT</td>
                <td>10 / 15</td>
                <td>66.7%</td>
              </tr>
            </tbody>
          </table>
          <div class="insight">
            Do not read this small, AI-assisted pilot as a ranking of general model
            accuracy. A larger, independently annotated sample is needed.
          </div>
        </div>
      </div>`;
  return /* HTML */ `<div class="lab-grid">
    <div class="card">
      <h2>Where predictions meet.</h2>
      <div class="legend">
        <span><i class="dot"></i>Same label / neutral</span
        ><span><i class="dot coral"></i>Opposite polarity</span>
      </div>
      ${scatter()}
      <div class="chart-note">
        Pearson r = ${fmt(stats.correlation)}. Both score axes run from −1 to +1, but
        their definitions differ.
      </div>
    </div>
    <div class="card">
      <div class="card-top">
        <h2>Agreement, counted.</h2>
        <span class="pill outline">${stats.nonneutral} RECORDS</span>
      </div>
      ${matrix()}
      <div class="chart-note">
        ${stats.neutral} VADER-neutral records are excluded from this matrix. The binary DistilBERT
        model has no neutral class.
      </div>
      <div class="insight">
        ${stats.nonneutral - stats.opposed} / ${stats.nonneutral} records share the same polarity: ${pct(stats.nonneutral - stats.opposed, stats.nonneutral)}. The other ${stats.opposed} have opposite
        polarity. Agreement says nothing by itself about which model is right.
      </div>
    </div>
  </div>`;
}
function kchart() {
  const rows = DATA.k,
    W = 520,
    H = 210,
    L = 42,
    R = 20,
    T = 22,
    B = 35;
  const xx = (k) => L + ((k - 2) / 6) * (W - L - R),
    yy = (y) => H - B - (y / 0.01) * (H - T - B);
  return /* HTML */ `<svg
    class="chart"
    viewBox="0 0 ${W} ${H}"
    role="img"
    aria-label="TF-IDF mean silhouette decreases from 0.0074 at two clusters to 0.0019 at eight clusters"
  >
    ${[0, 0.005, 0.01].map((v) => `<path d="M${L} ${yy(v)}H${W - R}" stroke="#e9ece4"/><text x="${L - 7}" y="${yy(v) + 3}" text-anchor="end" font-size="9" fill="#6d7a7b">${v.toFixed(3)}</text>`).join('')}
    <path
      d="${rows.map((r, i) => `${i ? 'L' : 'M'}${xx(r.k)} ${yy(r.silhouette_mean)}`).join(' ')}"
      fill="none"
      stroke="#4c847e"
      stroke-width="2"
    />
    ${rows.map((r) => `<circle cx="${xx(r.k)}" cy="${yy(r.silhouette_mean)}" r="4" fill="#4c847e"/><text x="${xx(r.k)}" y="${H - 17}" text-anchor="middle" font-size="10" fill="#6d7a7b">${r.k}</text>`).join('')}
    <text x="${W / 2}" y="${H - 1}" text-anchor="middle" font-size="9" fill="#6d7a7b">
      Number of clusters K
    </text>
  </svg>`;
}
function methods() {
  return /* HTML */ `<section class="view">
    ${pageHeader('Behind the analysis', 'A useful result includes its limits.', 'A reproducible Python workflow, a fixed research snapshot, and a clear distinction between exploration and validation.')}
    <div class="timeline">
      <div class="step"><strong>1,000</strong>Selected records</div>
      <span>→</span>
      <div class="step"><strong>988</strong>Lyrics retrieved</div>
      <span>→</span>
      <div class="step"><strong>935</strong>After record / quality checks</div>
      <span>→</span>
      <div class="step"><strong>928</strong>English-screened</div>
      <span>→</span>
      <div class="step"><strong>927</strong>After final mismatch exclusion</div>
    </div>
    <div class="method-layout">
      <div class="method-aside">Explore the evidence.<br />Keep the uncertainty.</div>
      <div>
        <details open>
          <summary>What is this sample?</summary>
          <p>
            The supplied Kaggle-derived Spotify metadata contains 9,999 rows. The original
            workflow selected up to 50 records per album/version year from 2003–2022,
            ranked by the dataset's Popularity field. This is neither a historical
            year-end chart nor a representative sample of all popular music. The exact
            Kaggle dataset URL and original snapshot date remain unverified.
          </p>
          <p>
            988 lyric fields were retrieved for 1,000 selected records. Record checks
            removed duplicate URIs and same-recording duplicates; later analysis
            deduplicated ISRCs and same-artist identical texts. Known mismatches or
            incomplete lyrics were excluded. Not every retained lyric has been
            independently checked. Album/version year is not the original song release
            year, the yearly charts group the retained records by this metadata field.
            Positive shares use all records within each year as the denominator, with no
            smoothing. This selection does not establish a population trend or an event
            effect.
          </p>
        </details>
        <details>
          <summary>How were the texts prepared?</summary>
          <p>
            The original lyrics are preserved. A separate text version removes bracketed
            section markers and observed webpage metadata. Another version removes
            repeated lines, case-insensitively, retaining the first occurrence. This
            comparison also changes text length and context.
          </p>
          <p>
            Language screening used langdetect on the whole text and its two halves, with
            a fixed seed and a working estimate threshold of 0.90. Of 935 candidates, 911
            passed automatically; 17 of 24 flagged texts were accepted after AI-assisted
            reading. Seven remained excluded for language or mismatch issues. One later
            mismatch exclusion leaves 927 records. Language screening is not a complete
            human verification.
          </p>
        </details>
        <details>
          <summary>Which sentiment models and scores?</summary>
          <p>
            VADER uses a sentiment lexicon and rules. The transformer is
            <code>distilbert/distilbert-base-uncased-finetuned-sst-2-english</code>,
            revision <code>714eb0f</code>, fine-tuned on SST-2, not on this lyric sample.
          </p>
          <p>
            Each text is tokenized and divided into non-overlapping blocks of up to 384
            tokens. Both models receive the same decoded blocks. The uncased tokenizer
            loses original capitalization, which removes one of VADER's cues; chunk
            boundaries can split context. Blocks are averaged with token-count weights.
          </p>
          <p>
            VADER uses weighted compound scores, labelled positive at ≥0.05 and negative
            at ≤−0.05; the rest are neutral. DistilBERT uses weighted (2 × P(positive) −
            1), labelled positive at ≥0, otherwise negative. These are different scales.
            The transformed model score is not a calibrated measure of emotional
            intensity.
          </p>
          <p>
            <a
              href="https://github.com/cjhutto/vaderSentiment"
              target="_blank"
              rel="noopener"
              >VADER documentation ↗</a
            >
            ·
            <a
              href="https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english"
              target="_blank"
              rel="noopener"
              >DistilBERT model card ↗</a
            >
          </p>
        </details>
        <details>
          <summary>Why not present clear lyric themes?</summary>
          <p>
            TF-IDF with K-means was tested for K=2–8, each with three seeds and n_init=10.
            The text used unique lines, English stopwords, additional vocal fillers,
            unigrams and bigrams, min_df=5, max_df=0.8, sublinear TF, and at most 3,000
            features (2,570 retained).
          </p>
          ${kchart()}
          <table>
            <thead>
              <tr>
                <th>K=2 comparison</th>
                <th>Original-space silhouette</th>
                <th>Seed ARI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TF-IDF</td>
                <td>0.00738</td>
                <td>0.681</td>
              </tr>
              <tr>
                <td>LSA · 50 dimensions</td>
                <td>0.00746</td>
                <td>0.920</td>
              </tr>
            </tbody>
          </table>
          <p>
            LSA tested 50, 100 and 200 dimensions, with L2 normalization after Truncated
            SVD. The 50-dimensional projection retained 17.85% of reported variance and
            its own-space silhouette was 0.04910. Different-space silhouettes are not
            directly comparable. The original-space score barely improves, though K-means
            seed stability rises. SVD itself used one fixed seed. Cluster labels remain
            exploratory, with no claim of distinct verified themes.
          </p>
          <p>
            K-means fits with Euclidean distance; silhouette was evaluated using cosine
            distance. The LSA selection used original-space silhouette among candidates
            with at least 20 records in each cluster across all three K-means seeds. There
            is no held-out validation of this clustering choice.
          </p>
        </details>
        <details>
          <summary>What does the reviewed pilot establish?</summary>
          <p>
            A simple random pilot of 20 records (seed 20261027) received AI-drafted labels
            and reasons, followed by user review. Ten were positive, five negative, and
            five mixed. Some cases had prior discussion. This is not independent blind
            human ground truth.
          </p>
          <p>
            The 15 positive/negative cases yield 12 VADER matches and 10 DistilBERT
            matches. The five mixed cases cannot be treated as neutral or forced into
            binary labels. These small-sample proportions are only exploratory reference
            agreement, not general accuracy estimates.
          </p>
        </details>
        <details>
          <summary>What is available in this website?</summary>
          <p>
            This static dashboard uses saved analysis outputs. It does not retrain models,
            generate live predictions, play audio or expose full lyrics. Score exports
            contain only song metadata, predictions and annotation provenance.
          </p>
          <p>
            Python analysis: pandas, scikit-learn, NLTK/VADER, Hugging Face Transformers
            and PyTorch. Interface: HTML, CSS, JavaScript and SVG. Full lyric distribution
            and an independent accuracy benchmark remain outside this first version.
          </p>
        </details>
      </div>
    </div>
  </section>`;
}
// 單首歌曲詳情：從 songs 找出相同 id，顯示分數及處理前後比較。
function scoreChangeChart(s) {
  const x = (value) => 95 + (value + 1) * 135;
  const rows = [['VADER', s.v, s.uv, 38], ['DistilBERT', s.t, s.ut, 86]];
  return `<figure class="score-change"><figcaption>Full text ● → Unique lines ◇</figcaption><svg viewBox="0 0 390 130" role="img" aria-label="Score changes. VADER: ${fmt(s.v)} to ${fmt(s.uv)}. DistilBERT: ${fmt(s.t)} to ${fmt(s.ut)}. Exact scores and labels follow in the table.">
    ${[-1, 0, 1].map((v) => `<path d="M${x(v)} 18V104" stroke="#dedfd7"/><text x="${x(v)}" y="122" text-anchor="middle">${v}</text>`).join('')}
    ${rows.map(([name, full, unique, y]) => `<text x="0" y="${y+5}">${name}</text><path d="M${x(full)} ${y}H${x(unique)}" stroke="#4c847e" stroke-width="3"/><circle cx="${x(full)}" cy="${y}" r="5" fill="#4c847e"/><path d="M${x(unique)} ${y-7}l7 7-7 7-7-7Z" fill="#f6f5f0" stroke="#b76654" stroke-width="2"/>`).join('')}
    </svg><p class="chart-note">Each row uses its model’s own score definition. Distance between models is not a measure of error.</p></figure>`;
}

function openSong(id, version = state.version) {
  const s = songs.find((s) => s.id === Number(id));
  if (!s) return;
  state.song = String(s.id);
  state.detailVersion = version;
  syncUrl();
  const unique = version === 'unique';
  const v = unique ? s.uv : s.v, t = unique ? s.ut : s.t;
  const vl = vlabel(v), tl = tlabel(t);
  const versionName = unique ? 'unique lines' : 'full text';
  lastFocus = document.activeElement;
  const drawer = document.querySelector('#song-drawer');
  const reason = s.review
    ? /* HTML */ `<div class="drawer-section">
        <h3>Reviewed pilot · ${esc(s.review.label)}</h3>
        <p>${esc(s.review.reason)}</p>
        <p>${esc(s.review.note)}</p>
        <span class="pill outline">AI draft · user reviewed · not ground truth</span>
      </div>`
    : '';
  document.querySelector('#drawer-content').innerHTML = /* HTML */ `<div class="eyebrow">
      Record ${s.id} / ${songs.length}-record sample
    </div>
    <h2 id="drawer-title">${esc(s.title)}</h2>
    <div class="subtitle">${esc(s.artist)}</div>
    <button class="export" type="button" data-copy-link>Copy link to this record</button>
    <p id="drawer-share-status" role="status" aria-live="polite"></p>
    <div class="score-pair">
      <div class="score-box">
        <span class="chip-label">VADER · ${versionName}</span
        ><strong class="${vl}">${fmt(v)}</strong>${badge(vl)}
      </div>
      <div class="score-box">
        <span class="chip-label">DistilBERT · ${versionName}</span
        ><strong class="${tl}">${fmt(t)}</strong>${badge(tl)}
      </div>
    </div>
    <p class="subtext">
      ${vl === tl ? 'Both models assign the same label. This is agreement, not evidence of correctness.' : vl === 'neutral' ? 'VADER is neutral; DistilBERT must select a positive or negative direction.' : 'The models assign opposite polarity. Read this as a case for inspection, not a verdict.'}
    </p>
    <div class="drawer-section">
      <h3>What changes without repeated lines?</h3>
      ${scoreChangeChart(s)}
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Full</th>
            <th>Unique lines</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>VADER</td>
            <td>${fmt(s.v)}<br />${badge(s.vl)}</td>
            <td>${fmt(s.uv)}<br />${badge(s.uvl)}</td>
          </tr>
          <tr>
            <td>DistilBERT</td>
            <td>${fmt(s.t)}<br />${badge(s.tl)}</td>
            <td>${fmt(s.ut)}<br />${badge(s.utl)}</td>
          </tr>
        </tbody>
      </table>
      <p>
        ${pct(s.repeat, 1)} of cleaned lines repeat (case-insensitive). Full text covers
        ${s.tokens} tokens in ${s.chunks} chunk${s.chunks === 1 ? '' : 's'}. Removing
        lines also changes chunking and context.
      </p>
    </div>
    ${reason}
    <div class="drawer-section">
      <h3>Interpret with care</h3>
      <p>
        The model scores use different definitions.
        ${s.review ? 'This record has a reviewed pilot label.' : 'This record has no reviewed reference label.'}
        Record-level language screening and deduplication do not guarantee a correct,
        complete lyric match.
      </p>
      <p>
        Album/version metadata year: ${s.year}. Original release year is unverified. No
        full copyrighted lyrics are displayed.
      </p>
      <a class="text-link" href="#methods" id="drawer-methods">Read the methodology ↗</a>
    </div>`;
  drawer.hidden = false;
  drawer.scrollTop = 0;
  tip.hidden = true;
  document.querySelector('#drawer-backdrop').hidden = false;
  document.querySelectorAll('header, main, footer').forEach((el) => {
    el.inert = true;
  });
  document.body.style.overflow = 'hidden';
  drawer.querySelector('.close').focus();
}
function closeSong({ updateUrl = true } = {}) {
  const drawer = document.querySelector('#song-drawer');
  if (drawer.hidden) return;
  drawer.hidden = true;
  if (updateUrl) { state.song = ''; syncUrl(); }
  document.querySelector('#drawer-backdrop').hidden = true;
  document.querySelectorAll('header, main, footer').forEach((el) => {
    el.inert = false;
  });
  document.body.style.overflow = '';
  if (lastFocus?.isConnected) lastFocus.focus();
  lastFocus = null;
}
// 頁面切換：依網址的 #overview／#explorer 等名稱產生內容。
function route({ focusSelector, scroll = true } = {}) {
  if (!DATA) return;
  closeSong({ updateUrl: false });
  tip.hidden = true;
  let page = location.hash.slice(1) || 'overview';
  if (!['overview', 'explorer', 'lab', 'methods'].includes(page)) page = 'overview';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === page);
    if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  main.innerHTML =
    page === 'overview'
      ? overview()
      : page === 'explorer'
        ? explorer()
        : page === 'lab'
          ? lab()
          : methods();
  document.querySelectorAll('[data-version], [data-lab]').forEach((button) => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
  if (page === 'explorer') {
    document.querySelector('#year-filter').onchange = (e) => { state.year = e.target.value; state.page = 1; renderResults(); };
    document.querySelector('#reset-filters').onclick = () => goExplorer({ version: state.version });
    document.querySelector('#filter').value = state.filter;
    document.querySelector('#sort').value = state.sort;
    renderResults();
    document.querySelector('#search').addEventListener('input', (e) => {
      state.query = e.target.value;
      state.page = 1;
      renderResults();
    });
    document.querySelector('#filter').onchange = (e) => {
      state.filter = e.target.value;
      state.page = 1;
      renderResults();
    };
    document.querySelector('#sort').onchange = (e) => {
      state.sort = e.target.value;
      state.page = 1;
      renderResults();
    };
  }
  syncUrl();
  if (state.song) openSong(state.song, state.detailVersion);
  if (focusSelector && !state.song)
    document.querySelector(focusSelector)?.focus({ preventScroll: true });
  if (scroll) window.scrollTo(0, 0);
}
document.addEventListener('click', (e) => {
  const year = e.target.closest('[data-year]');
  if (year) { e.preventDefault(); goExplorer({ year: year.dataset.year, version: year.dataset.yearVersion }); return; }
  const go = e.target.closest('[data-go-lab]');
  if (go) state.lab = go.dataset.goLab;
  const s = e.target.closest('[data-song]');
  if (s) {
    openSong(s.dataset.song, s.dataset.textVersion || (location.hash === '#explorer' ? state.version : 'full'));
    return;
  }
  const v = e.target.closest('[data-version]');
  if (v) {
    state.version = v.dataset.version;
    state.page = 1;
    route({ focusSelector: `[data-version="${state.version}"]`, scroll: false });
    return;
  }
  const l = e.target.closest('[data-lab]');
  if (l) {
    state.lab = l.dataset.lab;
    route({ focusSelector: `[data-lab="${state.lab}"]`, scroll: false });
    return;
  }
  if (e.target.closest('#show-sensitive')) {
    state.filter = 'sensitive';
    state.query = '';
    state.page = 1;
    goExplorer({ filter: 'sensitive', version: state.version });
  }
  if (e.target.closest('#show-reviewed')) {
    state.filter = 'reviewed';
    state.query = '';
    state.page = 1;
    goExplorer({ filter: 'reviewed', version: state.version });
  }
  if (e.target.closest('#drawer-methods')) closeSong();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSong();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-song]')) {
    e.preventDefault();
    openSong(e.target.dataset.song);
  }
  const drawer = document.querySelector('#song-drawer');
  if (e.key === 'Tab' && !drawer.hidden) {
    const items = [
      ...drawer.querySelectorAll('button,a[href],input,select,[tabindex="0"]'),
    ];
    if (e.shiftKey && document.activeElement === items[0]) {
      e.preventDefault();
      items.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
      e.preventDefault();
      items[0].focus();
    }
  }
});
document.querySelector('.close').onclick = closeSong;
document.querySelector('#drawer-backdrop').onclick = closeSong;
document.addEventListener('pointerover', (e) => {
  const p = e.target.closest('circle[data-song]');
  if (!p) return;
  const s = songs.find((x) => x.id === Number(p.dataset.song));
  tip.textContent = `${s.title} · ${s.artist}`;
  tip.hidden = false;
});
document.addEventListener('pointermove', (e) => {
  tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 290) + 'px';
  tip.style.top = Math.max(8, e.clientY - 38) + 'px';
});
document.addEventListener('pointerout', (e) => {
  if (e.target.closest('circle[data-song]')) tip.hidden = true;
});
window.addEventListener('hashchange', () => { if (DATA) { readUrlState(); route(); } });
window.addEventListener('popstate', () => { if (DATA) { readUrlState(); route(); } });
// 啟動入口：載入已保存的 Python 分析結果，不會在瀏覽器跑 NLP 模型。
fetch('data.json')
  .then((r) => {
    if (!r.ok) throw Error('Dataset could not be loaded');
    return r.json();
  })
  .then((d) => {
    DATA = d;
    songs = d.songs;
    stats = d.stats;
    readUrlState();
    route();
  })
  .catch(() => {
    main.innerHTML =
      '<div class="empty"><h1>The dataset could not be loaded.</h1><p>Please refresh this page. If you opened a downloaded HTML file directly, use a local web server.</p></div>';
  });

// Copy the current view, including filters and the open record.
document.addEventListener('click', async (e) => {
  if (!e.target.closest('#copy-link, [data-copy-link]')) return;
  const status = document.querySelector('#song-drawer').hidden
    ? document.querySelector('#share-status')
    : document.querySelector('#drawer-share-status');
  try {
    syncUrl();
    await navigator.clipboard.writeText(location.href);
    status.textContent = 'Link copied.';
  } catch {
    status.textContent = 'Copy the current URL from your browser address bar to share this view.';
  }
});
