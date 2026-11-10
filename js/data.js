'use strict';
/* ============================================================
   五十音クエスト — データファイル
   問題・カード・ランク・五十音表のデータをここで定義します。
   ============================================================ */

/* ---------- 仮名変換ユーティリティ ---------- */
// 片仮名（U+30A1〜U+30F6）→ 平仮名（U+3041〜U+3096）
function toHiragana(str) {
  return String(str).replace(/[\u30A1-\u30F6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}
// 平仮名 → 片仮名
function toKatakana(str) {
  return String(str).replace(/[\u3041-\u3096]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60)
  );
}
// 指定した書き方での表示用文字列を返す（'hiragana' | 'katakana'）
function inScript(str, script) {
  return script === 'hiragana' ? toHiragana(str) : str;
}

/* ---------- 並べ替えの対象にしない固定文字 ---------- */
const FIXED_CHARS = new Set(['・', '＆']);

/* ---------- 出題データ ----------
   id      : 一意のID
   anime   : 'jojo' | 'jjk'
   type    : 'char'（キャラクター）| 'waza'（わざ・スタンド・術式）| 'term'（ことば）
   label   : 答え合わせ画面に表示する公式表記（漢字など）
   kana    : 出題に使うかな（片仮名で格納。平仮名モードでは自動変換）
   en      : ローマ字・英語表記（ヒント）
   desc    : 出題中に表示するヒント文（答えの順番は分からない）
   level   : 1=やさしい(4文字以下) / 2=ふつう(5〜7文字) / 3=むずかしい(8文字以上)
------------------------------------------------------------ */
const QUESTIONS = [
  /* ===== JOJO レベル1 ===== */
  { id: 'q01', anime: 'jojo', type: 'char', label: 'ジョジョ',           kana: 'ジョジョ',     en: 'JoJo',    desc: '『ジョジョの奇妙な冒険』のあいしょう。', level: 1 },
  { id: 'q02', anime: 'jojo', type: 'char', label: 'ディオ',             kana: 'ディオ',       en: 'DIO',     desc: 'ザ・ワールドの使い手。',               level: 1 },
  { id: 'q03', anime: 'jojo', type: 'char', label: 'ワムウ',             kana: 'ワムウ',       en: 'Wamuu',   desc: '柱の男の一人。',                       level: 1 },
  { id: 'q04', anime: 'jojo', type: 'char', label: 'カーズ',             kana: 'カーズ',       en: 'Kars',    desc: '柱の男の首りょう。',                   level: 1 },
  { id: 'q05', anime: 'jojo', type: 'char', label: 'ミスタ',             kana: 'ミスタ',       en: 'Mista',   desc: 'ブチャラティチームのメンバー。',       level: 1 },
  { id: 'q06', anime: 'jojo', type: 'char', label: 'フーゴ',             kana: 'フーゴ',       en: 'Fugo',    desc: 'ブチャラティチームのメンバー。',       level: 1 },
  { id: 'q07', anime: 'jojo', type: 'char', label: 'ジョルノ',           kana: 'ジョルノ',     en: 'Giorno',  desc: 'ジョースター家の血をもつ少年。',       level: 1 },
  { id: 'q08', anime: 'jojo', type: 'term', label: '波紋',               kana: 'ハモン',       en: 'Hamon',   desc: '呼吸と意志の力。',                     level: 1 },
  { id: 'q09', anime: 'jojo', type: 'term', label: 'スタンド',           kana: 'スタンド',     en: 'Stand',   desc: '心の力であらわれる能力。',             level: 1 },
  { id: 'q10', anime: 'jojo', type: 'waza', label: 'オラオラ',           kana: 'オラオラ',     en: 'Ora Ora', desc: 'スタープラチナの猛攻のかけ声。',       level: 1 },
  { id: 'q11', anime: 'jojo', type: 'waza', label: '無駄無駄',           kana: 'ムダムダ',     en: 'Muda Muda', desc: 'ザ・ワールドの連打のかけ声。',       level: 1 },

  /* ===== JOJO レベル2 ===== */
  { id: 'q12', anime: 'jojo', type: 'waza', label: 'ザ・ワールド',       kana: 'ザ・ワールド', en: 'The World', desc: 'DIOのスタンド。「時」を止める。',     level: 2 },
  { id: 'q13', anime: 'jojo', type: 'waza', label: 'スタープラチナ',     kana: 'スタープラチナ', en: 'Star Platinum', desc: '空条承太郎のスタンド。',         level: 2 },
  { id: 'q14', anime: 'jojo', type: 'waza', label: 'キラークイーン',     kana: 'キラークイーン', en: 'Killer Queen', desc: '吉良吉影のスタンド。',             level: 2 },
  { id: 'q15', anime: 'jojo', type: 'char', label: '岸辺露伴',           kana: 'キシベロハン', en: 'Kishibe Rohan', desc: 'すご腕の漫画家。ヘブンズ・ドアーの使い手。', level: 2 },
  { id: 'q16', anime: 'jojo', type: 'char', label: 'ブチャラティ',       kana: 'ブチャラティ', en: 'Bucciarati', desc: 'ブチャラティチームのリーダー。',     level: 2 },
  { id: 'q17', anime: 'jojo', type: 'char', label: 'ナランチャ',         kana: 'ナランチャ',   en: 'Narancia', desc: 'エアロスミスの使い手。',              level: 2 },
  { id: 'q18', anime: 'jojo', type: 'char', label: 'トリッシュ',         kana: 'トリッシュ',   en: 'Trish',   desc: 'スパイス・ガールの使い手。',           level: 2 },
  { id: 'q19', anime: 'jojo', type: 'term', label: '幽波紋',             kana: 'スタンド',     en: 'Stand',   desc: '生命エネルギーが生み出す像。',         level: 1 },
  { id: 'q20', anime: 'jojo', type: 'char', label: 'スピードワゴン',     kana: 'スピードワゴン', en: 'Speedwagon', desc: '波紋の戦士を支える男。',           level: 2 },
  { id: 'q21', anime: 'jojo', type: 'waza', label: 'ストーン・フリー',   kana: 'ストーン・フリー', en: 'Stone Free', desc: '空条徐倫のスタンド。',              level: 2 },

  /* ===== JOJO レベル3 ===== */
  { id: 'q22', anime: 'jojo', type: 'char', label: 'ジョナサン・ジョースター', kana: 'ジョナサン・ジョースター', en: 'Jonathan Joestar', desc: 'ジョースター家の始祖。',   level: 3 },
  { id: 'q23', anime: 'jojo', type: 'char', label: 'ジョセフ・ジョースター',   kana: 'ジョセフ・ジョースター',   en: 'Joseph Joestar', desc: '波紋の使い手。ジョナサンの孫。', level: 3 },
  { id: 'q24', anime: 'jojo', type: 'char', label: '空条承太郎',         kana: 'クウジョウジョウタロウ', en: 'Kujo Jotaro', desc: 'スタープラチナの使い手。',        level: 3 },
  { id: 'q25', anime: 'jojo', type: 'char', label: '花京院典明',         kana: 'カキョウインノリアキ', en: 'Kakyoin Noriaki', desc: 'ハイエロファントグリーンの使い手。', level: 3 },
  { id: 'q26', anime: 'jojo', type: 'char', label: '吉良吉影',           kana: 'キラヨシカゲ', en: 'Kira Yoshikage', desc: 'キラークイーンの使い手。',        level: 3 },
  { id: 'q27', anime: 'jojo', type: 'char', label: '東方仗助',           kana: 'ヒガシカタジョウスケ', en: 'Higashikata Josuke', desc: 'クレイジー・ダイヤモンドの使い手。', level: 3 },
  { id: 'q28', anime: 'jojo', type: 'char', label: '空条徐倫',           kana: 'クウジョウジョリーン', en: 'Kujo Jolyne', desc: 'ストーン・フリーの使い手。',      level: 3 },
  { id: 'q29', anime: 'jojo', type: 'waza', label: 'クレイジー・ダイヤモンド', kana: 'クレイジー・ダイヤモンド', en: 'Crazy Diamond', desc: '東方仗助のスタンド。',    level: 3 },
  { id: 'q30', anime: 'jojo', type: 'waza', label: 'ゴールド・エクスペリエンス', kana: 'ゴールド・エクスペリエンス', en: 'Gold Experience', desc: 'ジョルノのスタンド。', level: 3 },
  { id: 'q31', anime: 'jojo', type: 'waza', label: 'キング・クリムゾン', kana: 'キング・クリムゾン', en: 'King Crimson', desc: 'ディアボロのスタンド。時を消す。', level: 3 },
  { id: 'q32', anime: 'jojo', type: 'waza', label: 'ホワイトスネイク',   kana: 'ホワイトスネイク', en: 'White Snake', desc: 'プッチ神父のスタンド。記憶を盗む。', level: 3 },
  { id: 'q33', anime: 'jojo', type: 'waza', label: 'メイド・イン・ヘブン', kana: 'メイド・イン・ヘブン', en: 'Made in Heaven', desc: 'プッチ神父のスタンド。時を加速させる。', level: 3 },
  { id: 'q34', anime: 'jojo', type: 'waza', label: 'ザ・ワールド・オーバーヘブン', kana: 'ザ・ワールド・オーバーヘブン', en: 'The World Over Heaven', desc: 'DIOの最終スタンド。', level: 3 },

  /* ===== JOJO 主要キャラ（第2部〜第9部） ===== */
  { id: 'q60', anime: 'jojo', type: 'char', label: 'シーザー・ツェペリ', kana: 'シーザー・ツェペリ', en: 'Caesar Zeppeli', desc: '波紋の師範代。ジョセフの友。', level: 3 },
  { id: 'q61', anime: 'jojo', type: 'char', label: 'リサリサ', kana: 'リサリサ', en: 'Lisa Lisa', desc: '波紋の師範。', level: 1 },
  { id: 'q62', anime: 'jojo', type: 'char', label: 'エシディシ', kana: 'エシディシ', en: 'Esidisi', desc: '柱の男の一人。', level: 2 },
  { id: 'q63', anime: 'jojo', type: 'char', label: 'アヴドゥル', kana: 'アヴドゥル', en: 'Avdol', desc: 'マジシャンズレッドの使い手。', level: 2 },
  { id: 'q64', anime: 'jojo', type: 'char', label: 'ポルナレフ', kana: 'ポルナレフ', en: 'Polnareff', desc: 'シルバーチャリオッツの使い手。', level: 2 },
  { id: 'q65', anime: 'jojo', type: 'char', label: 'イギー', kana: 'イギー', en: 'Iggy', desc: 'ザ・フールの使い手。', level: 1 },
  { id: 'q66', anime: 'jojo', type: 'char', label: '広瀬康一', kana: 'ヒロセコウイチ', en: 'Hirose Koichi', desc: 'エコーズの使い手。', level: 2 },
  { id: 'q67', anime: 'jojo', type: 'char', label: '虹村億泰', kana: 'ニジムラオクヤス', en: 'Nijimura Okuyasu', desc: 'ザ・ハンドの使い手。', level: 3 },
  { id: 'q68', anime: 'jojo', type: 'char', label: 'アバッキオ', kana: 'アバッキオ', en: 'Abbacchio', desc: 'ムーディー・ブルースの使い手。', level: 2 },
  { id: 'q69', anime: 'jojo', type: 'char', label: 'ディアボロ', kana: 'ディアボロ', en: 'Diavolo', desc: 'キング・クリムゾンの使い手。', level: 2 },
  { id: 'q70', anime: 'jojo', type: 'char', label: 'エンリコ・プッチ', kana: 'エンリコ・プッチ', en: 'Enrico Pucci', desc: 'ホワイトスネイクの使い手。', level: 2 },
  { id: 'q71', anime: 'jojo', type: 'char', label: 'エルメェス', kana: 'エルメェス', en: 'Ermes', desc: 'キスの使い手。', level: 2 },
  { id: 'q72', anime: 'jojo', type: 'char', label: 'ウェザー・リポート', kana: 'ウェザー・リポート', en: 'Weather Report', desc: '空条徐倫の仲間。スタンド名も同じ。', level: 3 },
  { id: 'q73', anime: 'jojo', type: 'char', label: 'アナスイ', kana: 'アナスイ', en: 'Anasui', desc: 'ダイバー・ダウンの使い手。', level: 1 },
  { id: 'q74', anime: 'jojo', type: 'char', label: 'エンポリオ', kana: 'エンポリオ', en: 'Emporio', desc: 'バーニング・ダウン・ザ・ハウスの使い手。', level: 2 },
  { id: 'q75', anime: 'jojo', type: 'char', label: 'フー・ファイターズ', kana: 'フー・ファイターズ', en: 'Foo Fighters', desc: 'プランクトンのスタンド使い。', level: 3 },
  { id: 'q76', anime: 'jojo', type: 'char', label: 'ジョニィ・ジョースター', kana: 'ジョニィ・ジョースター', en: 'Johnny Joestar', desc: 'タスクの使い手。', level: 3 },
  { id: 'q77', anime: 'jojo', type: 'char', label: 'ジャイロ・ツェペリ', kana: 'ジャイロ・ツェペリ', en: 'Gyro Zeppeli', desc: 'ボール・ブレイカーの使い手。', level: 3 },
  { id: 'q78', anime: 'jojo', type: 'char', label: 'ディエゴ・ブランドー', kana: 'ディエゴ・ブランドー', en: 'Diego Brando', desc: 'スケアリー・モンスターズの使い手。', level: 3 },
  { id: 'q79', anime: 'jojo', type: 'char', label: 'ファニー・ヴァレンタイン', kana: 'ファニー・ヴァレンタイン', en: 'Funny Valentine', desc: 'ダーティー・ディード・ダン・ダート・チープの使い手。', level: 3 },
  { id: 'q80', anime: 'jojo', type: 'char', label: '広瀬康穂', kana: 'ヒロセヤスホ', en: 'Hirose Yasuho', desc: 'ペイズリー・パークの使い手。', level: 2 },
  { id: 'q81', anime: 'jojo', type: 'char', label: '透龍', kana: 'トオル', en: 'Tooru', desc: 'ワンダー・オブ・Uの使い手。', level: 1 },
  { id: 'q82', anime: 'jojo', type: 'char', label: 'ジョディーオ・ジョースター', kana: 'ジョディーオ・ジョースター', en: 'Jodio Joestar', desc: 'ノヴェムバー・レインの使い手。', level: 3 },
  { id: 'q83', anime: 'jojo', type: 'char', label: 'ドラゴナ・ジョースター', kana: 'ドラゴナ・ジョースター', en: 'Dragona Joestar', desc: 'スムース・オペレーターズの使い手。', level: 3 },

  /* ===== JOJO 主要スタンド ===== */
  { id: 'q84', anime: 'jojo', type: 'waza', label: 'マジシャンズレッド', kana: 'マジシャンズレッド', en: "Magician's Red", desc: 'アヴドゥルのスタンド。', level: 3 },
  { id: 'q85', anime: 'jojo', type: 'waza', label: 'ハイエロファントグリーン', kana: 'ハイエロファントグリーン', en: 'Hierophant Green', desc: '花京院典明のスタンド。', level: 3 },
  { id: 'q86', anime: 'jojo', type: 'waza', label: 'シルバーチャリオッツ', kana: 'シルバーチャリオッツ', en: 'Silver Chariot', desc: 'ポルナレフのスタンド。', level: 3 },
  { id: 'q87', anime: 'jojo', type: 'waza', label: 'ハーミットパープル', kana: 'ハーミットパープル', en: 'Hermit Purple', desc: 'ジョセフ・ジョースターのスタンド。', level: 3 },
  { id: 'q88', anime: 'jojo', type: 'waza', label: 'ザ・フール', kana: 'ザ・フール', en: 'The Fool', desc: 'イギーのスタンド。', level: 1 },
  { id: 'q89', anime: 'jojo', type: 'waza', label: 'エコーズ', kana: 'エコーズ', en: 'Echoes', desc: '広瀬康一のスタンド。', level: 1 },
  { id: 'q90', anime: 'jojo', type: 'waza', label: 'ザ・ハンド', kana: 'ザ・ハンド', en: 'The Hand', desc: '虹村億泰のスタンド。', level: 1 },
  { id: 'q91', anime: 'jojo', type: 'waza', label: 'ヘブンズ・ドアー', kana: 'ヘブンズ・ドアー', en: "Heaven's Door", desc: '岸辺露伴のスタンド。', level: 2 },
  { id: 'q92', anime: 'jojo', type: 'waza', label: 'スティッキィ・フィンガーズ', kana: 'スティッキィ・フィンガーズ', en: 'Sticky Fingers', desc: 'ブチャラティのスタンド。', level: 3 },
  { id: 'q93', anime: 'jojo', type: 'waza', label: 'ムーディー・ブルース', kana: 'ムーディー・ブルース', en: 'Moody Blues', desc: 'アバッキオのスタンド。', level: 3 },
  { id: 'q94', anime: 'jojo', type: 'waza', label: 'セックス・ピストルズ', kana: 'セックス・ピストルズ', en: 'Sex Pistols', desc: 'ミスタのスタンド。', level: 3 },
  { id: 'q95', anime: 'jojo', type: 'waza', label: 'エアロスミス', kana: 'エアロスミス', en: 'Aerosmith', desc: 'ナランチャのスタンド。', level: 2 },
  { id: 'q96', anime: 'jojo', type: 'waza', label: 'パープル・ヘイズ', kana: 'パープル・ヘイズ', en: 'Purple Haze', desc: 'フーゴのスタンド。', level: 2 },
  { id: 'q97', anime: 'jojo', type: 'waza', label: 'スパイス・ガール', kana: 'スパイス・ガール', en: 'Spice Girl', desc: 'トリッシュのスタンド。', level: 2 },
  { id: 'q98', anime: 'jojo', type: 'waza', label: 'ゴールド・エクスペリエンス・レクイエム', kana: 'ゴールド・エクスペリエンス・レクイエム', en: 'Gold Experience Requiem', desc: 'ジョルノの最終スタンド。', level: 3 },
  { id: 'q99', anime: 'jojo', type: 'waza', label: 'キス', kana: 'キス', en: 'Kiss', desc: 'エルメェスのスタンド。', level: 1 },
  { id: 'q100', anime: 'jojo', type: 'waza', label: 'ダイバー・ダウン', kana: 'ダイバー・ダウン', en: 'Diver Down', desc: 'アナスイのスタンド。', level: 2 },
  { id: 'q101', anime: 'jojo', type: 'waza', label: 'C-MOON', kana: 'シー・ムーン', en: 'C-Moon', desc: 'プッチ神父のスタンド。', level: 2 },
  { id: 'q102', anime: 'jojo', type: 'waza', label: 'バーニング・ダウン・ザ・ハウス', kana: 'バーニング・ダウン・ザ・ハウス', en: 'Burning Down the House', desc: 'エンポリオのスタンド。', level: 3 },
  { id: 'q103', anime: 'jojo', type: 'waza', label: 'タスク', kana: 'タスク', en: 'Tusk', desc: 'ジョニィのスタンド。', level: 1 },
  { id: 'q104', anime: 'jojo', type: 'waza', label: 'ボール・ブレイカー', kana: 'ボール・ブレイカー', en: 'Ball Breaker', desc: 'ジャイロのスタンド。', level: 3 },
  { id: 'q105', anime: 'jojo', type: 'waza', label: 'スケアリー・モンスターズ', kana: 'スケアリー・モンスターズ', en: 'Scary Monsters', desc: 'ディエゴのスタンド。', level: 3 },
  { id: 'q106', anime: 'jojo', type: 'waza', label: 'ダーティー・ディード・ダン・ダート・チープ', kana: 'ダーティー・ディード・ダン・ダート・チープ', en: 'Dirty Deeds Done Dirt Cheap', desc: 'ファニー・ヴァレンタインのスタンド。', level: 3 },
  { id: 'q107', anime: 'jojo', type: 'waza', label: 'ソフト＆ウェット', kana: 'ソフト＆ウェット', en: 'Soft & Wet', desc: '東方定助のスタンド。', level: 2 },
  { id: 'q108', anime: 'jojo', type: 'waza', label: 'ペイズリー・パーク', kana: 'ペイズリー・パーク', en: 'Paisley Park', desc: '広瀬康穂のスタンド。', level: 3 },
  { id: 'q109', anime: 'jojo', type: 'waza', label: 'ワンダー・オブ・U', kana: 'ワンダー・オブ・ユー', en: 'Wonder of U', desc: '透龍のスタンド。', level: 3 },
  { id: 'q110', anime: 'jojo', type: 'waza', label: 'ノヴェムバー・レイン', kana: 'ノヴェムバー・レイン', en: 'November Rain', desc: 'ジョディーオのスタンド。', level: 3 },
  { id: 'q111', anime: 'jojo', type: 'waza', label: 'スムース・オペレーターズ', kana: 'スムース・オペレーターズ', en: 'Smooth Operators', desc: 'ドラゴナのスタンド。', level: 3 },

  /* ===== 呪術廻戦 レベル1 ===== */
  { id: 'q35', anime: 'jjk', type: 'char', label: '夏油傑',              kana: 'ゲトウ',       en: 'Geto',    desc: '呪術高専を去った術師。',               level: 1 },
  { id: 'q36', anime: 'jjk', type: 'char', label: '冥冥',                kana: 'メイメイ',     en: 'Mei Mei', desc: '呪術高専の教師。',                     level: 1 },
  { id: 'q37', anime: 'jjk', type: 'waza', label: '黒閃',                kana: 'コクセン',     en: 'Kokusen', desc: '黒い電光をまとう一撃。',               level: 1 },
  { id: 'q38', anime: 'jjk', type: 'term', label: '無限',                kana: 'ムゲン',       en: 'Mugen',   desc: '五条悟の術式。',                       level: 1 },
  { id: 'q39', anime: 'jjk', type: 'term', label: '六眼',                kana: 'リクガン',     en: 'Rikugan', desc: '五条悟の特別な目。',                   level: 1 },
  { id: 'q40', anime: 'jjk', type: 'term', label: '呪霊',                kana: 'ジュレイ',     en: 'Jurei',   desc: '呪いから生まれる怪物。',               level: 1 },

  /* ===== 呪術廻戦 レベル2 ===== */
  { id: 'q41', anime: 'jjk', type: 'char', label: '虎杖悠仁',            kana: 'イタドリユウジ', en: 'Itadori Yuji', desc: '呪術高専の一年生。',                level: 2 },
  { id: 'q42', anime: 'jjk', type: 'char', label: '伏黒恵',              kana: 'フシグロメグミ', en: 'Fushiguro Megumi', desc: '十種影法術の使い手。',             level: 2 },
  { id: 'q43', anime: 'jjk', type: 'char', label: '五条悟',              kana: 'ゴジョウサトル', en: 'Gojo Satoru', desc: '最強の呪術師。',                     level: 2 },
  { id: 'q44', anime: 'jjk', type: 'char', label: '禅院真希',            kana: 'ゼンインマキ', en: 'Zenin Maki', desc: '禅院家の術師。',                      level: 2 },
  { id: 'q45', anime: 'jjk', type: 'char', label: '乙骨憂太',            kana: 'オッコツユウタ', en: 'Okkotsu Yuta', desc: '特級呪術師。',                      level: 2 },
  { id: 'q46', anime: 'jjk', type: 'char', label: '狗巻棘',              kana: 'イヌマキトゲ', en: 'Inumaki Toge', desc: '言霊の使い手。',                      level: 2 },
  { id: 'q47', anime: 'jjk', type: 'char', label: '七海建人',            kana: 'ナナミケント', en: 'Nanami Kento', desc: 'サラリーマンの呪術師。',              level: 2 },
  { id: 'q48', anime: 'jjk', type: 'char', label: '東堂葵',              kana: 'トウドウアオイ', en: 'Todo Aoi', desc: '呪術高専の二年生。',                  level: 2 },
  { id: 'q49', anime: 'jjk', type: 'term', label: '呪力',                kana: 'ジュリョク',   en: 'Juryoku', desc: '呪いのエネルギー。',                   level: 2 },
  { id: 'q50', anime: 'jjk', type: 'term', label: '呪術',                kana: 'ジュジュツ',   en: 'Jujutsu', desc: '呪力を操る技術。',                     level: 2 },
  { id: 'q51', anime: 'jjk', type: 'waza', label: '伏魔御厨子',          kana: 'フクマミヅシ', en: 'Fukuma Mizushi', desc: '両面宿儺の領域。',                  level: 2 },

  /* ===== 呪術廻戦 レベル3 ===== */
  { id: 'q52', anime: 'jjk', type: 'char', label: '釘崎野薔薇',          kana: 'クギサキノバラ', en: 'Kugisaki Nobara', desc: '藁人形術の使い手。',               level: 3 },
  { id: 'q53', anime: 'jjk', type: 'char', label: '両面宿儺',            kana: 'リョウメンスクナ', en: 'Ryomen Sukuna', desc: '呪いの王。',                       level: 3 },
  { id: 'q54', anime: 'jjk', type: 'waza', label: '領域展開',            kana: 'リョウイキテンカイ', en: 'Ryouiki Tenkai', desc: '術式を極限まで広げる必殺の技。', level: 3 },
  { id: 'q55', anime: 'jjk', type: 'waza', label: '無量空処',            kana: 'ムリョウクウショ', en: 'Muryo Kusho', desc: '五条悟の領域。',                     level: 3 },
  { id: 'q56', anime: 'jjk', type: 'waza', label: '無下限呪術',          kana: 'ムカゲンジュジュツ', en: 'Mukagen Jujutsu', desc: '五条悟の術式の核心。',           level: 3 },
  { id: 'q57', anime: 'jjk', type: 'waza', label: '虚式「茈」',          kana: 'キョシキムラサキ', en: 'Kyoshiki Murasaki', desc: '五条悟の必殺技。',               level: 3 },
  { id: 'q58', anime: 'jjk', type: 'term', label: '反転術式',            kana: 'ハンテンジュツシキ', en: 'Hanten Jutsushiki', desc: '呪力を逆流させる術。',           level: 3 },
  { id: 'q59', anime: 'jjk', type: 'term', label: '呪術廻戦',            kana: 'ジュジュツカイセン', en: 'Jujutsu Kaisen', desc: 'このアニメのタイトル。',           level: 3 },
];

/* ---------- 問題ヒント文の繁體中文版 ---------- */
const DESC_ZH = {
  q01: '《JOJO的奇妙冒險》的暱稱。',
  q02: '「世界」的使者。',
  q03: '『柱之男』之一。',
  q04: '『柱之男』之首。',
  q05: '布加拉提小隊成員。',
  q06: '布加拉提小隊成員。',
  q07: '帶有喬斯達家血統的少年。',
  q08: '呼吸與意志之力。',
  q09: '由心之力顯現的能力。',
  q10: '白金之星的猛攻呼喊。',
  q11: '世界（ザ・ワールド）的連打呼喊。',
  q12: 'DIO 的替身。讓「時間」靜止。',
  q13: '空條承太郎的替身。',
  q14: '吉良吉影的替身。',
  q15: '身手了得的漫畫家。天堂之門的使者。',
  q16: '布加拉提小隊隊長。',
  q17: '史密斯飛船的使者。',
  q18: '香辣女孩的使者。',
  q19: '生命能量所產生的形象。',
  q20: '輔佐波紋戰士的男人。',
  q21: '空條徐倫的替身。',
  q22: '喬斯達家族的始祖。',
  q23: '波紋的使者。喬納森的孫子。',
  q24: '白金之星的使者。',
  q25: '「綠色法皇」的使者。',
  q26: '殺手皇后的使者。',
  q27: '瘋狂鑽石的使者。',
  q28: '石之海的使者。',
  q29: '東方仗助的替身。',
  q30: '喬魯諾的替身。',
  q31: '迪亞波羅的替身。吞噬時間。',
  q32: '普奇神父的替身。竊取記憶。',
  q33: '普奇神父的替身。加速時間。',
  q34: 'DIO 的最終替身。',
  q60: '波紋的助教。喬瑟夫的朋友。',
  q61: '波紋的師父。',
  q62: '『柱之男』之一。',
  q63: '魔術師之紅的使者。',
  q64: '銀色戰車的使者。',
  q65: '愚者的使者。',
  q66: '回音的使者。',
  q67: '殺手之手的使者。',
  q68: '憂鬱藍調的使者。',
  q69: '緋紅之王的使者。',
  q70: '白蛇的使者。',
  q71: '吻的使者。',
  q72: '空條徐倫的同伴。替身同名。',
  q73: '潛水者的使者。',
  q74: '燃燒的房子的使者。',
  q75: '浮游生物的替身使者。',
  q76: '牙的使者。',
  q77: '破球者的使者。',
  q78: '駭人怪物的使者。',
  q79: 'D4C 的使者。',
  q80: '佩斯利公園的使者。',
  q81: 'Wonder of U 的使者。',
  q82: '十一月雨的使者。',
  q83: '順滑操作者的使者。',
  q84: '阿布德爾的替身。',
  q85: '花京院典明的替身。',
  q86: '波魯那雷夫的替身。',
  q87: '喬瑟夫・喬斯達的替身。',
  q88: '伊奇的替身。',
  q89: '廣瀨康一的替身。',
  q90: '虹村億泰的替身。',
  q91: '岸邊露伴的替身。',
  q92: '布加拉提的替身。',
  q93: '阿帕基的替身。',
  q94: '米斯達的替身。',
  q95: '納蘭迦的替身。',
  q96: '福葛的替身。',
  q97: '特莉休的替身。',
  q98: '喬魯諾的最終替身。',
  q99: '艾梅斯的替身。',
  q100: '安納蘇的替身。',
  q101: '普奇神父的替身。',
  q102: '安波里歐的替身。',
  q103: '喬尼的替身。',
  q104: '傑洛的替身。',
  q105: '迪亞哥的替身。',
  q106: '法尼・瓦倫泰的替身。',
  q107: '東方定助的替身。',
  q108: '廣瀨康穗的替身。',
  q109: '透龍的替身。',
  q110: '喬迪歐的替身。',
  q111: '德拉戈娜的替身。',
  q35: '離開咒術高專的術師。',
  q36: '咒術高專的教師。',
  q37: '纏繞著黑電的一擊。',
  q38: '五條悟的術式。',
  q39: '五條悟的特殊眼眸。',
  q40: '從詛咒中誕生的怪物。',
  q41: '咒術高專一年級生。',
  q42: '十種影法術的使者。',
  q43: '最強的咒術師。',
  q44: '禪院家的術師。',
  q45: '特級咒術師。',
  q46: '言靈的使者。',
  q47: '上班族咒術師。',
  q48: '咒術高專二年級生。',
  q49: '詛咒的能量。',
  q50: '操縱詛咒之力的技術。',
  q51: '兩面宿儺的領域。',
  q52: '草人術的使者。',
  q53: '詛咒之王。',
  q54: '將術式擴展至極限的必殺技。',
  q55: '五條悟的領域。',
  q56: '五條悟術式的核心。',
  q57: '五條悟的必殺技。',
  q58: '使詛咒之力逆流的術。',
  q59: '這部動畫的標題。',
};

// 問題ヒント文を現在のロケールで返す
function questionDesc(q) {
  return I18N.get() === 'zh' && DESC_ZH[q.id] ? DESC_ZH[q.id] : q.desc;
}

/* ---------- クイズ設定値 ---------- */
const ANIME_INFO = {
  jojo: { name: 'ジョジョの奇妙な冒険', nameZh: 'JOJO的奇妙冒險', short: 'JOJO', shortZh: 'JOJO', cls: 'tag-jojo' },
  jjk:  { name: '呪術廻戦',             nameZh: '咒術迴戰',     short: '呪術廻戦', shortZh: '咒術迴戰', cls: 'tag-jjk'  },
};
const TYPE_INFO = {
  char: 'キャラクター',
  waza: 'わざ・スタンド',
  term: 'ことば',
};
const TYPE_INFO_ZH = {
  char: '角色',
  waza: '招式・替身',
  term: '詞彙',
};
function typeLabel(type) {
  return I18N.get() === 'zh' ? (TYPE_INFO_ZH[type] || TYPE_INFO[type] || type) : (TYPE_INFO[type] || type);
}
const LEVEL_INFO = {
  1: { name: 'レベル1', label: 'やさしい',   baseXP: 10, timeScore: 100 },
  2: { name: 'レベル2', label: 'ふつう',     baseXP: 20, timeScore: 150 },
  3: { name: 'レベル3', label: 'むずかしい', baseXP: 30, timeScore: 220 },
};

/* ---------- プレイヤーランク ---------- */
const RANKS = [
  { xp: 0,    name: '五十音みならい',   nameZh: '五十音見習' },
  { xp: 100,  name: 'かなのたまご',     nameZh: '假名寶寶' },
  { xp: 250,  name: 'かなのつかいかた', nameZh: '假名行家' },
  { xp: 450,  name: 'かなマスター',     nameZh: '假名大師' },
  { xp: 700,  name: '五十音の達人',     nameZh: '五十音達人' },
  { xp: 1000, name: '伝説の日本語つかい', nameZh: '傳說的日語使者' },
];
function rankForXP(xp) {
  let current = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xp) { current = RANKS[i]; next = RANKS[i + 1] || null; }
  }
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  return { current, next, progress: Math.min(1, Math.max(0, progress)), index: RANKS.indexOf(current) };
}

/* ---------- 経済・ミッション・ガチャ ---------- */
const LEVEL_COINS = { 1: 8, 2: 12, 3: 18 };  // 正解1問あたりのコイン
const GOLDEN_COIN_MULT = 2;                  // キラキラ問題はコイン2倍
const GOLDEN_XP_MULT = 1.5;                  // キラキラ問題はXP1.5倍
const GOLDEN_RATE = 0.12;                    // キラキラ問題の出現率
const GACHA_COST = 120;
const PERFECT_BONUS_COINS = 30;              // ミスなしセッションのボーナス
const RANKUP_COINS = 25;                     // ランクアップ報酬コイン
const RANKUP_STARS = 1;                      // ランクアップ報酬の星

// ミッション一覧（全部で12個）
// type: correct_total / best_streak / correct_level / correct_anime / daily_streak / stars_total / ta_best / cards_unlocked
const MISSIONS = [
  { id: 'm01', icon: 'flag',  title: 'はじめの一歩',     titleZh: '初次嘗試',   desc: '1問正解する',               descZh: '答對 1 題',                   type: 'correct_total', need: 1,  rewardCoins: 20 },
  { id: 'm02', icon: 'check', title: 'かなの十問チャレンジ', titleZh: '假名十題挑戰', desc: '10問正解する',              descZh: '答對 10 題',                  type: 'correct_total', need: 10, rewardCoins: 40 },
  { id: 'm03', icon: 'sword', title: '三十の正解',       titleZh: '三十之成',   desc: '30問正解する',              descZh: '答對 30 題',                  type: 'correct_total', need: 30, rewardCoins: 80 },
  { id: 'm04', icon: 'crown', title: '五十の正解',       titleZh: '五十之成',   desc: '50問正解する',              descZh: '答對 50 題',                  type: 'correct_total', need: 50, rewardCoins: 130 },
  { id: 'm05', icon: 'flame', title: '炎のコンボ',       titleZh: '烈焰連擊',   desc: '5連続正解を達成する',       descZh: '達成 5 連勝',                 type: 'best_streak',   need: 5,  rewardCoins: 50 },
  { id: 'm06', icon: 'flame', title: '無双コンボ',       titleZh: '無雙連擊',   desc: '10連続正解を達成する',      descZh: '達成 10 連勝',                type: 'best_streak',   need: 10, rewardCoins: 110 },
  { id: 'm07', icon: 'star',  title: 'JOJO マスター',    titleZh: 'JOJO 大師',  desc: 'ジョジョの問題を10問正解',  descZh: 'JOJO 題目答對 10 題',          type: 'correct_anime', anime: 'jojo', need: 10, rewardCoins: 60 },
  { id: 'm08', icon: 'star',  title: '呪術廻戦 マスター', titleZh: '咒術迴戰 大師', desc: '呪術廻戦の問題を10問正解',  descZh: '咒術迴戰題目答對 10 題',        type: 'correct_anime', anime: 'jjk',  need: 10, rewardCoins: 60 },
  { id: 'm09', icon: 'bolt',  title: 'むずかしいに挑戦', titleZh: '挑戰困難！', desc: 'レベル3を5問正解する',      descZh: '答對 5 題 Lv.3',               type: 'correct_level', level: 3,      need: 5,  rewardCoins: 90 },
  { id: 'm10', icon: 'star',  title: '星あつめ',         titleZh: '集星家',     desc: '星を10個あつめる',          descZh: '收集 10 顆星',                type: 'stars_total',   need: 10, rewardCoins: 80 },
  { id: 'm11', icon: 'timer', title: 'スピードスター',   titleZh: '極限挑戰',   desc: 'タイムアタックで800点以上', descZh: '限時挑戰 800 分以上',           type: 'ta_best',       need: 800, rewardCoins: 80 },
  { id: 'm12', icon: 'cards', title: 'コレクター',       titleZh: '收藏家',     desc: 'カードを6枚あつめる',       descZh: '收集 6 張卡片',               type: 'cards_unlocked', need: 6,  rewardCoins: 150 },
];

// ミッションの進捗を計算（セーブデータから）
function missionProgress(data, mission) {
  const d = data || {};
  switch (mission.type) {
    case 'correct_total':  return d.correct || 0;
    case 'best_streak':    return d.bestStreak || 0;
    case 'correct_level':  return (d.correctByLevel && d.correctByLevel[mission.level]) || 0;
    case 'correct_anime':  return (d.correctByAnime && d.correctByAnime[mission.anime]) || 0;
    case 'daily_streak':   return d.dailyStreak || 0;
    case 'stars_total':    return d.stars || 0;
    case 'ta_best':        return d.timeAttackBest || 0;
    case 'cards_unlocked': return (d.unlocked && d.unlocked.length) || 0;
    default:               return 0;
  }
}
function missionClaimableCount(data) {
  const claimed = (data && data.missionsClaimed) || [];
  return MISSIONS.filter((m) => !claimed.includes(m.id) && missionProgress(data, m) >= m.need).length;
}

/* ---------- コレクションカード ---------- */
// need : 累計正解数で解放
const CARDS = [
  { id: 'c01', name: '五十音の冒険者',     nameZh: '五十音冒險者',   rarity: 'ノーマル', need: 1,   hue: 205, icon: 'compass', desc: 'はじめての正解をかち取った証。', descZh: '首次答對的見證。' },
  { id: 'c02', name: '波紋の修行生',       nameZh: '波紋修煉生',     rarity: 'ノーマル', need: 5,   hue: 18,  icon: 'ripple',  desc: '波紋の呼吸を体得しはじめた証。', descZh: '已開始掌握波紋呼吸的證明。' },
  { id: 'c03', name: '呪力の目覚め',       nameZh: '咒力覺醒',       rarity: 'ノーマル', need: 12,  hue: 262, icon: 'spark',   desc: '呪力に目覚めた見習い術師の証。', descZh: '覺醒咒力的見習術師的證明。' },
  { id: 'c04', name: 'スタンド使い',       nameZh: '替身使者',       rarity: 'レア',     need: 20,  hue: 45,  icon: 'bolt',    desc: '心の力を解き放つ者の証。',       descZh: '解放心之力之人的證明。' },
  { id: 'c05', name: '呪術師ジュニア',     nameZh: '實習咒術師',     rarity: 'レア',     need: 32,  hue: 150, icon: 'talisman',desc: '術式刻印を学ぶ若き呪術師の証。', descZh: '學習術式刻印的年輕咒術師的證明。' },
  { id: 'c06', name: 'オラオララッシュ',   nameZh: '歐拉歐拉連擊',   rarity: 'レア',     need: 45,  hue: 0,   icon: 'speed',   desc: '怒涛の連撃を極めた証。',         descZh: '極致怒濤連擊的證明。' },
  { id: 'c07', name: '領域展開マスター',   nameZh: '領域展開大師',   rarity: 'レア',     need: 60,  hue: 330, icon: 'mandala', desc: '無敵の領域を展開する者の証。',   descZh: '展開無敵領域之人的證明。' },
  { id: 'c08', name: 'ザ・ワールド',       nameZh: 'THE WORLD',      rarity: 'SSR',      need: 78,  hue: 265, icon: 'clock',   desc: '時を止める者の証。',             descZh: '讓時間靜止之人的證明。' },
  { id: 'c09', name: '無下限の極み',       nameZh: '無下限的極致',   rarity: 'SSR',      need: 95,  hue: 190, icon: 'infinity',desc: '五条悟の術式の核心に触れた証。', descZh: '觸及五條悟術式核心的證明。' },
  { id: 'c10', name: '黄金の旋風',         nameZh: '黃金旋風',       rarity: 'SSR',      need: 115, hue: 40,  icon: 'arrow',   desc: '引き裂く者の黄金の刃。',         descZh: '撕裂者的黃金之刃。' },
  { id: 'c11', name: '五十音の達人',       nameZh: '五十音達人',     rarity: 'SSR',      need: 140, hue: 100, icon: 'medal',   desc: 'ひらがなと片仮名を極めた達人の証。', descZh: '極致平假名與片假名之達人的證明。' },
  { id: 'c12', name: '伝説の日本語つかい', nameZh: '傳說的日語使者', rarity: 'SSR',      need: 170, hue: 55,  icon: 'crown',   desc: '五十音クエストの頂点に立つ者の証。', descZh: '站上五十音クエスト頂點之人的證明。' },
];
const RARITY_STYLE = {
  'ノーマル': { cls: 'rarity-normal', label: 'ノーマル' },
  'レア':     { cls: 'rarity-rare',   label: 'レア' },
  'SSR':      { cls: 'rarity-ssr',    label: 'SSR' },
};

/* ---------- 五十音表データ ---------- */
// 平仮名で格納し、片仮名タブでは toKatakana で変換して表示する
const CHART_SECTIONS = [
  {
    title: 'きほん（せいおん）',
    titleZh: '基本（清音）',
    rows: [
      { label: 'あ行', cells: [['あ','a'],['い','i'],['う','u'],['え','e'],['お','o']] },
      { label: 'か行', cells: [['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko']] },
      { label: 'さ行', cells: [['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so']] },
      { label: 'た行', cells: [['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to']] },
      { label: 'な行', cells: [['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no']] },
      { label: 'は行', cells: [['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho']] },
      { label: 'ま行', cells: [['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo']] },
      { label: 'や行', cells: [['や','ya'],null,['ゆ','yu'],null,['よ','yo']] },
      { label: 'ら行', cells: [['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro']] },
      { label: 'わ行', cells: [['わ','wa'],null,null,null,['を','wo']] },
      { label: 'ん', cells: [['ん','n'],null,null,null,null] },
    ],
  },
  {
    title: 'だくおん・はんだくおん',
    titleZh: '濁音・半濁音',
    rows: [
      { label: 'が行', cells: [['が','ga'],['ぎ','gi'],['ぐ','gu'],['げ','ge'],['ご','go']] },
      { label: 'ざ行', cells: [['ざ','za'],['じ','ji'],['ず','zu'],['ぜ','ze'],['ぞ','zo']] },
      { label: 'だ行', cells: [['だ','da'],['ぢ','ji'],['づ','zu'],['で','de'],['ど','do']] },
      { label: 'ば行', cells: [['ば','ba'],['び','bi'],['ぶ','bu'],['べ','be'],['ぼ','bo']] },
      { label: 'ぱ行', cells: [['ぱ','pa'],['ぴ','pi'],['ぷ','pu'],['ぺ','pe'],['ぽ','po']] },
    ],
  },
  {
    title: 'ようおん（小さい ゃ・ゅ・ょ）',
    titleZh: '拗音（小 ゃ・ゅ・ょ）',
    rows: [
      { label: 'きゃ行', cells: [['きゃ','kya'],['きゅ','kyu'],['きょ','kyo']] },
      { label: 'しゃ行', cells: [['しゃ','sha'],['しゅ','shu'],['しょ','sho']] },
      { label: 'ちゃ行', cells: [['ちゃ','cha'],['ちゅ','chu'],['ちょ','cho']] },
      { label: 'にゃ行', cells: [['にゃ','nya'],['にゅ','nyu'],['にょ','nyo']] },
      { label: 'ひゃ行', cells: [['ひゃ','hya'],['ひゅ','hyu'],['ひょ','hyo']] },
      { label: 'みゃ行', cells: [['みゃ','mya'],['みゅ','myu'],['みょ','myo']] },
      { label: 'りゃ行', cells: [['りゃ','rya'],['りゅ','ryu'],['りょ','ryo']] },
      { label: 'ぎゃ行', cells: [['ぎゃ','gya'],['ぎゅ','gyu'],['ぎょ','gyo']] },
      { label: 'じゃ行', cells: [['じゃ','ja'],['じゅ','ju'],['じょ','jo']] },
      { label: 'びゃ行', cells: [['びゃ','bya'],['びゅ','byu'],['びょ','byo']] },
      { label: 'ぴゃ行', cells: [['ぴゃ','pya'],['ぴゅ','pyu'],['ぴょ','pyo']] },
    ],
  },
];

/* ---------- ユーティリティ ---------- */
// 配列をシャッフル（Fisher–Yates）
function shuffleArray(arr, rng) {
  const a = arr.slice();
  const rand = rng || Math.random;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// 日付シード付き乱数（mulberry32）
function seededRandom(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
// 日付キー（ローカル）を作る 例: '2026-11-03'
function dateKeyOf(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// 今日の日付キー（ローカル）例: '2026-11-03'
function todayKey(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  return dateKeyOf(d);
}
// デイリーチャレンジ用の5問を日付から決定
// 「直近7日に出た5問を避ける」ルールを、紀元日から一貫して適用して決定する。
// 日付順に計算し、長期運用でも再帰によるスタックオーバーフローを避ける。
const DAILY_EPOCH = new Date(2026, 0, 1);
const dailyMemo = new Map();
function dailyQuestionIds(dateKey) {
  const allIds = QUESTIONS.map((q) => q.id);
  const seedFor = (k) => Number(String(k).replace(/-/g, '')) || 1;
  const parse = (k) => {
    const p = String(k).split('-').map(Number);
    const d = new Date(p[0] || 2026, (p[1] || 1) - 1, p[2] || 1);
    // 不正な日付文字列（NaN）の場合は紀元日にフォールバック
    return Number.isNaN(d.getTime()) ? new Date(DAILY_EPOCH.getTime()) : d;
  };
  const target = parse(dateKey);
  const targetKey = dateKeyOf(target);
  if (dailyMemo.has(targetKey)) return dailyMemo.get(targetKey).slice();
  for (const d = new Date(Math.min(target.getTime(), DAILY_EPOCH.getTime())); d <= target; d.setDate(d.getDate() + 1)) {
    const key = dateKeyOf(d);
    if (dailyMemo.has(key)) continue;
    const recent = new Set();
    for (let i = 1; i <= 7; i++) {
      const prev = new Date(d);
      prev.setDate(d.getDate() - i);
      if (prev < DAILY_EPOCH) continue;
      (dailyMemo.get(dateKeyOf(prev)) || []).forEach((id) => recent.add(id));
    }
    let pool = allIds.filter((id) => !recent.has(id));
    if (pool.length < 5) pool = allIds; // 万一足りなければ全題庫
    const result = shuffleArray(pool, seededRandom(seedFor(key))).slice(0, 5);
    dailyMemo.set(key, result);
  }
  return dailyMemo.get(targetKey).slice();
}
