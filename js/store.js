'use strict';
/* ============================================================
   五十音クエスト — セーブデータ管理（localStorage）
   ============================================================ */

const SAVE_KEY = 'gojuon-quest-save-v1';

const DEFAULT_SAVE = {
  saveVersion: 1,          // セーブデータの形式バージョン（将来のマイグレーション用）
  playerName: 'クエスター',
  xp: 0,
  stars: 0,
  coins: 30,             // 初心者ギフト30コイン
  correct: 0,            // 累計正解数
  wrong: 0,              // 累計ミス数
  streak: 0,             // 現在の連続正解数
  bestStreak: 0,         // 最高連続正解数
  correctByLevel: { 1: 0, 2: 0, 3: 0 },
  correctByAnime: { jojo: 0, jjk: 0 },
  timeAttackBest: 0,     // タイムアタックのベストスコア
  timeAttackPlays: 0,
  dailyStreak: 0,        // デイリーチャレンジ連続クリア日数
  lastDaily: '',         // 最後にクリアした日付キー
  unlocked: [],          // 解放済みカードID
  missionsClaimed: [],   // 受け取り済みミッションID
  gachaPulls: 0,         // ガチャを引いた回数
  sound: true,           // 効果音
  voice: true,           // 読み上げ音声
};

function freshDefaultSave() {
  // ネストしたオブジェクトも独立したインスタンスにする
  const d = Object.assign({}, DEFAULT_SAVE);
  d.correctByLevel = { 1: 0, 2: 0, 3: 0 };
  d.correctByAnime = { jojo: 0, jjk: 0 };
  d.unlocked = [];
  d.missionsClaimed = [];
  return d;
}

// localStorageから読み込んだデータを検証し、壊れていても落ちないようにする
function sanitizeSave(raw) {
  const fresh = freshDefaultSave();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fresh;

  const num = (v, dflt) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : dflt;
  const bool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);

  fresh.playerName =
    typeof raw.playerName === 'string' && raw.playerName.trim()
      ? raw.playerName.trim().slice(0, 14)
      : 'クエスター';

  fresh.saveVersion = num(raw.saveVersion, 1);

  ['xp', 'stars', 'coins', 'correct', 'wrong', 'streak', 'bestStreak',
   'timeAttackBest', 'timeAttackPlays', 'dailyStreak', 'gachaPulls'].forEach((k) => {
    fresh[k] = num(raw[k], fresh[k]);
  });

  fresh.sound = bool(raw.sound, true);
  fresh.voice = bool(raw.voice, true);
  fresh.lastDaily =
    typeof raw.lastDaily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastDaily)
      ? raw.lastDaily
      : '';

  // 配列フィールド：文字列かつ既知のIDだけ残す（重複も除去）
  const validCardIds = new Set(CARDS.map((c) => c.id));
  const validMissionIds = new Set(MISSIONS.map((m) => m.id));
  fresh.unlocked = Array.isArray(raw.unlocked)
    ? [...new Set(raw.unlocked.filter((id) => typeof id === 'string' && validCardIds.has(id)))]
    : [];
  fresh.missionsClaimed = Array.isArray(raw.missionsClaimed)
    ? [...new Set(raw.missionsClaimed.filter((id) => typeof id === 'string' && validMissionIds.has(id)))]
    : [];

  // ネストしたオブジェクト（配列や欠損キーを弾く）
  const lvl = raw.correctByLevel && typeof raw.correctByLevel === 'object' && !Array.isArray(raw.correctByLevel)
    ? raw.correctByLevel : {};
  fresh.correctByLevel = { 1: num(lvl[1], 0), 2: num(lvl[2], 0), 3: num(lvl[3], 0) };
  const ani = raw.correctByAnime && typeof raw.correctByAnime === 'object' && !Array.isArray(raw.correctByAnime)
    ? raw.correctByAnime : {};
  fresh.correctByAnime = { jojo: num(ani.jojo, 0), jjk: num(ani.jjk, 0) };

  return fresh;
}

// Every XP source shares the same rank rewards (answers, daily bonus, gacha).
function awardXP(data, amount) {
  const before = rankForXP(data.xp).index;
  data.xp += amount;
  const after = rankForXP(data.xp).index;
  const rankUp = after > before ? { index: after } : null;
  const bonusCoins = rankUp ? RANKUP_COINS : 0;
  data.coins += bonusCoins;
  if (rankUp) data.stars += RANKUP_STARS;
  return { rankUp, bonusCoins };
}

const SaveStore = {
  data: null,

  load() {
    let data;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      data = raw ? sanitizeSave(JSON.parse(raw)) : freshDefaultSave();
    } catch (e) {
      console.warn('セーブデータの読み込みに失敗しました。初期化します。', e);
      data = freshDefaultSave();
    }
    this.data = data;
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('セーブに失敗しました。', e);
    }
  },

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('リセットに失敗しました。', e);
    }
    this.data = freshDefaultSave();
  },

  // 正解時の共通処理：XP・連勝・コイン・カード解放・ランクアップを計算して保存
  // golden: キラキラ問題ならボーナス適用
  recordCorrect(level, anime, opts) {
    const d = this.data;
    const golden = !!(opts && opts.golden);

    d.streak += 1;
    if (d.streak > d.bestStreak) d.bestStreak = d.streak;
    d.correct += 1;
    const lv = LEVEL_INFO[level] ? level : 1;
    d.correctByLevel[lv] = (d.correctByLevel[lv] || 0) + 1;
    if (anime && d.correctByAnime[anime] !== undefined) d.correctByAnime[anime] += 1;

    // XP：基礎値 × キラキラ補正 ＋ 連勝ボーナス（最大+20）
    const base = (LEVEL_INFO[lv] && LEVEL_INFO[lv].baseXP) || 10;
    const goldenBonus = golden ? Math.round(base * (GOLDEN_XP_MULT - 1)) : 0;
    const streakBonus = Math.min(d.streak * 2, 20);
    const gained = base + goldenBonus + streakBonus;
    const { rankUp, bonusCoins } = awardXP(d, gained);

    // コイン
    const coinBase = LEVEL_COINS[lv] || 8;
    const answerCoins = coinBase * (golden ? GOLDEN_COIN_MULT : 1);
    const coinsGained = answerCoins + bonusCoins;
    d.coins += answerCoins;

    const newlyUnlocked = this.checkCardUnlocks();
    this.save();
    return { gained, coinsGained, newlyUnlocked, streak: d.streak, rankUp, golden };
  },

  recordWrong() {
    const d = this.data;
    d.streak = 0;
    d.wrong += 1;
    this.save();
  },

  addXP(amount) {
    const reward = awardXP(this.data, amount);
    this.save();
    return reward;
  },

  addStars(n) {
    this.data.stars += n;
    this.save();
  },

  addCoins(n) {
    this.data.coins += n;
    this.save();
  },

  recordTimeAttack(score) {
    const d = this.data;
    d.timeAttackPlays += 1;
    const isRecord = score > d.timeAttackBest;
    if (isRecord) d.timeAttackBest = score;
    this.save();
    return isRecord;
  },

  recordDailyClear(stars = 0) {
    const d = this.data;
    const today = todayKey(0);
    if (d.lastDaily === today) return { already: true, streak: d.dailyStreak };
    d.dailyStreak = (d.lastDaily === todayKey(-1)) ? d.dailyStreak + 1 : 1;
    d.lastDaily = today;
    d.stars += stars;
    this.save();
    return { already: false, streak: d.dailyStreak };
  },

  checkCardUnlocks() {
    const d = this.data;
    const newly = [];
    for (const card of CARDS) {
      if (!d.unlocked.includes(card.id) && d.correct >= card.need) {
        d.unlocked.push(card.id);
        newly.push(card);
      }
    }
    return newly;
  },

  // ミッションを受け取る。成功したら { coins } を返す。条件外・受取済みなら null
  claimMission(id) {
    const d = this.data;
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission) return null;
    if (d.missionsClaimed.includes(id)) return null;
    if (missionProgress(d, mission) < mission.need) return null;
    d.missionsClaimed.push(id);
    d.coins += mission.rewardCoins;
    this.save();
    return { coins: mission.rewardCoins, mission };
  },

  // ガチャを1回引く。{ type:'card', card } | { type:'xp', amount, rankUp } | { type:'insufficient' }
  drawGacha() {
    const d = this.data;
    if (d.coins < GACHA_COST) return { type: 'insufficient' };
    d.coins -= GACHA_COST;
    d.gachaPulls += 1;

    const locked = CARDS.filter((c) => !d.unlocked.includes(c.id));
    if (locked.length > 0) {
      const pick = locked[Math.floor(Math.random() * locked.length)];
      d.unlocked.push(pick.id);
      this.save();
      return { type: 'card', card: pick };
    }
    // 全部集め済みならXPパックに変換
    const xpAmount = 150;
    const reward = this.addXP(xpAmount);
    return { type: 'xp', amount: xpAmount, rankUp: reward.rankUp };
  },
};
