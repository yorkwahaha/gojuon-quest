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
  bgm: true,             // 背景音楽（optional MP3）
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
  fresh.bgm = bool(raw.bgm, true);
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
  status: 'ready',
  lastRaw: null,
  onStatus: null,

  setStatus(status) {
    this.status = status;
    if (this.onStatus) this.onStatus(status);
  },

  canWrite(allowCorrupt = false) {
    if (this.status === 'conflict' || this.status === 'readonly' || this.status === 'checking') return false;
    if (this.status === 'corrupt' && !allowCorrupt) return false;
    try {
      if (localStorage.getItem(SAVE_KEY) !== this.lastRaw) {
        this.setStatus('conflict');
        return false;
      }
    } catch (_) { /* save() reports unavailable storage; play may continue in memory. */ }
    return true;
  },

  load() {
    let loadStatus = 'ready';
    this.lastRaw = null;
    try {
      this.lastRaw = localStorage.getItem(SAVE_KEY);
      const parsed = this.lastRaw === null ? {} : JSON.parse(this.lastRaw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('Invalid save');
      this.data = sanitizeSave(parsed);
    } catch {
      console.warn('セーブデータの読み込みに失敗しました。');
      this.data = freshDefaultSave();
      loadStatus = this.lastRaw === null ? 'unavailable' : 'corrupt';
    }
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('storage', event => {
        if ((event.key === SAVE_KEY || event.key === null) && event.newValue !== this.lastRaw) this.setStatus('conflict');
      });
    }
    // One writer per browser origin. A second tab remains usable for reading.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      this.setStatus('checking');
      navigator.locks.request(SAVE_KEY, { ifAvailable: true }, lock => {
        if (!lock) { this.setStatus('readonly'); return; }
        if (this.status === 'conflict') return;
        this.setStatus(loadStatus);
        return new Promise(resolve => window.addEventListener('pagehide', resolve, { once: true }));
      }).catch(() => this.setStatus('readonly'));
      window.addEventListener('pageshow', event => { if (event.persisted) this.setStatus('readonly'); });
    } else this.setStatus(loadStatus);
    return this.data;
  },

  save(data = this.data) {
    if (!this.canWrite()) return false;
    try {
      const raw = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, raw);
      this.data = data;
      this.lastRaw = raw;
      this.setStatus('ready');
      return true;
    } catch (e) {
      console.warn('セーブに失敗しました。', e);
      this.setStatus('unavailable');
      return false;
    }
  },

  reset() {
    if (!this.canWrite(true)) return false;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('リセットに失敗しました。', e);
      if (this.status !== 'corrupt') this.setStatus('unavailable');
      return false;
    }
    this.data = freshDefaultSave();
    this.lastRaw = null;
    this.setStatus('ready');
    return true;
  },

  // 正解時の共通処理：XP・連勝・コイン・カード解放・ランクアップを計算して保存
  // golden: キラキラ問題ならボーナス適用
  recordCorrect(level, anime, opts) {
    if (!this.canWrite()) return null;
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
    if (!this.canWrite()) return false;
    const d = this.data;
    d.streak = 0;
    d.wrong += 1;
    this.save();
  },

  addXP(amount) {
    if (!this.canWrite()) return null;
    const reward = awardXP(this.data, amount);
    this.save();
    return reward;
  },

  addStars(n) {
    if (!this.canWrite()) return false;
    this.data.stars += n;
    this.save();
  },

  addCoins(n) {
    if (!this.canWrite()) return false;
    this.data.coins += n;
    this.save();
  },

  recordTimeAttack(score) {
    if (!this.canWrite()) return false;
    const d = this.data;
    d.timeAttackPlays += 1;
    const isRecord = score > d.timeAttackBest;
    if (isRecord) d.timeAttackBest = score;
    this.save();
    return isRecord;
  },

  recordDailyClear(stars = 0, date = todayKey(0), { xp = 0, coins = 0 } = {}) {
    if (!this.canWrite()) return null;
    const d = { ...this.data };
    // A stale/cross-midnight session never consumes the new day's reward.
    if (d.lastDaily >= date) return { already: true, streak: d.dailyStreak };
    const previous = new Date(date + 'T12:00:00');
    previous.setDate(previous.getDate() - 1);
    d.dailyStreak = (d.lastDaily === dateKeyOf(previous)) ? d.dailyStreak + 1 : 1;
    d.lastDaily = date;
    d.stars += stars;
    d.coins += coins;
    const reward = awardXP(d, xp);
    if (!this.save(d)) return null;
    return { already: false, streak: d.dailyStreak, ...reward };
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
    if (!this.canWrite()) return null;
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
    if (!this.canWrite()) return { type: 'blocked' };
    const d = this.data;
    if (d.unlocked.length === CARDS.length && !rankForXP(d.xp).next) return { type: 'complete' };
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
