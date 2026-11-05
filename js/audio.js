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

  function play(name) {
    if (!SaveStore.data || !SaveStore.data.sound) return;
    if (sfx[name]) sfx[name]();
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

  function speakWithPack(text) {
    const file = typeof VOICE_PACK !== 'undefined' ? VOICE_PACK[text] : null;
    if (!file) return false;
    try {
      const audio = new Audio(file);
      currentPackAudio = audio;
      audio.play().catch(() => {
        // A replaced, muted, or cancelled request must not start stale speech.
        if (currentPackAudio !== audio || !SaveStore.data.voice) return;
        currentPackAudio = null;
        speakTTS(text);
      });
      return true;
    } catch (e) {
      currentPackAudio = null;
      return false;
    }
  }

  function speak(text) {
    stopVoice();
    if (!SaveStore.data || !SaveStore.data.voice) return;
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

  // わざ発動の「叫び」：低く太い声で叫ぶ感じに
  function shout(text) {
    stopVoice();
    if (!SaveStore.data || !SaveStore.data.voice) return;
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.95;
    u.pitch = 0.75;   // 低く太い叫び声
    u.volume = 1;
    const voice = pickJapaneseVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return { play, speak, shout, stopVoice };
})();
