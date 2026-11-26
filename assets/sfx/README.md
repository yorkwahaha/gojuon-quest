# MP3 音效

本目錄收錄 14 種遊戲音效。素材來自 Sonniss GDC 2026 Game Audio Bundle，經裁切、調整音量及淡出後轉成 MP3。這些音效依 Sonniss 套件授權用於遊戲，權利屬於各素材權利人。[素材套件](https://gdc.sonniss.com/) · [Sonniss 套件授權](https://sonniss.com/gdc-bundle-license/)

更換檔案時沿用檔名，並在專案根目錄執行 `node tools/generate-voice-pack.js --media-only`。

完整相對路徑為 `assets/sfx/` 加上下表檔名，例如 `assets/sfx/correct.mp3`。共有 14 種；所有彩漫招式目前共用 `cutin.mp3`。

| 檔名 | 使用時機 | 素材來源 |
|---|---|---|
| `click.mp3` | 導覽、按鈕、返回 | Epic Stock Media，Board Game，Analog Vintage Double Click 11 |
| `place.mp3` | 放入假名 | Epic Stock Media，Board Game，Cards Dry Show Flip 12 |
| `correct.mp3` | 答對、姓名更新、開啟音效 | CB Sounddesign，Kalimba 3 Up |
| `wrong.mp3` | 答錯、金幣不足 | Cinematic Sound Design，Deny Muted |
| `unlock.mp3` | 解鎖卡片、一般開箱 | Epic Stock Media，Fantasy Game 2，Magic Light Spell Enchantment 03 |
| `fanfare.mp3` | 每日挑戰完成 | CB Sounddesign，Xylophone Ringtone 2 |
| `tick.mp3` | 限時挑戰倒數 | 344 Audio，Crooked Antique Clock |
| `star.mp3` | 一般結算 | Cinematic Sound Design，Game Entry Happy Short |
| `coin.mp3` | 金色加碼題答對 | Cinematic Sound Design，Foley Coin Flip Single Fast |
| `levelup.mp3` | 升級、連擊慶祝 | Epic Stock Media，Anime Game，Power Up Bright Positive 05 |
| `claim.mp3` | 領取任務獎勵 | Cinematic Sound Design，Ting Coins |
| `crack.mp3` | 開箱敲擊 | InMotionAudio，CrackerPull WithBang Effected 03 |
| `legendary.mp3` | SSR 開箱 | CB Sounddesign，Magic Creation 23 |
| `cutin.mp3` | 彩漫招式 | Cinematic Sound Design，Impact Cut Sweep |

遊戲直接播放收錄的 MP3。缺檔、解碼失敗、播放拒絕或等待超過 1.5 秒時，略過該次音效。GitHub Pages 發布時請一併提交音檔與更新後的 `js/media-manifest.js`。

關閉「音效」或切到背景分頁會停止正在播放和等待播放的音效。BGM 與朗讀發音有各自開關。

朗讀題目的語音繼續使用 `assets/voice/` 與既有瀏覽器語音備援，與此目錄分開。
