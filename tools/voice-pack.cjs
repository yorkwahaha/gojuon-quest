'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const config = require('./voice-config.cjs');
const { model, voices } = config;
const resolveStyle = require('./voice-style.cjs');
const styleFor = q => resolveStyle(config, q);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fingerprint = q => hash(JSON.stringify({ kana: q.kana, model, style: styleFor(q) }));
function validateAudio(buf) {
  if (buf.length < 1000 || !(buf.subarray(0,3).toString() === 'ID3' || (buf[0] === 255 && (buf[1] & 224) === 224))) {
    throw new Error('Response is not a valid MP3 payload');
  }
}
function atomicWrite(file, value) {
  const temp = file + '.' + process.pid + '.part';
  try { fs.writeFileSync(temp, value); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
module.exports = { model, voices, styleFor, hash, fingerprint, validateAudio, atomicWrite };
