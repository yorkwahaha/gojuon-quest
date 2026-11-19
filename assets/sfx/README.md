# MP3 音效補檔

將 MP3 放在本目錄，檔名區分大小寫。可逐一補檔。補檔後在專案根目錄執行 `node tools/generate-voice-pack.js --sync-only`。

完整相對路徑為 `assets/sfx/` 加上下表檔名，例如 `assets/sfx/correct.mp3`。共有 14 種；所有彩漫招式目前共用 `cutin.mp3`。

| 檔名 | 使用時機 |
|---|---|
| `click.mp3` | 導覽、按鈕、返回等操作 |
| `place.mp3` | 放入假名拼字 |
| `correct.mp3` | 答對、姓名更新、開啟音效 |
| `wrong.mp3` | 答錯、金幣不足 |
| `unlock.mp3` | 解鎖卡片、一般開箱結果 |
| `fanfare.mp3` | 每日挑戰完成 |
| `tick.mp3` | 限時挑戰倒數 |
| `star.mp3` | 其他結算 |
| `coin.mp3` | 金色加碼題答對 |
| `levelup.mp3` | 升級、連擊慶祝 |
| `claim.mp3` | 領取任務獎勵 |
| `crack.mp3` | 開箱敲擊，每次敲擊各播放一次 |
| `legendary.mp3` | SSR 開箱結果 |
| `cutin.mp3` | 彩漫招式攻擊 |

有收錄的 MP3 優先播放。缺檔、解碼失敗、播放拒絕或 1.5 秒仍無法開始時，使用該事件原有的合成音效。GitHub Pages 發布時請一併提交音檔與更新後的 `js/voice-manifest.js`。

關閉「音效」或切到背景分頁會停止正在播放的 MP3 並取消待播回退；背景分頁不會啟動新的音效。BGM 與朗讀發音有各自開關。建議素材去除開頭靜音，短音效保持精簡。

朗讀題目的語音繼續使用 `assets/voice/` 與既有瀏覽器語音備援，與此目錄分開。
