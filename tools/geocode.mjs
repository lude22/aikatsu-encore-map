#!/usr/bin/env node
/**
 * 店舗CSV(data/stores.csv) → 緯度経度付きJSON(data/stores.json) を生成する。
 *
 *   node tools/geocode.mjs                 # 国土地理院 住所検索API（無料・キー不要）
 *   GOOGLE_GEOCODING_KEY=xxx node tools/geocode.mjs --provider google
 *
 * - 一度変換した住所は data/geocode-cache.json に保存され、次回以降は再問い合わせしない
 *   （店舗リスト更新時は新規・変更分だけ問い合わせる）
 * - 位置がずれている／見つからない店舗は data/overrides.csv で手動補正できる
 * - 結果のサマリーは data/geocode-report.md に出力
 *
 * 依存パッケージなし（Node.js 18 以上）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const F = {
  csv: path.join(DATA, 'stores.csv'),
  overrides: path.join(DATA, 'overrides.csv'),
  cache: path.join(DATA, 'geocode-cache.json'),
  out: path.join(DATA, 'stores.json'),
  report: path.join(DATA, 'geocode-report.md'),
};

const args = process.argv.slice(2);
const provider = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : 'gsi';
const DELAY_MS = Number(process.env.GEOCODE_DELAY_MS ?? 250);

// ---------------------------------------------------------------- CSV
export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

// ---------------------------------------------------------------- 住所の整形
const PREF_RE = /^(北海道|東京都|京都府|大阪府|.{2,3}県)/;

export function normalizeAddress(raw, pref = '') {
  let s = raw.normalize('NFKC');
  s = s.replace(/(\d)\s*[ー−‐‑–—―ｰ]\s*(?=\d)/g, '$1-'); // 数字間の長音・ダッシュ類 → '-'
  s = s.replace(/[‐‑–—―−]/g, '-');
  s = s.replace(/\s+/g, '');
  if (pref && !s.startsWith(pref)) s = pref + s;
  // 都道府県・市区町村の重複（例: 千葉県千葉県…, 盛岡市盛岡市…）
  s = s.replace(/^(北海道|東京都|京都府|大阪府|.{2,3}県)\1/, '$1');
  s = s.replace(/^((?:北海道|東京都|京都府|大阪府|.{2,3}県))(.{1,6}?[市区町村])\2/, '$1$2');
  return s;
}

/** ジオコーダーに投げる候補住所を、精度の高い順に返す */
export function candidates(raw, pref) {
  // 階数・区画・部屋番号など建物内の情報を除去（空白を詰める前に行う: 「2-1 9階」→「2-19階」になるのを防ぐ）
  let s = raw
    .normalize('NFKC')
    .replace(/(地下)?(?<![\d-])B?\d+(・\d+)?(階|F(?![A-Za-z])|海)/g, ' ')
    .replace(/\d+(区画|号室)/g, ' ')
    .replace(/(店番|区画番号|区画№?|№)\s*[\d-]+/g, ' ');
  s = normalizeAddress(s, pref);

  const out = [];
  // 先頭から最初の「番地ブロック」まで（例: 南3条西4丁目1-1 / 柳町3丁目1番20号 / 長内町第30地割32番-2）
  const m = s.match(/^(.*?\d+(?:(?:丁目|番地|番|号|地割|条|線|の|-|西|東|南|北)+\d+)*)(丁目|番地|番|号)?/);
  if (m) {
    const block = m[1] + (m[2] ?? '');
    out.push(block);
    // 末尾の番号を1つずつ削った候補（例: 1-2-3 → 1-2 → 1）
    let t = m[1];
    while (/(?:丁目|番地|番|号|地割|の|-)\d+$/.test(t)) {
      t = t.replace(/(?:丁目|番地|番|号|地割|の|-)\d+$/, '');
      out.push(t);
    }
    // 番地なしの町名まで
    const town = m[1].replace(/\d.*$/, '');
    if (town.length > 3) out.push(town);
  } else {
    out.push(s);
  }
  return [...new Set(out.map((x) => x.replace(/[-の]+$/, '')))].filter(Boolean);
}

/** 照合用: 都道府県＋最初の市区町村 */
export function municipality(addr) {
  const p = addr.match(PREF_RE)?.[1] ?? '';
  const rest = addr.slice(p.length);
  const c = rest.match(/^.+?[市区町村]/)?.[0] ?? '';
  return { pref: p, city: c };
}

// ---------------------------------------------------------------- ジオコーダー
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'aikatsu-encore-map-geocoder' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries - 1) throw e;
      await sleep(1000 * 2 ** i);
    }
  }
}

async function gsi(raw, pref) {
  const cands = candidates(raw, pref);
  const { pref: p, city } = municipality(cands[0]);
  for (let i = 0; i < cands.length; i++) {
    const q = cands[i];
    const json = await fetchJSON('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q));
    await sleep(DELAY_MS);
    const hit = (json || []).find((f) => {
      const t = (f.properties?.title ?? '').normalize('NFKC');
      return t.startsWith(p) && (!city || t.includes(city));
    });
    if (hit) {
      const [lng, lat] = hit.geometry.coordinates;
      const title = hit.properties.title;
      const hasNum = /\d/.test(title.normalize('NFKC'));
      return { lat, lng, query: q, title, approx: i > 0 || !hasNum };
    }
  }
  return null;
}

async function google(raw, pref) {
  const key = process.env.GOOGLE_GEOCODING_KEY;
  if (!key) throw new Error('GOOGLE_GEOCODING_KEY が未設定です');
  const q = normalizeAddress(raw, pref);
  const json = await fetchJSON(
    `https://maps.googleapis.com/maps/api/geocode/json?language=ja&region=jp&address=${encodeURIComponent(q)}&key=${key}`,
  );
  await sleep(DELAY_MS);
  const r = json.results?.[0];
  if (!r) return null;
  const { lat, lng } = r.geometry.location;
  return {
    lat, lng, query: q, title: r.formatted_address,
    approx: !['ROOFTOP', 'RANGE_INTERPOLATED'].includes(r.geometry.location_type),
  };
}

// 都道府県庁所在地付近の座標（明らかな誤変換の検出用）
const PREF_CENTER = {
  北海道: [43.06, 141.35, 450], 青森県: [40.82, 140.74, 130], 岩手県: [39.70, 141.15, 150], 宮城県: [38.27, 140.87, 110],
  秋田県: [39.72, 140.10, 130], 山形県: [38.24, 140.36, 120], 福島県: [37.75, 140.47, 150], 茨城県: [36.34, 140.45, 110],
  栃木県: [36.57, 139.88, 90], 群馬県: [36.39, 139.06, 100], 埼玉県: [35.86, 139.65, 90], 千葉県: [35.61, 140.12, 110],
  東京都: [35.69, 139.69, 90], 神奈川県: [35.45, 139.64, 80], 新潟県: [37.90, 139.02, 200], 富山県: [36.70, 137.21, 80],
  石川県: [36.59, 136.63, 150], 福井県: [36.07, 136.22, 110], 山梨県: [35.66, 138.57, 80], 長野県: [36.65, 138.18, 160],
  岐阜県: [35.39, 136.72, 150], 静岡県: [34.98, 138.38, 150], 愛知県: [35.18, 136.91, 100], 三重県: [34.73, 136.51, 150],
  滋賀県: [35.00, 135.87, 90], 京都府: [35.02, 135.76, 130], 大阪府: [34.69, 135.52, 70], 兵庫県: [34.69, 135.18, 150],
  奈良県: [34.69, 135.83, 110], 和歌山県: [34.23, 135.17, 150], 鳥取県: [35.50, 134.24, 120], 島根県: [35.47, 133.05, 200],
  岡山県: [34.66, 133.93, 100], 広島県: [34.40, 132.46, 130], 山口県: [34.19, 131.47, 130], 徳島県: [34.07, 134.56, 100],
  香川県: [34.34, 134.04, 70], 愛媛県: [33.84, 132.77, 150], 高知県: [33.56, 133.53, 170], 福岡県: [33.61, 130.42, 110],
  佐賀県: [33.25, 130.30, 80], 長崎県: [32.74, 129.87, 200], 熊本県: [32.79, 130.74, 130], 大分県: [33.24, 131.61, 120],
  宮崎県: [31.91, 131.42, 160], 鹿児島県: [31.56, 130.56, 300], 沖縄県: [26.21, 127.68, 450],
};
export function km(a, b, c, d) {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function plausible(pref, lat, lng) {
  const c = PREF_CENTER[pref];
  return !c || km(c[0], c[1], lat, lng) <= c[2];
}

// ---------------------------------------------------------------- main
async function main() {
  const stores = parseCSV(fs.readFileSync(F.csv, 'utf8'));
  const overrides = fs.existsSync(F.overrides) ? parseCSV(fs.readFileSync(F.overrides, 'utf8')) : [];
  const ovByName = new Map(overrides.filter((o) => o.name).map((o) => [o.name.normalize('NFKC'), o]));
  const cache = fs.existsSync(F.cache) ? JSON.parse(fs.readFileSync(F.cache, 'utf8')) : {};
  const geocode = provider === 'google' ? google : gsi;

  const out = [], failed = [], approx = [], suspicious = [];
  let queried = 0;
  for (const [i, s] of stores.entries()) {
    const ov = ovByName.get(s.name.normalize('NFKC'));
    let g = null;
    if (ov?.lat && ov?.lng) {
      g = { lat: Number(ov.lat), lng: Number(ov.lng), approx: false, title: '(手動指定)' };
    } else {
      const addr = ov?.address || s.address;
      const key = `${provider}|${s.pref}|${addr}`;
      if (key in cache) g = cache[key];
      else {
        try { g = await geocode(addr, s.pref); } catch (e) { console.error(`! ${s.name}: ${e.message}`); g = undefined; }
        if (g !== undefined) cache[key] = g; // 失敗(null)もキャッシュ。例外時は次回再試行
        queried++;
        if (queried % 50 === 0) {
          fs.writeFileSync(F.cache, JSON.stringify(cache, null, 0));
          console.log(`  ${i + 1}/${stores.length} 件処理…`);
        }
      }
    }
    if (!g) { failed.push(s); continue; }
    if (!plausible(s.pref, g.lat, g.lng)) { suspicious.push({ ...s, ...g }); continue; }
    if (g.approx) approx.push({ ...s, ...g });
    out.push({
      id: s.id, n: s.name, p: s.pref, a: s.address.normalize('NFKC').replace(/\s+/g, ' ').trim(), t: s.tel,
      lat: Math.round(g.lat * 1e6) / 1e6, lng: Math.round(g.lng * 1e6) / 1e6,
      ...(g.approx ? { x: 1 } : {}),
    });
  }

  fs.writeFileSync(F.cache, JSON.stringify(cache, null, 0));
  fs.writeFileSync(
    F.out,
    JSON.stringify({ updated: new Date().toISOString(), source: '2026-10-02', count: out.length, stores: out }),
  );

  const line = (s) => `| ${s.name} | ${s.address} | ${s.title ?? ''} |`;
  const report = [
    `# ジオコーディング結果`,
    ``,
    `- 店舗数: ${stores.length} / 地図に掲載: ${out.length} / 今回の問い合わせ: ${queried}`,
    `- 位置が概算（町名レベル）: ${approx.length}`,
    `- 位置不明で除外: ${failed.length + suspicious.length}`,
    ``,
    `位置を直したい店舗は \`data/overrides.csv\` に店舗名と緯度経度（または正しい住所）を追記してください。`,
    ``,
    `## 位置不明（地図に表示されません）`,
    `| 店舗名 | 住所 | 変換結果 |`, `|---|---|---|`,
    ...failed.map(line),
    ...suspicious.map((s) => line({ ...s, title: `${s.title}（都道府県外のため除外）` })),
    ``,
    `## 概算位置（町名レベル）`,
    `| 店舗名 | 住所 | 変換結果 |`, `|---|---|---|`,
    ...approx.map(line),
    ``,
  ].join('\n');
  fs.writeFileSync(F.report, report);
  console.log(`完了: 掲載 ${out.length}件 / 概算 ${approx.length}件 / 除外 ${failed.length + suspicious.length}件`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
