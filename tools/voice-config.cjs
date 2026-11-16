'use strict';
module.exports = {
  model: 's2.1-pro-free',
  // Stop new online generations when the confirmed free window ends (UTC).
  freeUntil: '2026-12-01T00:00:00Z',
  voices: {
    jojo: { id: '5a8e46f1b94c4351aebb8a66b113cec5', prefix: '', prosody: { speed: 0.92, volume: 0, normalize_loudness: true } },
    jojoHero: { id: '4359ff0bb0ad45139c35f4b664ae3f87', prefix: '', prosody: { speed: 0.92, volume: 0, normalize_loudness: true } },
    jjk: { id: '827be896a6954a8199ce4b2baad6af36', prefix: '[shouting] ', prosody: { speed: 1, volume: 0, normalize_loudness: true } },
  },
};
