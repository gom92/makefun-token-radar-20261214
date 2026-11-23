/* Token Launch Radar — the page. Reads window.RADAR (written by main.ts
   from the sealed snapshot), renders the board, the detail view, the live
   tab and the model page. No fetch, no network: every number on this page
   comes from the baked-in data. The address bar carries the view:
   #detail=<slug>, #tab=board|live|model, #category=<name>, #chain=<name>,
   #watchlist=1, #q=<text>, #sort=implied|tvl|growth|age|name. */
(function () {
  'use strict';
  var D = window.RADAR;
  var root = document.getElementById('board');
  if (!D || !D.rows) {
    root.innerHTML = '<div class="wrap"><p class="empty">No radar data. Run main.ts to write data.js.</p></div>';
    root.removeAttribute('aria-busy');
    return;
  }

  var state = { tab: 'board', q: '', category: '', chain: '', watch: false, minTvl: 0, sort: 'implied', detail: '' };

  function readHash() {
    var h = window.location.hash.replace(/^#/, '');
    if (!h) return;
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      var k = decodeURIComponent(kv[0] || '');
      var v = decodeURIComponent(kv[1] || '');
      if (k === 'detail') state.detail = v;
      else if (k === 'tab' && (v === 'board' || v === 'live' || v === 'model')) state.tab = v;
      else if (k === 'category') state.category = v;
      else if (k === 'chain') state.chain = v;
      else if (k === 'watchlist') state.watch = v === '1';
      else if (k === 'q') state.q = v;
      else if (k === 'sort') state.sort = v;
      else if (k === 'min') state.minTvl = Number(v) || 0;
    });
  }
  function writeHash() {
    var parts = [];
    if (state.detail) parts.push('detail=' + encodeURIComponent(state.detail));
    if (state.tab !== 'board') parts.push('tab=' + state.tab);
    if (state.category) parts.push('category=' + encodeURIComponent(state.category));
    if (state.chain) parts.push('chain=' + encodeURIComponent(state.chain));
    if (state.watch) parts.push('watchlist=1');
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.sort !== 'implied') parts.push('sort=' + state.sort);
    if (state.minTvl) parts.push('min=' + state.minTvl);
    var h = parts.length ? '#' + parts.join('&') : '';
    if (window.location.hash !== h) history.replaceState(null, '', h);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function pct(n) {
    if (n == null || !isFinite(n)) return '<span class="flat">—</span>';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  }
  function ageText(d) {
    if (d == null) return '—';
    if (d < 365) return d + 'd';
    return (d / 365).toFixed(1) + 'y';
  }
  function chainsText(chains) {
    return chains && chains.length ? chains.slice(0, 3).join(', ') + (chains.length > 3 ? ' +' + (chains.length - 3) : '') : '—';
  }

  var categories = [];
  var chains = [];
  (function () {
    var cs = {}, ch = {};
    D.rows.forEach(function (r) {
      if (r.category) cs[r.category] = 1;
      (r.chains || []).forEach(function (c) { ch[c] = 1; });
    });
    categories = Object.keys(cs).sort();
    chains = Object.keys(ch).sort();
  })();

  function isWatch(r) {
    return D.watchlist && D.watchlist.indexOf(r.slug) >= 0;
  }
  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var rows = D.rows.filter(function (r) {
      if (state.watch && !isWatch(r)) return false;
      if (state.category && r.category !== state.category) return false;
      if (state.chain && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < state.minTvl) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var by = {
      implied: function (a, b) { return b.implied_value_usd - a.implied_value_usd || b.tvl_usd - a.tvl_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); },
      name: function (a, b) { return a.name.localeCompare(b.name); },
    }[state.sort] || function (a, b) { return a.rank - b.rank; };
    return rows.slice().sort(by);
  }

  function headerHtml() {
    return '<header class="hero">' +
      '<div class="eyebrow">Token Launch Radar · model ' + esc(D.model_version) + '</div>' +
      '<h1>Protocols still waiting<br>for a token<span class="dot">.</span></h1>' +
      '<p class="sub">Every protocol in the sealed snapshot that records no token, ranked by what its launch would be worth — and how to farm it before it happens.</p>' +
      '<p class="meta">Snapshot <b>' + esc(D.as_of) + '</b> · Source <b>' + esc(D.source) + '</b> · Floor <b>' + money(D.floor_usd) + ' TVL</b> · ' + D.rows.length + ' rows on the board</p>' +
      '</header>';
  }
  function statsHtml() {
    var top = D.rows[0];
    return '<section class="stats" aria-label="Board summary">' +
      stat('Watchlist', D.watchlist_size, 'protocols at the floor') +
      stat('Board', D.board_size, 'ranked rows') +
      stat('Early finds', D.early_size, 'below the floor') +
      stat('Top implied value', top ? money(top.implied_value_usd) : '—', top ? esc(top.name) : '') +
      stat('Live tokens set aside', D.live_size, 'already trading') +
      '</section>';
  }
  function stat(k, v, small) {
    return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + (small ? ' <small>' + esc(small) + '</small>' : '') + '</div></div>';
  }
  function tabsHtml() {
    function tab(id, label) {
      return '<button class="tab" role="tab" aria-selected="' + (state.tab === id) + '" data-tab="' + id + '">' + label + '</button>';
    }
    return '<div class="tabs" role="tablist">' + tab('board', 'Board') + tab('live', 'Live tokens') + tab('model', 'How the model works') + '</div>';
  }
  function filtersHtml() {
    function opts(list, cur, allLabel) {
      var h = '<option value="">' + allLabel + '</option>';
      list.forEach(function (v) { h += '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>'; });
      return h;
    }
    return '<div class="filters">' +
      '<input type="search" id="f-q" placeholder="Search name or slug…" value="' + esc(state.q) + '" aria-label="Search">' +
      '<select id="f-cat" aria-label="Category">' + opts(categories, state.category, 'All categories') + '</select>' +
      '<select id="f-chain" aria-label="Chain">' + opts(chains, state.chain, 'All chains') + '</select>' +
      '<select id="f-min" aria-label="Minimum TVL">' +
      '<option value="0">Any TVL</option>' +
      '<option value="50000000"' + (state.minTvl === 50000000 ? ' selected' : '') + '>TVL ≥ $50M</option>' +
      '<option value="100000000"' + (state.minTvl === 100000000 ? ' selected' : '') + '>TVL ≥ $100M</option>' +
      '<option value="500000000"' + (state.minTvl === 500000000 ? ' selected' : '') + '>TVL ≥ $500M</option>' +
      '</select>' +
      '<select id="f-sort" aria-label="Sort by">' +
      '<option value="implied"' + (state.sort === 'implied' ? ' selected' : '') + '>Sort: implied value</option>' +
      '<option value="tvl"' + (state.sort === 'tvl' ? ' selected' : '') + '>Sort: TVL</option>' +
      '<option value="growth"' + (state.sort === 'growth' ? ' selected' : '') + '>Sort: 7-day growth</option>' +
      '<option value="age"' + (state.sort === 'age' ? ' selected' : '') + '>Sort: age</option>' +
      '<option value="name"' + (state.sort === 'name' ? ' selected' : '') + '>Sort: name</option>' +
      '</select>' +
      '<label><input type="checkbox" id="f-watch"' + (state.watch ? ' checked' : '') + '> Watchlist only</label>' +
      '</div>';
  }
  function boardHtml(rows) {
    if (!rows.length) return '<p class="empty">No protocols match this filter.</p>';
    var h = '<p class="count">Showing <b>' + rows.length + '</b> of ' + D.rows.length + ' ranked protocols. Click a row for its detail and farm plan.</p>' +
      '<table class="board"><thead><tr><th>#</th><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">7d</th><th class="num">Age</th><th class="num">Implied value</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr data-slug="' + esc(r.slug) + '">' +
        '<td><span class="rank' + (r.rank <= 3 ? ' top' : '') + '">' + r.rank + '</span></td>' +
        '<td><span class="name">' + esc(r.name) + '</span>' + (isWatch(r) ? '<span class="badge">WATCH</span>' : '') + '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(chainsText(r.chains)) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td>' +
        '</tr>';
    });
    return h + '</tbody></table>';
  }
  function detailHtml(r) {
    var m = r.model;
    var steps = (r.farm_steps || []).map(function (s, i) { return '<li>' + esc(s) + '</li>'; }).join('');
    return '<section class="detail" aria-label="Protocol detail">' +
      '<button class="back" id="back">← Back to the board</button>' +
      '<h2>' + esc(r.name) + (isWatch(r) ? '<span class="badge">WATCHLIST</span>' : '') + '</h2>' +
      '<p class="slugline">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(chainsText(r.chains)) + ' · tracked since ' + esc(r.listed_at || 'unknown') + '</p>' +
      '<div class="kv">' +
      '<div><div class="k">Implied value</div><div class="v">' + moneyFull(r.implied_value_usd) + '</div></div>' +
      '<div><div class="k">TVL</div><div class="v">' + moneyFull(r.tvl_usd) + '</div></div>' +
      '<div><div class="k">7-day change</div><div class="v">' + (r.change_7d == null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</div></div>' +
      '<div><div class="k">Age without a token</div><div class="v">' + ageText(r.age_days) + '</div></div>' +
      '</div>' +
      '<h3>How the value is built</h3>' +
      '<div class="formula"><code>' + money(r.tvl_usd) + ' TVL × ' + m.category_multiple + ' category multiple × ' + m.growth_multiplier + ' growth × ' + m.maturity_multiplier + ' maturity = ' + money(r.implied_value_usd) + '</code></div>' +
      '<p class="note">Category multiple ' + m.category_multiple + ' is ' + (m.category_comparables >= 2 ? 'the median market-cap-to-TVL ratio of the ' + m.category_comparables + ' live-token protocols in ' + esc(r.category || 'this category') + ', shrunk toward the global median' : 'the global median — ' + esc(r.category || 'this category') + ' has fewer than two live-token comparables, so no single small protocol sets its price') + '. Growth ' + (m.growth_pct > 0 ? '+' : '') + m.growth_pct + '% over 7 days. Maturity ' + m.maturity_multiplier + ' for ' + ageText(r.age_days) + ' on the books with no token. An implied value is the model’s estimate, not a prediction that a token launches or what it will trade at.</p>' +
      '<h3>Farm plan</h3>' +
      '<ol class="steps">' + steps + '</ol>' +
      '<p class="note">Farm with money you can afford to leave in the position, and never pay anyone to claim an airdrop: real claims cost nothing but gas and come only from the protocol’s own page.</p>' +
      '</section>';
  }
  function liveHtml() {
    var h = '<p class="count">Protocols whose token already trades, shown with the market’s own value — kept apart from the ranked board.</p>' +
      '<table class="board"><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">Market cap</th><th class="num">TVL</th><th class="num">MCap / TVL</th><th class="num">7d</th></tr></thead><tbody>';
    D.live.forEach(function (r) {
      var ratio = r.mcap_usd != null && r.tvl_usd > 0 ? (r.mcap_usd / r.tvl_usd).toFixed(2) + '×' : '—';
      h += '<tr><td><span class="name">' + esc(r.name) + '</span><br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td><td>' + esc(chainsText(r.chains)) + '</td>' +
        '<td class="num"><b>' + money(r.mcap_usd) + '</b></td><td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + ratio + '</td><td class="num">' + pct(r.change_7d) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }
  function modelHtml() {
    return '<section class="modelbox"><h2>How the model works</h2>' +
      '<p><b>Implied value = TVL × category multiple × growth × maturity.</b> Every number comes from the sealed snapshot; no protocol is ever special-cased by name.</p>' +
      '<h3>Category multiple</h3><p>For each category, the median market-cap-to-TVL ratio of the live-token protocols in that category, shrunk toward the global median with a prior of ' + D.model.shrink_prior + ' observations, then clamped to [' + D.model.multiple_floor + ', ' + D.model.multiple_cap + ']. A category needs at least two live comparables to set its own multiple — with fewer, one small protocol would price a whole category, so the board uses the global median. The multiples are computed from the snapshot when the board is built, never written as a table.</p>' +
      '<h3>Growth</h3><p>Seven-day TVL change, clamped to [' + D.model.growth_floor + '%, ' + D.model.growth_cap + '%], weighted ' + D.model.growth_weight + ': multiplier = 1 + growth × ' + D.model.growth_weight + '.</p>' +
      '<h3>Maturity</h3><p>0.6 + min(age, ' + D.model.maturity_days + ' days) / ' + D.model.maturity_days + ' × 0.4. A protocol with no listing date counts as ' + D.model.unknown_age_days + ' days old. Older, still tokenless protocols score higher: they have run longer with no token to sell.</p>' +
      '<h3>What the board leaves out</h3><p>A protocol is pre-token only when the snapshot records no market cap, no CoinGecko id and no symbol for it. Exchanges, bridges, liquid-staking and liquid-restaking products, names ending in a version marker, and names carrying wrapped, staked or staking are not launches of their own and are not ranked. ' + D.excluded_size + ' pre-token protocols are set aside on those rules; the board carries ' + D.board_size + ' rows, the whole ' + D.watchlist_size + '-protocol watchlist plus every other rankable pre-token protocol below the floor.</p>' +
      '<h3>What this is not</h3><p>An implied value is a model’s estimate of what a launch would be worth if the protocol’s record stayed as it is. It does not predict whether or when a token is issued, and a protocol on this board may never issue one. Farm steps are generic DeFi practice derived from each protocol’s category, chains, size and age — do your own checks before putting money in.</p>' +
      '<p>Data: ' + esc(D.source) + ' · ' + D.rows.length + ' protocols ranked · model ' + esc(D.model_version) + '.</p></section>';
  }

  function render() {
    var h = '<div class="wrap">' + headerHtml() + statsHtml() + tabsHtml();
    if (state.detail) {
      var row = null;
      D.rows.forEach(function (r) { if (r.slug === state.detail) row = r; });
      h += row ? detailHtml(row) : '<p class="empty">No protocol with that slug is on the board.</p>';
    } else if (state.tab === 'live') {
      h += liveHtml();
    } else if (state.tab === 'model') {
      h += modelHtml();
    } else {
      h += filtersHtml() + boardHtml(filteredRows());
    }
    h += '<footer class="foot">Token Launch Radar · model ' + esc(D.model_version) + ' · snapshot ' + esc(D.as_of) + ' · ' + esc(D.source) + '. Implied values are model estimates, not predictions.</footer></div>';
    root.innerHTML = h;
    root.removeAttribute('aria-busy');
    writeHash();
    bind();
  }

  function bind() {
    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); state.detail = ''; render(); });
    });
    var back = document.getElementById('back');
    if (back) back.addEventListener('click', function () { state.detail = ''; render(); });
    root.querySelectorAll('tbody tr[data-slug]').forEach(function (tr) {
      tr.addEventListener('click', function () { state.detail = tr.getAttribute('data-slug'); render(); window.scrollTo(0, 0); });
    });
    var q = document.getElementById('f-q');
    if (q) q.addEventListener('input', function () { state.q = q.value; render(); var nq = document.getElementById('f-q'); nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); });
    var cat = document.getElementById('f-cat');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; render(); });
    var ch = document.getElementById('f-chain');
    if (ch) ch.addEventListener('change', function () { state.chain = ch.value; render(); });
    var mn = document.getElementById('f-min');
    if (mn) mn.addEventListener('change', function () { state.minTvl = Number(mn.value) || 0; render(); });
    var st = document.getElementById('f-sort');
    if (st) st.addEventListener('change', function () { state.sort = st.value; render(); });
    var w = document.getElementById('f-watch');
    if (w) w.addEventListener('change', function () { state.watch = w.checked; render(); });
  }

  readHash();
  render();
})();
