'use strict';
// Shared by the online Worker, pack generator and content fingerprints.
module.exports = function voiceStyle(config, question) {
  const key = question.anime === 'jojo' && question.voiceSide === 'hero' ? 'jojoHero' : question.anime;
  const voice = config.voices[key];
  if (!voice) return null;
  return { ...voice, prefix: question.anime === 'jojo' && question.type === 'waza' ? '[shouting] ' : voice.prefix };
};
