# Personal Vault PWA - Sprint 4 HANDOVER

## Sprint 4 完成項目

### Bug 修復

| ID | 嚴重度 | 描述 | 修法 |
|----|--------|------|------|
| BUG-36 | High | useReminderChecker stores 未 init，通知永不 fire | 登入後檢查 unsubscribe state，若未 init 則自動 init stores |
| BUG-37 | Medium | firebase.ts deprecated enableIndexedDbPersistence | 改用 initializeFirestore + persistentLocalCache + persistentMultipleTabManager |
| BUG-39 | Medium | MealPlanner removeSlot globalIdx 計算錯誤 | 用 counter-based findIndex 正確找到 per-day index |
| BUG-40 | Low | Notification fired keys 永不清除 | 加入 pruneOldFiredKeys()（7日截止），在 checker mount 時執行 |
| L-02 | Low | saveMealPlan 覆蓋 createdAt | 檢查 doc 存在後選擇 updateDoc 或 setDoc |

### 新功能

| ID | Feature | 說明 |
|----|---------|------|
| F-25 | 書籤 Reading List | BookmarksPage 未讀 filter chip + 計數徽章，BookmarkCard 已讀/未讀 toggle（已讀標題半透明） |
| F-26 | Quick Capture FAB | HomePage 浮動 FAB，點擊彈出面板，支援 note/bookmark 模式，鍵盤 Enter 提交 |

---

## 已知 Bugs（未修）

| ID | 嚴重度 | 描述 | 位置 |
|----|--------|------|------|
| BUG-38 | Medium | unlock() first-time verifier save 邏輯脆弱 | stores/passwordStore.ts |

---

## Risky Patterns（已識別）

| ID | 描述 | 位置 |
|----|------|------|
| R-01 | masterPassword 明文存 Zustand state（DevTools 可見） | stores/passwordStore.ts |
| R-02 | BrowserRouter + basename — GitHub Pages subpath 直接 URL 訪問會 404 | App.tsx |
| R-03 | HIBP breach check 冇 retry logic，50+ 密碼可能觸發 rate limit | lib/breach.ts |
| R-05 | WikiLink click 唔檢查 unsaved changes 直接關閉 modal | components/NoteModal.tsx |

---

## Logic Issues（已識別）

| ID | 描述 |
|----|------|
| L-01 | HomePage + useReminderChecker 重複訂閱同一批 Firestore data（可接受，initFirestore 內部 idempotent） |
| L-03 | scorePassword 5 個 condition 但上限 min(4, score)，邏輯唔直觀 |
| L-04 | HomePage theme toggle 只係 light dark，唔支援回到 system |

---

## 重要技術規則

1. tsc --noEmit 必須零錯誤先 build — noUnusedLocals + noUnusedParameters 係 hard error
2. 唔用 sed -i 做多行改動 — 用 Python script
3. 唔用 Tailwind 顏色 class — 全部用 inline style={{}} 或 CSS variables
4. React hooks 必須係 conditional return 之前
5. HTML form tag 唔用 — 全部用 onClick handler
6. Emoji 寫入文件用 Python，唔用 str_replace
7. Share URL 必須用 import.meta.env.VITE_BASE_PATH
8. Firestore updateDoc 清除 optional field 用 deleteField()
9. user state 係三態：undefined（載入中）| User（已登入）| null（未登入）
10. TOTP 係純 Web Crypto API — 唔用任何 npm TOTP library（會引入 Node.js buffer → 白屏）
11. BrowserRouter + GitHub Pages = 404（R-02，將來需改 HashRouter）

---

## Sprint 5 規劃

### 高優先新功能

- F-27: Reminder Snooze — notification 可以 snooze 30min/1hr
- F-28: WikiLink Backlinks — 筆記底部顯示被哪些筆記連結
- F-29: Countdown 月曆視圖 — 列表/月曆 toggle

### 中優先

- F-30: Meal Planner Copy Week — 一鍵複製上週計劃
- F-31: 書籤 og:image 預覽 — allorigins.win 抓 og:image
- F-32: Password 雙擊複製 — 大觸控面積
- F-33: Dashboard 統計 Widget — 各模組 item 數量

### Low Priority

- F-34: Export 包含 MealPlan — VaultExport version=3
- F-35: 筆記字數統計 — textarea 右下顯示字數

---

## 開新 Chat 時提供嘅資料

1. 呢份 HANDOVER.md
2. 最新 ZIP 包（Sprint 4 後的 src/ 資料夾）
3. 話明係「Personal Vault PWA — Sprint 5」
4. 指定想做邊個 bug fix / feature
