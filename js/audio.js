'use strict';
// Effects play local MP3s. The recorded voice pack has a browser TTS fallback.
const AudioKit = (() => {
  const activeEffects = new Map();

  function play(name) {
    const file = `assets/sfx/${name}.mp3`;
    if (!SaveStore.data?.sound || document.hidden || !OPTIONAL_MEDIA.has(file)) return;
    let audio;
    try { audio = new Audio(file); } catch (_) { return; }

    const timer = setTimeout(cancel, 1500);
    function finish() {
      clearTimeout(timer);
      return activeEffects.delete(audio);
    }
    function cancel() {
      if (finish()) audio.pause();
    }
    activeEffects.set(audio, cancel);
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', cancel, { once: true });
    audio.play().then(() => clearTimeout(timer), cancel);
  }

  const musicFiles = {
    home: 'assets/bgm/home.mp3', quiz: 'assets/bgm/quiz.mp3', timeattack: 'assets/bgm/timeattack.mp3',
    jojo: 'assets/bgm/jojo.mp3', jjk: 'assets/bgm/jjk.mp3',
  };
  const missingMusic = new Set();
  let musicName = 'home';
  let music = null;
  let interacted = false;

  function syncMusic() {
    if (!interacted || !SaveStore.data.bgm || document.hidden) {
      if (music) music.pause();
      return;
    }
    if (!OPTIONAL_MEDIA.has(musicFiles[musicName]) || missingMusic.has(musicName)) return;
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

  function setMusic(name, anime = 'all') {
    // An explicit series filter takes priority in every quiz mode.
    // Missing series tracks stay silent rather than playing another series.
    if (['quiz', 'timeattack'].includes(name) && ['jojo', 'jjk'].includes(anime)) name = anime;
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
    if (document.hidden) stopVoice();
    syncMusic();
  }

  function init() {
    const activate = () => { interacted = true; syncMusic(); };
    document.addEventListener('pointerdown', activate);
    document.addEventListener('keydown', activate);
    document.addEventListener('visibilitychange', syncSettings);
  }

  // ---- 読み上げ ----
  // Known readings use the recorded pack. Chart-only syllables use local TTS.
  let currentPackAudio = null;
  let currentUtterance = null;
  let voiceTimer = null;

  function stopVoice() {
    clearTimeout(voiceTimer);
    voiceTimer = null;
    currentUtterance = null;
    if (currentPackAudio) {
      const old = currentPackAudio;
      currentPackAudio = null;
      old.pause();
      old.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
  }

  function playVoice(file, fallback, onPlayback) {
    try {
      const audio = new Audio(file);
      currentPackAudio = audio;
      let settled = false;
      const fail = error => {
        if (settled || currentPackAudio !== audio || !SaveStore.data.voice || document.hidden) return;
        settled = true;
        clearTimeout(voiceTimer);
        audio.pause();
        currentPackAudio = null;
        if (!onPlayback && error?.name === 'NotAllowedError' && typeof App !== 'undefined') App.toast(I18N.t('voice.retry'));
        fallback();
      };
      audio.addEventListener('error', fail);
      voiceTimer = setTimeout(fail, 4000);
      audio.play().then(() => {
        if (currentPackAudio !== audio) return;
        clearTimeout(voiceTimer);
        onPlayback?.(true);
      }).catch(fail);
      return true;
    } catch (e) {
      clearTimeout(voiceTimer);
      currentPackAudio = null;
      return false;
    }
  }

  function speak(text, onPlayback) {
    stopVoice();
    if (!SaveStore.data?.voice || document.hidden) { onPlayback?.(false); return; }
    const key = toKatakana(text);
    const file = VOICE_PACK[key];
    const fallback = () => speakTTS(key, onPlayback);
    if (file && playVoice(file, fallback, onPlayback)) return;
    fallback();
  }

  function speakTTS(text, onPlayback) {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance !== 'function') { onPlayback?.(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.82;   // 子どもが聞き取りやすい少しゆっくりめ
    u.pitch = 1.05;
    const voice = pickJapaneseVoice();
    if (voice) u.voice = voice;
    currentUtterance = u;
    if (onPlayback) {
      u.onstart = () => {
        if (currentUtterance !== u) return;
        clearTimeout(voiceTimer);
        onPlayback(true);
      };
      u.onerror = () => {
        if (currentUtterance !== u) return;
        stopVoice();
        onPlayback(false);
      };
      voiceTimer = setTimeout(u.onerror, 4000);
    }
    try { synth.speak(u); } catch (_) { if (onPlayback) u.onerror(); }
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

  return { init, setMusic, syncSettings, play, speak, shout: speak, stopVoice };
})();
