# Spell Card Strike Deck Builder

スペルカードストライク (AQUA STYLE) 的 deck builder，架構沿用 WIXOSS_deckeditor（ANGE_UNITE_deckeditor 版的精簡寫法）。

直接用瀏覽器開 `index.html` 即可。

## 檔案

- `index.html` — deck builder 主頁
- `js/function.js` — 搜尋、構築、Deck Code、Comment、暗色模式
- `js/card_info.js` — 卡片資料 464 種（スペルカード 424＋オプション 40）與攻撃範囲圖
- `t/*.webp` — 160px 縮圖（牌組、搜尋結果使用）
- `cardlist.html` — 原本的「全カードリスト」索引頁（原 index.html，改名保留）
- `img/` — 空卡、箭頭等 UI 圖（從 ANGE_UNITE_deckeditor 複製）

## 構築規則（Wiki 基礎編／公式 Q&A）

- スペルカード 51 枚＋オプション 1 枚＝52 枚ちょうど
- 同じカード名（ストライカー名＋スペルカード名）3 枚まで
- エース：51 枚中的 1 張，開局裝備オプション放在場上 → 工具中分成「エース 1＋デッキ 50」

## 操作

- 點搜尋結果＝加入；Shift+點＝設為エース（原エース回到デッキ）
- 牌組內：點＝移除、Shift+點＝設為エース、右鍵＝再加一張
- オプション只能 1 張，點另一張會直接替換
- 按住 ALT 鎖定預覽

## 資料

- 來源：スペルカードストライク Wiki*（https://wikiwiki.jp/scstcg/）收錄商品頁與 SCS01～03 画像リスト
- `card_info.js` 由 cardlist.html 內的 DATA 轉出；修正 SCS02-060 Rank/POW/DEF（5 / 5/5）、`○`→`◯`、`ﾙｰﾙ`→`ルール`
- 能力欄是 Wiki 上的摘要，完整效果請看卡圖
- 大圖外連 `https://cdn.wikiwiki.jp/to/w/scstcg/SCS0x/::ref/NNN.png`（頁面設 no-referrer），讀不到時改用本機縮圖
- 召喚コスト空白＝不需符力（なし）

## localStorage key

`SCSDeckNameList`、`SCS_deck_<name>`、`<id>_SCScomment`、`scs_dark_mode`
