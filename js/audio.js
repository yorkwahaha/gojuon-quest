'use strict';
/* ============================================================
   五十音クエスト — 効果音（Web Audio API）と音声読み上げ
   ローカル音声パック優先、読み上げ失敗時はブラウザ合成へ。
   ============================================================ */

const AudioKit = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // 自動再生ポリシー対策：必要なときに resume
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // 単音を鳴らす
  function tone(freq, startAt, duration, type, peak) {
    const audio = getContext();
    if (!audio) return;
    const t0 = audio.currentTime + startAt;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak || 0.22, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  // ---- 効果音プリセット ----
  const sfx = {
    click() {
      tone(660, 0, 0.08, 'triangle', 0.12);
    },
    place() {
      tone(880, 0, 0.09, 'triangle', 0.14);
      tone(1320, 0.03, 0.1, 'triangle', 0.08);
    },
    correct() {
      // C5→E5→G5 の明るいアルペジオ
      tone(523.25, 0.00, 0.18, 'triangle', 0.22);
      tone(659.25, 0.09, 0.18, 'triangle', 0.22);
      tone(783.99, 0.18, 0.34, 'triangle', 0.24);
    },
    wrong() {
      tone(196, 0.00, 0.22, 'sawtooth', 0.14);
      tone(147, 0.14, 0.30, 'sawtooth', 0.14);
    },
    unlock() {
      // キラキラ上昇音
      const notes = [1046.5, 1318.5, 1568.0, 2093.0];
      notes.forEach((f, i) => tone(f, i * 0.09, 0.24, 'sine', 0.2));
    },
    fanfare() {
      const seq = [[523.25, 0], [523.25, 0.12], [523.25, 0.24], [659.25, 0.36], [783.99, 0.52], [1046.5, 0.72]];
      seq.forEach(([f, t]) => tone(f, t, 0.34, 'square', 0.12));
    },
    tick() {
      tone(1200, 0, 0.05, 'square', 0.07);
    },
    star() {
      tone(1568, 0, 0.12, 'sine', 0.18);
      tone(2093, 0.10, 0.2, 'sine', 0.18);
    },
    coin() {
      // コインのキラッという音
      tone(1318.5, 0.00, 0.07, 'square', 0.10);
      tone(1760.0, 0.05, 0.16, 'square', 0.12);
    },
    levelup() {
      // ランクアップの華やかな上昇音
      const seq = [[523.25, 0], [659.25, 0.10], [783.99, 0.20], [1046.5, 0.32], [1318.5, 0.44]];
      seq.forEach(([f, t]) => tone(f, t, 0.30, 'triangle', 0.22));
    },
    claim() {
      // ミッション受け取りのキラキラ
      const notes = [1046.5, 1568.0, 2093.0];
      notes.forEach((f, i) => tone(f, i * 0.08, 0.22, 'sine', 0.2));
    },
    crack() {
      // ガチャの割れる音（ノイズ気味）
      tone(180, 0.00, 0.08, 'sawtooth', 0.2);
      tone(120, 0.07, 0.10, 'sawtooth', 0.18);
    },
    legendary() {
      // SSR排出の大ファンファーレ
      const seq = [[523.25, 0], [523.25, 0.13], [659.25, 0.26], [783.99, 0.39], [1046.5, 0.55], [1318.5, 0.72]];
      seq.forEach(([f, t]) => tone(f, t, 0.36, 'square', 0.13));
    },
    cutin() {
      // わざ発動：低音ドン＋キラキラの余韻
      tone(65.4, 0.00, 0.50, 'sine', 0.5);
      tone(130.8, 0.02, 0.38, 'triangle', 0.28);
      tone(196.0, 0.05, 0.30, 'sawtooth', 0.10);
      [1568.0, 2093.0, 2637.0].forEach((f, i) => tone(f, 0.24 + i * 0.08, 0.30, 'sine', 0.14));
    },
  };

  // Optional files. A failed file is retried after the next page reload.
  const missingEffects = new Set();
  const activeEffects = new Map();

  function play(name) {
    if (!SaveStore.data || !SaveStore.data.sound || !Object.hasOwn(sfx, name)) return;
    if (missingEffects.has(name)) { sfx[name](); return; }
    let audio;
    try { audio = new Audio(`assets/sfx/${name}.mp3`); }
    catch (_) { sfx[name](); return; }
    let settled = false;
    let timer;
    function finish(fallback = false, missing = false) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeEffects.delete(audio);
      if (missing) missingEffects.add(name);
      if (fallback) {
        audio.pause();
        if (SaveStore.data.sound && !document.hidden) sfx[name]();
      }
    }
    activeEffects.set(audio, () => { finish(); audio.pause(); });
    audio.addEventListener('ended', () => finish());
    audio.addEventListener('error', () => finish(true, true));
    timer = setTimeout(() => finish(true, true), 1500);
    audio.play().then(() => clearTimeout(timer)).catch(error => {
      finish(true, error.name === 'NotSupportedError');
    });
  }

  const musicFiles = { home: 'assets/bgm/home.mp3', quiz: 'assets/bgm/quiz.mp3', timeattack: 'assets/bgm/timeattack.mp3' };
  const missingMusic = new Set();
  let musicName = 'home';
  let music = null;
  let interacted = false;

  function syncMusic() {
    if (!interacted || !SaveStore.data.bgm || document.hidden) {
      if (music) music.pause();
      return;
    }
    if (missingMusic.has(musicName)) return;
    if (!music) {
      const name = musicName;
      try { music = new Audio(musicFiles[name]); } catch (_) { return; }
      music.loop = true;
      music.volume = 0.16;
      const clip = music;
      clip.addEventListener('error', () => {
        missingMusic.add(name);
        clip.pause();
        if (music === clip) music = null;
      });
    }
    if (!music.paused) return;
    const clip = music;
    clip.play().catch(error => {
      if (music !== clip) return;
      clip.pause();
      if (error.name === 'NotSupportedError') {
        missingMusic.add(musicName);
        music = null;
      }
    });
  }

  function setMusic(name) {
    if (!Object.hasOwn(musicFiles, name)) return;
    if (musicName !== name) {
      if (music) music.pause();
      music = null;
      musicName = name;
    }
    syncMusic();
  }

  function syncSettings() {
    if (!SaveStore.data.sound || document.hidden) {
      activeEffects.forEach(cancel => cancel());
    }
    syncMusic();
  }

  function init() {
    const activate = () => { interacted = true; syncMusic(); };
    document.addEventListener('pointerdown', activate);
    document.addEventListener('keydown', activate);
    document.addEventListener('visibilitychange', syncSettings);
  }

  // ---- 読み上げ ----
  // Fish Audio で生成した音声パック（VOICE_PACK にかな→mp3の対応表）があれば再生し、
  // なければブラウザの音声合成にフォールバックする
  let currentPackAudio = null;

  function stopVoice() {
    if (currentPackAudio) {
      const old = currentPackAudio;
      currentPackAudio = null;
      old.pause();
      old.currentTime = 0;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function speakWithPack(text, fallback = true) {
    const file = typeof VOICE_PACK !== 'undefined' ? VOICE_PACK[text] : null;
    if (!file) return false;
    try {
      const audio = new Audio(file);
      currentPackAudio = audio;
      audio.play().catch(() => {
        // A replaced, muted, or cancelled request must not start stale speech.
        if (currentPackAudio !== audio || !SaveStore.data.voice) return;
        currentPackAudio = null;
        if (fallback) speakTTS(text);
      });
      return true;
    } catch (e) {
      currentPackAudio = null;
      return false;
    }
  }

  function wazaQuestion(text) {
    if (typeof QUESTIONS === 'undefined') return null;
    const key = typeof toKatakana === 'function' ? toKatakana(text) : text;
    return QUESTIONS.find((q) => q.type === 'waza' && q.kana === key) || null;
  }

  // 招式名不走預先上傳的 mp3。同網域的 voice server 第一次向 Fish 要聲音並存檔，之後重播同一檔。
  function voiceUrl(q) {
    const path = `api/voice?kana=${encodeURIComponent(q.kana)}&anime=${encodeURIComponent(q.anime)}`;
    if (typeof location !== 'undefined' && location.protocol === 'file:') return `http://127.0.0.1:8765/${path}`;
    return path;
  }

  function playFish(q) {
    try {
      const audio = new Audio(voiceUrl(q));
      currentPackAudio = audio;
      audio.play().catch(() => {
        if (currentPackAudio === audio) currentPackAudio = null;
      });
    } catch (e) {
      currentPackAudio = null;
    }
  }

  function speak(text) {
    stopVoice();
    if (!SaveStore.data || !SaveStore.data.voice) return;
    const waza = wazaQuestion(text);
    if (waza) { playFish(waza); return; }
    if (speakWithPack(text)) return;
    speakTTS(text);
  }

  function speakTTS(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.82;   // 子どもが聞き取りやすい少しゆっくりめ
    u.pitch = 1.05;
    const voice = pickJapaneseVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
  let jaVoice = null;
  function pickJapaneseVoice() {
    if (!('speechSynthesis' in window)) return null;
    if (jaVoice) return jaVoice;
    const voices = window.speechSynthesis.getVoices();
    jaVoice =
      voices.find((v) => v.lang === 'ja-JP') ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ja')) ||
      null;
    return jaVoice;
  }
  // 音声リストは非同期で読み込まれることがある
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = pickJapaneseVoice;
  }

  // わざ発動の読み上げ。平仮名表示でも、サーバーが片仮名で Fish に頼み、快取した同じ檔を鳴らす。
  function shout(text) {
    stopVoice();
    if (!SaveStore.data || !SaveStore.data.voice) return;
    const waza = wazaQuestion(text);
    if (waza) playFish(waza);
  }

  return { init, setMusic, syncSettings, play, speak, shout, stopVoice };
})();
