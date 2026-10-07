// ===== アプリ設定 =====
// Google Maps の API キーを設定してください（README の手順参照）。
// 空欄のままでも OpenStreetMap で動作します。
// ※ キーは公開ページから誰でも見えるため、必ず「HTTPリファラー制限」をかけてください。
window.APP_CONFIG = {
  GOOGLE_MAPS_API_KEY: '',

  // Google Cloud コンソールで作成した Map ID（無料）。未作成なら 'DEMO_MAP_ID' のままで可
  GOOGLE_MAP_ID: 'DEMO_MAP_ID',

  // 「近くの店舗」リストに出す件数
  NEAREST_COUNT: 30,
};
