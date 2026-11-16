# Fish Audio 優先播放更新

依使用者在全面修復後的指示，將語音政策改回線上 Fish Audio 優先。本文件取代同日 `FIXES-2026-11-16.md` 中「只有維護工具能生成」的歷史描述，其餘修復保留。

## 模型與聲線

單一聲線設定來源：`tools/voice-config.cjs`。`tools/voice-style.cjs` 供 Worker、維護生成器與指紋檢查共用陣營／喊技解析，避免線上與備援錄音聲線不同。

| 用途 | 聲線 ID | 語氣 | 語速 |
| --- | --- | --- | --- |
| JOJO 正派／主角陣營 | `4359ff0bb0ad45139c35f4b664ae3f87` | 角色平順朗讀；替身、招式喊技 | 0.92x |
| JOJO 反派／敵對陣營 | `5a8e46f1b94c4351aebb8a66b113cec5` | 角色平順朗讀；替身、招式喊技 | 0.92x |
| JOJO 共通名詞 | `5a8e46f1b94c4351aebb8a66b113cec5` | 平順朗讀 | 0.92x |
| 呪術廻戦 | `827be896a6954a8199ce4b2baad6af36` | `[shouting]` | 1.0x |

模型固定 `s2.1-pro-free`。官方來源：<https://fish.audio/blog/s2-1-pro-free-api/>，本次確認免費至 2026-11-30。到 `2026-12-01T00:00:00Z` 停止新生成，不切換付費模型；已快取與既有錄音仍可播放。

## JOJO 分類與錄音更新

- 86 題 JOJO 中，62 題正派、21 題反派、3 題共通名詞。共通名詞為「波紋」「スタンド」「幽波紋」，後兩者同讀音、共用一檔。
- 此為發音用的主角／敵對陣營分類。露伴、花京院、波魯那雷夫、億泰、福葛歸主角陣營；第 9 部喬迪奧、德拉格納及其替身也歸主角陣營。
- 敵對角色包含 DIO、瓦姆烏、卡茲、艾斯迪斯、吉良吉影、迪亞波羅、普奇、迪亞哥、瓦倫泰與透龍；其替身及題目中明確指向 DIO 的「ムダムダ」同步使用反派聲線。
- 40 題 JOJO 替身／招式統一 `[shouting]`；例如 `オラオラ` 由正派聲線喊出、`ムダムダ` 由反派聲線喊出。角色題正常朗讀，避免把人名都喊成招式。
- 已重新生成 73 個變更錄音，全部通過 MP3 解碼；110 個備援音檔約 2.64 MB。咒術迴戰聲線與錄音維持原設定。
- 前端資料、音檔 manifest、音訊程式及 API URL 版本更新為 `20261116-fish2`，搭配檔案 hash 與伺服器聲線識別，避免繼續命中舊聲線快取。

分類參考角色與替身對應的官方資料：<https://jojo-portal.com/about/sbr/>、<https://jojo-portal.com/anime/sbr/character/>、<https://jojo-portal.com/news/game/270/>、<https://jojo-portal.com/about/tjl/>。主角／敵對的二分為本遊戲的發音配置，並非道德評級。

## 播放及服務規則

- 111 題／110 個獨立讀音皆優先請求既有 `gojuon-voice` Worker，依作品套用聲線；五十音表的題庫外單音節維持瀏覽器 TTS。
- 順序為 Fish 生成／快取 → 現有 MP3 → 瀏覽器日語 TTS。線上啟動限 9 秒，本機檔限 4 秒；Worker 上游請求連同下載限 7 秒，限制有效 MP3 且最多 1 MB。
- 切題、關閉語音、離開頁面或切至背景會停止當前播放，舊請求回呼不會觸發備援或打斷新語音。
- Worker 金鑰沿用既有 secret，前端不含金鑰。僅接受固定題庫作品／讀音；忽略呼叫者的模型、文字、聲線覆寫。HEAD 不生成。
- 以讀音、模型、聲線／語氣、現有 MP3 版本組成快取識別，Cloudflare Cache API 為區域性暫存而非永久儲存；不同區域或快取失效可能再次生成。無常駐跨請求 Promise。
- 提供 `X-Voice-Source`：`fish-generated`、`fish-cache`、`static-fallback`，供驗證實際來源；錯誤不公開上游回應／金鑰。
- 本機預覽前端同樣呼叫正式 Worker；本機 `/api/voice` 繼續只提供既有音檔，保留安全路徑限制。

## 驗證

- `node --test tests/regression.test.cjs tests/audit-fixes.test.cjs tests/fish-priority.test.cjs`：117 項通過，含正反派角色／替身對應、喊技與離線指紋一致性。
- `tools/browser-voice-smoke.cjs`：真實 Chromium 媒體播放，受控線上 MP3 成功、網路失敗轉本機 MP3、導覽停止語音，無 pageerror。
- `tools/browser-smoke.cjs`：既有鍵盤、跨分頁存檔、語系、限時、桌機／平板／手機尺寸回歸通過，無 pageerror。一般 UI 測試阻擋線上生成，語音另測。
- Wrangler 4.158.0 `deploy --dry-run` 成功。正式發布後另驗證兩作品線上生成、快取與前端更新。

Chromium 檢查不等同 iPad Safari 實機或人工聲音品質評估。
