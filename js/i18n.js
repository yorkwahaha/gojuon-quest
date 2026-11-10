'use strict';
/* ============================================================
   五十音クエスト — i18n（日本語 / 繁體中文）
   使い方：
     - 静的HTMLは data-i18n="key" を付ける（textContent 置換）
     - aria-label は data-i18n-aria="key"
     - 動的文字は I18N.t('key')
     - データ駆動（ランク名・ミッション名など）は I18N.tf(obj, 'field')
   ============================================================ */

const I18N = (() => {
  const STORAGE_KEY = 'gojuon-quest-locale';
  let locale = 'ja';

  const DICT = {
    ja: {
      /* ヘッダー */
      'nav.home': 'ホームへもどる',
      'missions.bell': 'ミッションをひらく',
      'settings.open': 'せってい',
      'coins.tip': 'コイン（あそぶと あつまるよ）',
      'stars.tip': 'あつめた星',
      'correct.tip': '累計正解数',
      'rank.tip': 'プレイヤーランク',

      /* ホーム：ヒーロー */
      'hero.badge': 'アニメではじめる ひらがな×カタカナ',
      'hero.sub1': '『ジョジョの奇妙な冒険』『呪術廻戦』の',
      'hero.sub2': 'キャラクター名・わざ名が',
      'hero.sub2b': 'バラバラ',
      'hero.sub3': '正しい順番にならべかえて、五十音をマスターしよう。',
      'hero.cta.play': 'いますぐ あそぶ',
      'hero.cta.chart': '五十音表をみる',
      'hero.feat1': 'JOJO＆呪術廻戦 全{count}問',
      'hero.feat2': 'ミッション＆ガチャで コインあつめ',
      'hero.feat3': 'ごほうびカード12枚',

      /* ホーム：プロフィール */
      'profile.correct': '正解',
      'profile.bestStreak': '最高連勝',
      'profile.stars': '星',
      'profile.cards': 'カード',
      'profile.editName': '名前を変更する',
      'profile.saveName': '保存',
      'profile.nextRank': 'あと {xp} XP で「{name}」',
      'profile.maxRank': 'さいこうランク たっせい！',

      /* デイリーバナー */
      'daily.kicker': 'きょうの デイリーチャレンジ',
      'daily.title': '5問勝負で 特別ボーナス！',
      'daily.desc': 'クリアで +50 XP と 星をゲット。ミス0なら 星3つ！',
      'daily.clearedTitle': '今日はクリア済み！',
      'daily.clearedDesc': 'おつかれさま！また あしたも チャレンジしよう。',
      'daily.cta': 'はじめる',
      'daily.clearedCta': 'おさらい',
      'daily.streak': '{n}日連続クリア',

      /* ミッション・ストリップ（ホーム） */
      'strip.kicker': 'ミッション',
      'strip.default': 'あたらしいミッションが まってるよ',
      'strip.claimable': 'ミッションが {n}こ うけとれるよ！',
      'strip.cta': 'みる',

      /* モードカード */
      'mode.practice.name': 'ならべかえ れんしゅう',
      'mode.practice.desc': 'レベル・作品をえらんで じっくり練習。平仮名／片仮名もきりかえられる。',
      'mode.practice.meta': '無限にあそべる',
      'mode.ta.name': 'タイムアタック',
      'mode.ta.desc': '60秒で 何問とけるかな？連続正解で高得点＆星ゲット！',
      'mode.ta.metaLabel': 'ベストスコア',
      'mode.chart.name': 'ごじゅうおん表',
      'mode.chart.desc': 'タップすると おとが きこえる！ひらがな・カタカナ・だくおん・ようおん。',
      'mode.chart.meta': '発音つき 音声ガイド',
      'mode.collection.name': 'コレクション',
      'mode.collection.desc': '正解数で ごほうびカードが アンロック！コインガチャもひける。',
      'mode.collection.metaSuffix': ' / 12 枚ゲット',

      /* クイズ共通 */
      'quiz.back': 'もどる',
      'quiz.practice': 'ならべかえ れんしゅう',
      'quiz.timeattack': 'タイムアタック',
      'quiz.daily': 'デイリーチャレンジ',
      'quiz.streakTitle': '連続正解',
      'quiz.scoreTitle': 'スコア',
      'quiz.timerTitle': '残り時間',
      'quiz.question': '{n} 問め',
      'quiz.dailyProgress': '{n} / 5 問め',

      /* セットアップ */
      'setup.title': '出題セッティング',
      'setup.taTitle': 'タイムアタック セッティング',
      'setup.dailyTitle': 'デイリーチャレンジ',
      'setup.work': '作品',
      'setup.level': 'むずかしさ',
      'setup.script': 'もじ',
      'setup.all': 'ぜんぶ',
      'setup.jojo': 'ジョジョ',
      'setup.jjk': '呪術廻戦',
      'setup.lv1': 'Lv.1 やさしい',
      'setup.lv2': 'Lv.2 ふつう',
      'setup.lv3': 'Lv.3 むずかしい',
      'setup.katakana': 'カタカナ',
      'setup.hiragana': 'ひらがな',
      'setup.lockNote': 'きょうの5問は ぜんぶの中から えらばれるよ。「もじ」だけ えらべる！',
      'setup.listeningLock': 'ききとりは ぜんぶの問題から出るよ。ひらがなとカタカナを えらんでね。',
      'setup.note': 'ヒント文をよんで、文字タイルを正しい順番にタップしよう。「・」と「＆」は動かないよ。',
      'setup.start': 'スタート',
      'setup.taStart': 'スタート！ 60秒チャレンジ',
      'setup.dailyStart': 'デイリーに いどむ！',

      /* プレイエリア */
      'play.hintOpen': 'ヒント：ローマ字をみる',
      'play.hintClose': 'ヒント：ローマ字をとじる',
      'play.romajiHint': 'ヒント（ローマ字）：{en}',
      'play.wrong': 'おしい！もう一回 ならべかえよう',
      'play.fixed': '固定文字',
      'play.slotAria': 'あきのマス',
      'play.slotFilled': '{kana} を取りのぞく',
      'play.tileAria': 'タイル {kana}',

      /* 答え合わせ */
      'reveal.correct': 'せいかい！',
      'reveal.speak': 'よみあげ',
      'reveal.next': 'つぎへ',
      'reveal.toResult': 'けっかをみる',
      'reveal.goldBonus': 'キラキラボーナス！',
      'reveal.comboStreak': 'れんさ {n}',
      'play.replay': 'なまえを きく',
      'cutin.kicker': 'わざ はっどう！',
      'cutin.skip': 'タップで つづける',
      'cutin.region': 'わざの攻撃イラスト',

      /* ききとりチャレンジ（聽音挑戰） */
      'listening.bestCombo': 'さいだい コンボ',
      'listening.correctCount': 'せいかい すう',
      'listening.heartsAria': 'のこりハート',
      'listening.gameOver': 'ゲームオーバー…',
      'listening.overSub': 'ハートが なくなっちゃった…',
      'listening.quitSub': 'ききとりチャレンジの まとめだよ。',
      'mode.listening.name': 'ききとりチャレンジ',
      'mode.listening.desc': '耳できいて、ばらばらになった かなを 正しい じゅんばんに ならべよう。ひらがな／カタカナをえらべる。ハートは3つ！',
      'mode.listening.meta': '制限時間なし・ハート3つ',

      /* リザルト */
      'result.taUp': 'タイムアップ！',
      'result.dailyClear': 'デイリーチャレンジ クリア！',
      'result.dailyReview': 'おさらい クリア！',
      'result.taNewRecord': 'しん記録おめでとう！',
      'result.taBest': 'ベストスコア：{score} pt',
      'result.dailyBonus': 'ボーナス +50 XP ・ {n}日連続クリア！',
      'result.dailyReviewSub': '今日は受け取り済み。クリアの星とパーフェクトボーナスは1日1回だよ。',
      'result.quit': 'おつかれさま！',
      'result.quitTa': 'タイムアタックを おえたよ。',
      'result.quitPractice': 'れんしゅうの まとめだよ。',
      'result.score': 'スコア',
      'result.correct': 'せいかい',
      'result.correctCount': '{n} 問',
      'result.correctOf': '{n} / 5 問',
      'result.miss': 'ミス',
      'result.missCount': '{n} 回',
      'result.xp': 'かくとく XP',
      'result.coins': 'かくとく コイン',
      'result.stamp': 'クリア！',
      'result.dailyStreak': '連続クリア',
      'result.dailyStreakDays': '{n} 日',
      'result.retry': 'もう一回',
      'result.retryQuit': 'つづける',
      'result.home': 'ホームへ',
      'result.perfect': ' ★パーフェクト',

      /* 五十音表 */
      'chart.title': 'ごじゅうおん表',
      'chart.sub': 'マスをタップすると 発音がきこえるよ。「だくおん」「ようおん」も チャレンジしよう。',
      'chart.hiragana': 'ひらがな',
      'chart.katakana': 'カタカナ',
      'chart.cellAria': '{kana}、発音をきく',

      /* コレクション */
      'collection.title': 'コレクション',
      'collection.sub': '正解数で ごほうびカードが アンロックされるよ。コインで ガチャも ひける！',
      'collection.progressSuffix': '/ 12 枚',
      'collection.next': 'つぎのカード「{name}」まで あと{n}問',
      'collection.complete': 'コンプリート！ おめでとう！',
      'collection.get': 'ゲット済み！',
      'collection.locked': '？？？',
      'collection.need': '{n}問 せいかいで ゲット',
      'collection.detailGot': '{n}問 せいかいで ゲットずみ！',
      'collection.detailLocked': 'ひらがな・カタカナで {n}問 せいかいしよう！（いま {m}問）',
      'collection.hiddenDesc': 'このカードはまだ かくされているよ。',

      /* ガチャ */
      'gacha.title': 'おたからボックス',
      'gacha.sub': '未入手のカードから ランダムで1枚！',
      'gacha.noCoins': 'コインが たりないよ（あと {n} コイン）',
      'gacha.coins': 'コイン',
      'gacha.hint': 'ボタンを おすと ひびが はいるよ！',
      'gacha.pull': 'ひらく！',
      'gacha.again': 'もう一回',
      'gacha.viewCollection': 'コレクションをみる',
      'gacha.cardGet': 'カードを 1まい ゲット！',
      'gacha.xpPack': 'XPパック',
      'gacha.xpPackKind': '+{n} XP を ゲット！',
      'gacha.bonusLabel': 'ボーナス',
      'gacha.notEnoughToast': 'コインが たりないよ（あと {n} コイン）',

      /* ランクアップ */
      'levelup.kicker': 'ランクアップ！！',
      'levelup.sub': 'さらに つよくなった！',
      'levelup.ok': 'ありがとう！',

      /* ミッション */
      'mission.title': 'ミッション',
      'mission.sub': 'あそびながら ミッションを クリアしよう。うけとると コインが もらえるよ。',
      'mission.topNote': 'かんりょうした分だけ コインが もらえる！',
      'mission.tabAll': 'ぜんぶ',
      'mission.tabClaimable': 'うけとれる',
      'mission.tabDone': 'かんりょう',
      'mission.empty': 'この カテゴリには まだ ミッションが ないよ。',
      'mission.claim': 'うけとる！',
      'mission.claimed': 'かんりょう',
      'mission.inProgress': 'しんこうちゅう',
      'mission.clearToast': 'ミッションクリア！ +{n}コイン',

      /* 設定 */
      'settings.title': 'せってい',
      'settings.sound': '効果音',
      'settings.bgm': 'BGM',
      'settings.bgmDesc': '背景音楽をならす（音楽ファイルがある場合）',
      'settings.soundDesc': 'せいかい・まちがいの音をならす',
      'settings.voice': 'よみあげ音声',
      'settings.voiceDesc': 'せいかい後に かなを よみあげる',
      'settings.reset': 'データをリセットする',
      'settings.resetArmed': '本当にリセットする？（もう一度タップ）',
      'settings.resetDesc': 'セーブデータ（XP・コイン・カード・ベストスコア）をすべて消します。',
      'settings.lang': '言語 / Language',
      'settings.langJa': '日本語',
      'settings.langZh': '中文',

      /* トースト */
      'toast.cardGet': 'カードゲット！「{name}」',

      /* フッター */
      'footer.copy': '五十音クエスト — スマホ・タブレット・PCであそべます',
      'footer.note': '『ジョジョの奇妙な冒険』『呪術廻戦』の登場人物・技名等は各作品の権利者に帰属します。本作は非公式の学習用ファンメイドアプリです。',

      /* 言語トグル */
      'lang.toggle': '中文',
      'lang.toggleAria': '言語を切り替える',

      /* aria（読み上げ） */
      'aria.sectionHome': 'ホーム',
      'aria.sectionQuiz': 'クイズ',
      'aria.sectionChart': 'ごじゅうおん表',
      'aria.sectionCollection': 'コレクション',
      'aria.sectionMissions': 'ミッション',
      'aria.rankGauge': 'ランクゲージ',
      'aria.nextRankGauge': '次のランクまで',
      'aria.animeFilter': '作品フィルター',
      'aria.levelFilter': 'レベルフィルター',
      'aria.scriptFilter': '文字の種類',
      'aria.missionTabs': 'ミッションのしめきり',
      'aria.newName': '新しい名前',
      'aria.resultStars': '獲得した星',
    },

    zh: {
      /* 標題列 */
      'nav.home': '返回首頁',
      'missions.bell': '打開任務',
      'settings.open': '設定',
      'coins.tip': '金幣（玩就會賺到）',
      'stars.tip': '收集的星星',
      'correct.tip': '累計答對數',
      'rank.tip': '玩家等級',

      /* 首頁：主視覺 */
      'hero.badge': '從動漫開始學 平假名×片假名',
      'hero.sub1': '《JOJO的奇妙冒險》《咒術迴戰》的',
      'hero.sub2': '角色名與招式名…',
      'hero.sub2b': '全都打亂了！',
      'hero.sub3': '把它們依正確順序排回去，成為五十音大師！',
      'hero.cta.play': '馬上開始玩',
      'hero.cta.chart': '查看五十音表',
      'hero.feat1': 'JOJO＆咒術迴戰 全 {count} 題',
      'hero.feat2': '任務＆扭蛋可以賺金幣',
      'hero.feat3': '12 張獎勵卡',

      /* 首頁：個人資料 */
      'profile.correct': '答對',
      'profile.bestStreak': '最高連勝',
      'profile.stars': '星星',
      'profile.cards': '卡片',
      'profile.editName': '重新命名',
      'profile.saveName': '儲存',
      'profile.nextRank': '還差 {xp} XP 升級「{name}」',
      'profile.maxRank': '已達最高等級！',

      /* 每日挑戰橫幅 */
      'daily.kicker': '今天的 每日挑戰',
      'daily.title': '5 題挑戰，特別獎勵！',
      'daily.desc': '通關即可得 +50 XP 和星星。零失誤獲 3 星！',
      'daily.clearedTitle': '今天已挑戰完成！',
      'daily.clearedDesc': '辛苦了！明天再來挑戰吧。',
      'daily.cta': '開始',
      'daily.clearedCta': '複習',
      'daily.streak': '連續 {n} 天通關',

      /* 任務橫幅 */
      'strip.kicker': '任務',
      'strip.default': '新任務在等你喔',
      'strip.claimable': '有 {n} 個任務可以領取了！',
      'strip.cta': '看看',

      /* 模式卡 */
      'mode.practice.name': '排列練習',
      'mode.practice.desc': '可選作品、難度、文字（平假名／片假名），慢慢練習。',
      'mode.practice.meta': '無限次挑戰',
      'mode.ta.name': '限時挑戰',
      'mode.ta.desc': '60 秒內能解幾題？連續答對得高分＋星星！',
      'mode.ta.metaLabel': '最佳成績',
      'mode.chart.name': '五十音表',
      'mode.chart.desc': '點一下就能聽到發音！平假名・片假名・濁音・拗音。',
      'mode.chart.meta': '附發音語音指引',
      'mode.collection.name': '收藏冊',
      'mode.collection.desc': '累計答對可解鎖獎勵卡！也可以用金幣抽扭蛋。',
      'mode.collection.metaSuffix': ' / 12 張已收集',

      /* 測驗共用 */
      'quiz.back': '返回',
      'quiz.practice': '排列練習',
      'quiz.timeattack': '限時挑戰',
      'quiz.daily': '每日挑戰',
      'quiz.streakTitle': '連續答對',
      'quiz.scoreTitle': '分數',
      'quiz.timerTitle': '剩餘時間',
      'quiz.question': '第 {n} 題',
      'quiz.dailyProgress': '第 {n} / 5 題',

      /* 設定面板 */
      'setup.title': '出題設定',
      'setup.taTitle': '限時挑戰 設定',
      'setup.dailyTitle': '每日挑戰',
      'setup.work': '作品',
      'setup.level': '難度',
      'setup.script': '文字',
      'setup.all': '全部',
      'setup.jojo': 'JOJO',
      'setup.jjk': '咒術迴戰',
      'setup.lv1': 'Lv.1 簡單',
      'setup.lv2': 'Lv.2 普通',
      'setup.lv3': 'Lv.3 困難',
      'setup.katakana': '片假名',
      'setup.hiragana': '平假名',
      'setup.lockNote': '今天的 5 題是從題庫全部抽出來的。只有「文字」可以選！',
      'setup.listeningLock': '聽音挑戰從題庫全部出題。請選擇平假名或片假名。',
      'setup.note': '讀一下提示文字，把字元方塊照正確順序點過去。「・」和「＆」不會移動喔。',
      'setup.start': '開始',
      'setup.taStart': '開始！ 限時 60 秒',
      'setup.dailyStart': '開始每日挑戰！',

      /* 遊玩區 */
      'play.hintOpen': '提示：顯示羅馬字',
      'play.hintClose': '提示：收起羅馬字',
      'play.romajiHint': '提示（羅馬字）：{en}',
      'play.wrong': '差一點！再排一次看看',
      'play.fixed': '固定字元',
      'play.slotAria': '空格',
      'play.slotFilled': '移除 {kana}',
      'play.tileAria': '字元 {kana}',

      /* 作答揭曉 */
      'reveal.correct': '答對了！',
      'reveal.speak': '朗讀',
      'reveal.next': '下一題',
      'reveal.toResult': '看結果',
      'reveal.goldBonus': '閃閃發光獎勵！',
      'reveal.comboStreak': '連勝 {n}',
      'play.replay': '聽讀音',
      'cutin.kicker': '招式發動！',
      'cutin.skip': '點擊繼續',
      'cutin.region': '招式攻擊插圖',

      /* 聽音挑戰 */
      'listening.bestCombo': '最高連擊',
      'listening.correctCount': '答對題數',
      'listening.heartsAria': '剩餘愛心',
      'listening.gameOver': '遊戲結束',
      'listening.overSub': '愛心用完了……',
      'listening.quitSub': '聽音挑戰的成果結算！',
      'mode.listening.name': '聽音挑戰',
      'mode.listening.desc': '聽讀音，把打散的假名照正確順序排回去。可選平假名或片假名。愛心共 3 顆。',
      'mode.listening.meta': '無限時・答錯 3 次結束',

      /* 結算 */
      'result.taUp': '時間到！',
      'result.dailyClear': '每日挑戰 通關！',
      'result.dailyReview': '複習通關！',
      'result.taNewRecord': '新紀錄，恭喜！',
      'result.taBest': '最佳成績：{score} pt',
      'result.dailyBonus': '獎勵 +50 XP ・ 已連續挑戰 {n} 天！',
      'result.dailyReviewSub': '今日已領取通關獎勵。通關星星與全對加碼每日限領一次。',
      'result.quit': '辛苦了！',
      'result.quitTa': '限時挑戰結束了！',
      'result.quitPractice': '練習成果結算！',
      'result.score': '分數',
      'result.correct': '答對',
      'result.correctCount': '{n} 題',
      'result.correctOf': '{n} / 5 題',
      'result.miss': '失誤',
      'result.missCount': '{n} 次',
      'result.xp': '獲得 XP',
      'result.coins': '獲得金幣',
      'result.stamp': '通關！',
      'result.dailyStreak': '連續通關',
      'result.dailyStreakDays': '{n} 天',
      'result.retry': '再玩一次',
      'result.retryQuit': '繼續玩',
      'result.home': '返回首頁',
      'result.perfect': ' ★全對',

      /* 五十音表 */
      'chart.title': '五十音表',
      'chart.sub': '點一下方格就能聽到發音。「濁音」「拗音」也來挑戰看看！',
      'chart.hiragana': '平假名',
      'chart.katakana': '片假名',
      'chart.cellAria': '{kana}，聽發音',

      /* 收藏冊 */
      'collection.title': '收藏冊',
      'collection.sub': '累計答對即可解鎖獎勵卡。也能用金幣抽扭蛋！',
      'collection.progressSuffix': '/ 12 張',
      'collection.next': '距離下一張「{name}」還差 {n} 題',
      'collection.complete': '全蒐集完成！恭喜！',
      'collection.get': '已蒐集！',
      'collection.locked': '？？？',
      'collection.need': '答對 {n} 題即可解鎖',
      'collection.detailGot': '答對 {n} 題・已經蒐集！',
      'collection.detailLocked': '平假名或片假名答對 {n} 題即可解鎖！（目前 {m} 題）',
      'collection.hiddenDesc': '這張卡還隱藏著喔。',

      /* 扭蛋 */
      'gacha.title': '寶箱扭蛋',
      'gacha.sub': '從未蒐集的卡中隨機抽 1 張！',
      'gacha.noCoins': '金幣不夠（還差 {n} 枚）',
      'gacha.coins': '金幣',
      'gacha.hint': '按下按鈕，寶箱就會裂開！',
      'gacha.pull': '開箱！',
      'gacha.again': '再開一次',
      'gacha.viewCollection': '查看收藏',
      'gacha.cardGet': '獲得 1 張卡片！',
      'gacha.xpPack': 'XP 禮包',
      'gacha.xpPackKind': '獲得 +{n} XP！',
      'gacha.bonusLabel': '獎勵',
      'gacha.notEnoughToast': '金幣不夠（還差 {n} 枚）',

      /* 等級提升 */
      'levelup.kicker': '等級提升！',
      'levelup.sub': '又變強了！',
      'levelup.ok': '謝謝！',

      /* 任務 */
      'mission.title': '任務',
      'mission.sub': '一邊玩一邊完成任務，領取金幣獎勵！',
      'mission.topNote': '完成任務就能領金幣！',
      'mission.tabAll': '全部',
      'mission.tabClaimable': '可領取',
      'mission.tabDone': '已完成',
      'mission.empty': '這個分類還沒有任務喔。',
      'mission.claim': '領取！',
      'mission.claimed': '已完成',
      'mission.inProgress': '進行中',
      'mission.clearToast': '任務達成！ +{n} 金幣',

      /* 設定 */
      'settings.title': '設定',
      'settings.sound': '音效',
      'settings.bgm': '背景音樂',
      'settings.bgmDesc': '播放背景音樂（補上音樂檔後啟用）',
      'settings.soundDesc': '播放答對／答錯的音效',
      'settings.voice': '朗讀發音',
      'settings.voiceDesc': '答對後朗讀假名',
      'settings.reset': '重置所有資料',
      'settings.resetArmed': '真的要重置嗎？（再按一次）',
      'settings.resetDesc': '將清除所有存檔（XP・金幣・卡片・最高紀錄）。',
      'settings.lang': '語言 / Language',
      'settings.langJa': '日本語',
      'settings.langZh': '中文',

      /* 提示 */
      'toast.cardGet': '獲得卡片！「{name}」',

      /* 頁尾 */
      'footer.copy': '五十音クエスト — 手機・平板・電腦都能玩',
      'footer.note': '《JOJO的奇妙冒險》《咒術迴戰》等登場人物與技名歸原作者所有。本作為非官方學習用同人作品。',

      /* 語言切換 */
      'lang.toggle': '日本語',
      'lang.toggleAria': '切換語言',

      /* aria（讀屏） */
      'aria.sectionHome': '首頁',
      'aria.sectionQuiz': '測驗',
      'aria.sectionChart': '五十音表',
      'aria.sectionCollection': '收藏冊',
      'aria.sectionMissions': '任務',
      'aria.rankGauge': '等級進度條',
      'aria.nextRankGauge': '距離下一等級',
      'aria.animeFilter': '作品篩選',
      'aria.levelFilter': '難度篩選',
      'aria.scriptFilter': '文字種類',
      'aria.missionTabs': '任務分類',
      'aria.newName': '新名字',
      'aria.resultStars': '獲得的星星',
    },
  };

  function t(key, vars) {
    const table = DICT[locale] || DICT.ja;
    let str = table[key];
    if (str === undefined) str = DICT.ja[key];
    if (str === undefined) return key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
      }
    }
    return str;
  }

  // データ駆動テキストの切り替え（例：I18N.tf(mission, 'title') → ja: 'title' / zh: 'titleZh'）
  function tf(obj, field) {
    if (!obj) return '';
    if (locale === 'zh' && obj[field + 'Zh'] !== undefined) return obj[field + 'Zh'];
    return obj[field];
  }

  function get() { return locale; }

  const localeListeners = [];
  function onLocaleChange(fn) { localeListeners.push(fn); }

  function apply() {
    document.documentElement.lang = locale === 'zh' ? 'zh-Hant' : 'ja';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.setAttribute('title', t(el.dataset.i18nTitle)); });
    document.querySelectorAll('.lang-switch-btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.locale === locale);
      b.setAttribute('aria-checked', b.dataset.locale === locale ? 'true' : 'false');
    });
    localeListeners.forEach((fn) => { try { fn(); } catch (e) { console.warn('locale listener failed', e); } });
  }

  function setLocale(next) {
    locale = next === 'zh' ? 'zh' : 'ja';
    try { localStorage.setItem(STORAGE_KEY, locale); } catch (e) { /* ignore */ }
    apply();
  }

  function init() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    if (saved === 'zh' || saved === 'ja') {
      locale = saved;
    } else {
      const nav = (navigator.language || '').toLowerCase();
      locale = nav.startsWith('zh') ? 'zh' : 'ja';
    }
    apply();
  }

  return { t, tf, get, setLocale, init, onLocaleChange };
})();
