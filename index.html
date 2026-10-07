/* アイカツ！アンコール 設置店マップ */
(() => {
  'use strict';
  const CFG = Object.assign({ GOOGLE_MAPS_API_KEY: '', GOOGLE_MAP_ID: 'DEMO_MAP_ID', NEAREST_COUNT: 30 }, window.APP_CONFIG);
  const PREFS = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const JAPAN = { lat: 36.6, lng: 137.6 };
  const LIST_CAP = 100;
  const isMobile = () => matchMedia('(max-width: 760px)').matches;

  const $ = (s) => document.querySelector(s);
  const el = { panel: $('#panel'), grab: $('#grab'), locate: $('#locate'), q: $('#q'), pref: $('#pref'),
    status: $('#status'), list: $('#list'), map: $('#map'), note: $('#mapNote'), tpl: $('#tpl-item'), source: $('#source') };

  const state = { stores: [], byId: new Map(), filtered: [], user: null, mode: 'view', activeId: null, map: null };

  // ------------------------------------------------------------ utils
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  function km(a, b) {
    const r = Math.PI / 180, R = 6371;
    const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const fmtKm = (d) => (d < 1 ? `${Math.round(d * 1000 / 10) * 10}m` : d < 10 ? `${d.toFixed(1)}km` : `${Math.round(d)}km`);
  const telHref = (t) => (t && /\d{9,}/.test(t.replace(/-/g, '')) ? `tel:${t.replace(/[^\d+]/g, '')}` : '');
  const gmapsSearch = (s) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.n} ${s.a}`)}`;
  const gmapsRoute = (s) => `https://www.google.com/maps/dir/?api=1&destination=${
    s.x ? encodeURIComponent(`${s.n} ${s.a}`) : `${s.lat},${s.lng}`}`;

  function infoHTML(s) {
    const tel = telHref(s.t);
    const d = state.user ? `<b style="color:#c2246c">現在地から ${fmtKm(km(state.user, s))}</b>　` : '';
    return `<div class="info">
      <h3>${esc(s.n)}</h3>
      <p>${d}${esc(s.a)}${s.t ? `<br>TEL ${esc(s.t)}` : ''}</p>
      <div class="btns">
        <a class="primary" href="${gmapsRoute(s)}" target="_blank" rel="noopener">ここへの経路</a>
        <a href="${gmapsSearch(s)}" target="_blank" rel="noopener">Googleマップで開く</a>
        ${tel ? `<a href="${tel}">電話</a>` : ''}
      </div>
      ${s.x ? '<p class="note">※ 地図上の位置は町名レベルの概算です</p>' : ''}
    </div>`;
  }
  function pinEl(s) {
    const d = document.createElement('div');
    d.className = 'pin' + (s.x ? ' approx' : '');
    d.title = s.n;
    d.dataset.id = s.id;
    return d;
  }
  function clusterHTML(n) {
    const size = n >= 100 ? 'l' : n >= 10 ? 'm' : '';
    return `<div class="cluster ${size}">${n}</div>`;
  }
  function note(msg) {
    el.note.textContent = msg || '';
    el.note.hidden = !msg;
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error('load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  // ------------------------------------------------------------ map: Google
  function GoogleAdapter() {
    let map, info, Marker, clusterer, markers = new Map(), userMarker;
    const self = {
      name: 'google',
      async init(container, onSelect, onMove) {
        await new Promise((resolve, reject) => {
          const cb = '__gmapsReady' + Date.now();
          window[cb] = resolve;
          const p = new URLSearchParams({ key: CFG.GOOGLE_MAPS_API_KEY, v: 'weekly', language: 'ja', region: 'JP', loading: 'async', callback: cb });
          loadScript('https://maps.googleapis.com/maps/api/js?' + p).catch(reject);
          setTimeout(() => reject(new Error('timeout')), 15000);
        });
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary('maps'), google.maps.importLibrary('marker'),
        ]);
        Marker = AdvancedMarkerElement;
        map = new Map(container, {
          center: JAPAN, zoom: isMobile() ? 4 : 5, mapId: CFG.GOOGLE_MAP_ID || 'DEMO_MAP_ID',
          gestureHandling: 'greedy', mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
          clickableIcons: false,
        });
        info = new google.maps.InfoWindow();
        map.addListener('click', () => info.close());
        map.addListener('idle', onMove);
        map.addListener('dragstart', () => self.onDrag && self.onDrag());
        self.onSelect = onSelect;
        try { await loadScript('https://cdn.jsdelivr.net/npm/@googlemaps/markerclusterer@2/dist/index.min.js'); } catch (e) { /* クラスタなしで続行 */ }
      },
      setStores(stores) {
        for (const s of stores) {
          const content = pinEl(s);
          const m = new Marker({ position: { lat: s.lat, lng: s.lng }, content, title: s.n });
          content.addEventListener('click', (e) => { e.stopPropagation(); self.onSelect(s.id, 'map'); });
          markers.set(s.id, m);
        }
        if (window.markerClusterer) {
          clusterer = new markerClusterer.MarkerClusterer({
            map, markers: [],
            renderer: {
              render: ({ count, position }) => {
                const c = document.createElement('div');
                c.innerHTML = clusterHTML(count);
                return new Marker({ position, content: c.firstChild, zIndex: 1000 + count });
              },
            },
          });
        }
      },
      setVisible(ids) {
        const list = [...ids].map((id) => markers.get(id)).filter(Boolean);
        if (clusterer) { clusterer.clearMarkers(true); clusterer.addMarkers(list); }
        else { for (const [id, m] of markers) m.map = ids.has(id) ? map : null; }
      },
      contains(s) { const b = map.getBounds(); return b ? b.contains({ lat: s.lat, lng: s.lng }) : true; },
      center() { const c = map.getCenter(); return { lat: c.lat(), lng: c.lng() }; },
      focus(s) {
        const m = markers.get(s.id);
        map.panTo({ lat: s.lat, lng: s.lng });
        if (map.getZoom() < 16) map.setZoom(16);
        info.setContent(infoHTML(s));
        setTimeout(() => info.open({ map, anchor: m }), 250);
      },
      setActive(id, prev) {
        if (prev && markers.get(prev)) markers.get(prev).content.classList.remove('active');
        if (id && markers.get(id)) { markers.get(id).content.classList.add('active'); markers.get(id).zIndex = 999; }
      },
      setUser(p) {
        if (!userMarker) { const d = document.createElement('div'); d.className = 'me'; userMarker = new Marker({ map, position: p, content: d, zIndex: 2000, title: '現在地' }); }
        else userMarker.position = p;
      },
      fit(points) {
        if (points.length === 1) { map.setCenter(points[0]); map.setZoom(15); return; }
        const b = new google.maps.LatLngBounds();
        points.forEach((p) => b.extend(p));
        map.fitBounds(b, isMobile() ? { top: 40, bottom: 40, left: 30, right: 30 } : 60);
      },
    };
    return self;
  }

  // ------------------------------------------------------------ map: Leaflet (OpenStreetMap)
  function LeafletAdapter() {
    let map, group, markers = new Map(), userMarker;
    const icon = (s, active) => L.divIcon({ html: `<div class="pin${s.x ? ' approx' : ''}${active ? ' active' : ''}"></div>`,
      className: '', iconSize: active ? [34, 34] : [26, 26], iconAnchor: active ? [17, 41] : [13, 31] });
    const self = {
      name: 'leaflet',
      async init(container, onSelect, onMove) {
        map = L.map(container, { zoomControl: !isMobile(), worldCopyJump: true }).setView([JAPAN.lat, JAPAN.lng], isMobile() ? 4 : 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        group = L.markerClusterGroup({
          showCoverageOnHover: false, maxClusterRadius: 50, chunkedLoading: true, spiderfyOnMaxZoom: true,
          iconCreateFunction: (c) => L.divIcon({ html: clusterHTML(c.getChildCount()), className: '', iconSize: [48, 48] }),
        });
        map.addLayer(group);
        map.on('moveend', onMove);
        map.on('dragstart', () => self.onDrag && self.onDrag());
        self.onSelect = onSelect;
        setTimeout(onMove, 0);
      },
      setStores(stores) {
        for (const s of stores) {
          const m = L.marker([s.lat, s.lng], { icon: icon(s), title: s.n });
          m.on('click', () => self.onSelect(s.id, 'map'));
          m._store = s;
          markers.set(s.id, m);
        }
      },
      setVisible(ids) {
        group.clearLayers();
        group.addLayers([...ids].map((id) => markers.get(id)).filter(Boolean));
      },
      contains(s) { return map.getBounds().contains([s.lat, s.lng]); },
      center() { const c = map.getCenter(); return { lat: c.lat, lng: c.lng }; },
      focus(s) {
        const m = markers.get(s.id);
        const open = () => L.popup({ offset: [0, -26], maxWidth: 300 }).setLatLng([s.lat, s.lng]).setContent(infoHTML(s)).openOn(map);
        if (m && group.hasLayer(m)) {
          map.setView([s.lat, s.lng], Math.max(map.getZoom(), 16));
          group.zoomToShowLayer(m, open);
        } else { map.setView([s.lat, s.lng], 16); open(); }
      },
      setActive(id, prev) {
        if (prev && markers.get(prev)) markers.get(prev).setIcon(icon(markers.get(prev)._store, false));
        if (id && markers.get(id)) { markers.get(id).setIcon(icon(markers.get(id)._store, true)); markers.get(id).setZIndexOffset(1000); }
      },
      setUser(p) {
        const ic = L.divIcon({ html: '<div class="me"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
        if (!userMarker) userMarker = L.marker([p.lat, p.lng], { icon: ic, zIndexOffset: 2000, title: '現在地' }).addTo(map);
        else userMarker.setLatLng([p.lat, p.lng]);
      },
      fit(points) {
        if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 15); return; }
        map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
      },
    };
    return self;
  }

  // ------------------------------------------------------------ list / filter
  function applyFilter({ fit = false } = {}) {
    const q = norm(el.q.value), pref = el.pref.value;
    state.filtered = state.stores.filter((s) => (!pref || s.p === pref) && (!q || s._k.includes(q)));
    state.map.setVisible(new Set(state.filtered.map((s) => s.id)));
    if (fit && state.filtered.length) {
      state.mode = 'view';
      const pts = state.filtered.map((s) => ({ lat: s.lat, lng: s.lng }));
      if (state.user && !pref) pts.push(state.user);
      state.map.fit(pts);
    }
    renderList();
  }

  function renderList() {
    if (!state.map) return;
    const q = el.q.value.trim();
    const origin = state.user || state.map.center();
    const withD = (arr) => arr.map((s) => ({ s, d: km(origin, s) })).sort((a, b) => a.d - b.d);
    let rows, msg;

    if (state.mode === 'near' && state.user && !q) {
      rows = withD(state.filtered).slice(0, CFG.NEAREST_COUNT);
      msg = `現在地から近い順に <b>${rows.length}</b> 件`;
    } else if (q) {
      rows = withD(state.filtered);
      msg = `「${esc(q)}」に一致する店舗 <b>${rows.length}</b> 件${rows.length > LIST_CAP ? `（近い順に${LIST_CAP}件表示）` : ''}`;
      rows = rows.slice(0, LIST_CAP);
    } else {
      const inView = state.filtered.filter((s) => state.map.contains(s));
      rows = withD(inView);
      msg = `地図の範囲に <b>${rows.length}</b> 件${rows.length > LIST_CAP ? `（中心に近い${LIST_CAP}件を表示・拡大すると絞り込めます）` : ''}`;
      rows = rows.slice(0, LIST_CAP);
    }
    el.status.className = 'status';
    el.status.innerHTML = msg;

    const frag = document.createDocumentFragment();
    for (const { s, d } of rows) {
      const li = el.tpl.content.firstElementChild.cloneNode(true);
      li.dataset.id = s.id;
      if (s.id === state.activeId) li.classList.add('active');
      li.querySelector('.name').innerHTML = esc(s.n) + (s.x ? '<span class="badge-approx" title="位置は町名レベルの概算です">概算</span>' : '');
      li.querySelector('.addr').textContent = s.a;
      li.querySelector('.dist').textContent = state.user ? fmtKm(state.user === origin ? d : km(state.user, s)) : '';
      li.querySelector('.route').href = gmapsRoute(s);
      const tel = telHref(s.t);
      const telA = li.querySelector('.tel');
      if (tel) telA.href = tel; else telA.hidden = true;
      li.querySelector('.item-main').addEventListener('click', () => select(s.id, 'list'));
      frag.appendChild(li);
    }
    el.list.replaceChildren(frag);
    if (!rows.length) {
      el.list.innerHTML = `<li class="empty">${q || el.pref.value ? '条件に合う店舗が見つかりません。' : 'この範囲に店舗はありません。<br>地図を動かすか、縮小してみてください。'}</li>`;
    }
  }

  function select(id, from) {
    const s = state.byId.get(id);
    if (!s) return;
    state.map.setActive(id, state.activeId);
    state.activeId = id;
    state.map.focus(s);
    history.replaceState(null, '', '#' + id);
    for (const li of el.list.children) li.classList.toggle('active', li.dataset.id === id);
    if (from === 'map') {
      const li = el.list.querySelector(`[data-id="${id}"]`);
      if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (from === 'list' && isMobile()) setSheet('collapsed');
  }

  // ------------------------------------------------------------ geolocation
  function locate() {
    if (!navigator.geolocation) return warn('このブラウザは位置情報に対応していません。');
    el.locate.classList.add('busy');
    el.locate.querySelector('span').textContent = '現在地を取得中…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        done();
        state.user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.map.setUser(state.user);
        state.mode = 'near';
        el.q.value = '';
        el.pref.value = '';
        applyFilter();
        const near = state.filtered.map((s) => ({ s, d: km(state.user, s) })).sort((a, b) => a.d - b.d).slice(0, 5);
        state.map.fit([state.user, ...near.map(({ s }) => ({ lat: s.lat, lng: s.lng }))]);
        if (isMobile()) setSheet('');
      },
      (err) => {
        done();
        const m = {
          1: '位置情報の利用が許可されていません。ブラウザの設定で許可してください。',
          2: '現在地を特定できませんでした。電波の良い場所で再度お試しください。',
          3: '現在地の取得がタイムアウトしました。もう一度お試しください。',
        }[err.code] || '現在地を取得できませんでした。';
        warn(location.protocol === 'https:' || location.hostname === 'localhost' ? m : m + '（位置情報は https でのみ利用できます）');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
    function done() {
      el.locate.classList.remove('busy');
      el.locate.querySelector('span').textContent = '現在地から近いお店を探す';
    }
  }
  function warn(m) { el.status.className = 'status warn'; el.status.textContent = m; }

  // ------------------------------------------------------------ mobile sheet
  function setSheet(mode) {
    el.panel.classList.toggle('expanded', mode === 'expanded');
    el.panel.classList.toggle('collapsed', mode === 'collapsed');
  }
  el.grab.addEventListener('click', () => setSheet(el.panel.classList.contains('expanded') ? 'collapsed' : 'expanded'));
  el.q.addEventListener('focus', () => isMobile() && setSheet('expanded'));

  // ------------------------------------------------------------ boot
  async function startMap(adapter) {
    let moveTimer;
    const onMove = () => { clearTimeout(moveTimer); moveTimer = setTimeout(renderList, 80); };
    await adapter.init(el.map, select, onMove);
    adapter.onDrag = () => { state.mode = 'view'; };
    adapter.setStores(state.stores);
    state.map = adapter;
    applyFilter();
    if (state.user) adapter.setUser(state.user);
  }

  async function fallbackToLeaflet(reason) {
    if (state.map && state.map.name === 'leaflet') return;
    console.warn('Google Maps unavailable:', reason);
    el.map.replaceChildren();
    el.map.className = '';
    await startMap(LeafletAdapter());
    note('Google マップを読み込めないため、OpenStreetMap で表示しています');
    setTimeout(() => note(''), 6000);
  }

  async function boot() {
    PREFS.forEach((p) => el.pref.add(new Option(p, p)));

    let data;
    try {
      const res = await fetch('data/stores.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      data = await res.json();
    } catch (e) {
      warn('店舗の位置データ（data/stores.json）が見つかりません。README の手順でジオコーディングを実行してください。');
      data = { stores: [] };
    }
    state.stores = (data.stores || []).map((s) => ({ ...s, _k: norm(`${s.n} ${s.a} ${s.p}`) }));
    state.stores.forEach((s) => state.byId.set(s.id, s));
    if (data.source) el.source.textContent = `取扱店舗一覧 ${data.source.replace(/-/g, '/')}時点・${state.stores.length}店舗`;
    const present = new Set(state.stores.map((s) => s.p));
    [...el.pref.options].forEach((o) => { if (o.value && !present.has(o.value)) o.disabled = true; });

    if (CFG.GOOGLE_MAPS_API_KEY) {
      window.gm_authFailure = () => fallbackToLeaflet('auth failure');
      try { await startMap(GoogleAdapter()); }
      catch (e) { await fallbackToLeaflet(e); }
    } else {
      await startMap(LeafletAdapter());
    }

    let qt;
    el.q.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => applyFilter({ fit: !!el.q.value.trim() }), 250); });
    el.pref.addEventListener('change', () => applyFilter({ fit: true }));
    el.locate.addEventListener('click', locate);

    const id = location.hash.slice(1);
    if (id && state.byId.has(id)) setTimeout(() => select(id, 'link'), 300);
  }

  boot();
})();
