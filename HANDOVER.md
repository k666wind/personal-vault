# Personal Vault PWA — Sprint 6 交接文件

## 本次 Sprint 完成項目

### Bug Fixes（Sprint 6 開始前）
- **BUG-S6-01**：bookmarkService、recipeService、passwordService 的 updateDoc 由 stripUndefined 改為 prepareUpdate（deleteField() sentinel），修正清除 optional fields 失效問題
- **BUG-S6-02**：移除殘留 buffer npm dependency
- **BUG-S6-03**：移除殘留 src/types/otplib.d.ts
- **BUG-S6-04**：vite.config.ts PWA shortcuts URL 加 VITE_BASE_PATH + #/ hash prefix
- **BUG-S6-05**：HomePage 全局搜尋、收藏、最近更新 加入 passwords（只搜 site/username/tags，唔搜加密內容）
- **LOGIC-02**：Cook Mode wakeLock 已加 release + visibilitychange 重新獲取邏輯

⚠️ **LOGIC-01（Firestore Security Rules）需要手動處理** — 詳見下方「需要手動操作」

### S6-A：筆記 Markdown 工具列 ✅
NoteModal.tsx 新增 8 個按鈕：粗體、斜體、代碼、標題、清單、引用、分隔線、連結。Cursor-aware 插入邏輯支援 inline wrap 同 block insert，只在編輯模式顯示。

### S6-B：書籤 HTML 批量匯入 ✅
新檔案 src/lib/bookmarkHtmlImport.ts，parse Netscape Bookmark Format（Chrome/Firefox/Safari/Edge）。BookmarksPage 加 Import modal，重複網址自動偵測，batch import 每 10 個一批。

### S6-C：Cook Mode 全屏煮食模式 ✅
新檔案 src/components/CookMode.tsx。Wake Lock API 正確 release，每步驟獨立倒數計時器，份量縮放器，步驟進度。從 RecipeDetailModal 新增 ChefHat icon 進入。

### S6-D：通知收件匣 ✅
notifications.ts 新增 notificationLog localStorage（最多 50 筆）。新檔案 NotificationInbox.tsx。HomePage 鈴鐺加紅點 unread badge。

### S6-E：書籤封存功能 ✅
Bookmark type 加 isArchived。BookmarkCard 加封存按鈕。BookmarksPage 預設隱藏已封存，新增「封存」filter chip。

### S6-F：搜尋結果高亮 ✅
新檔案 src/lib/highlight.ts，highlightText() 用 mark wrap 匹配文字（含 HTML escape）。HomePage 全局搜尋套用。

### S6-G：筆記字數統計 ✅
NoteModal 編輯模式底部顯示字數、詞數、段落數、預計閱讀時間。

### S6-H：倒數重複週期 ✅
DateCountdown 加 recurrence 欄位。CountdownModal 加選擇 UI。CountdownCard 顯示標籤。HomePage Pinned Countdowns 用 getNextOccurrence() 自動推算下次發生日期。

### S6-I：Dashboard 區塊自訂 ✅
appStore 新增 dashboardSections（持久化）。SettingsPage 加排序 + 顯示/隱藏 toggle。HomePage 各 section 用 CSS order + display 套用。

---

## 驗證結果

- tsc --noEmit：零錯誤
- vite build：成功
- ESLint：Sprint 6 新增程式碼零錯誤；殘留錯誤均為 Sprint 5 已存在技術債（非本次引入）

---

## ⚠️ 需要手動操作

### Firestore Security Rules（LOGIC-01）
公開食譜讀取規則順序有風險，請在 Firebase Console 確認規則寫法為：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /recipes/{recipeId} {
      allow read: if resource.data.isPublic == true || request.auth != null;
      allow write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

注意：Firestore Rules 評估順序係「最具體路徑優先」，/recipes/{recipeId} 規則必須出現在 /{document=**} 之前。請手動更新並測試。

---

## 已知技術債（延續自 Sprint 5）

| 項目 | 詳情 |
|------|------|
| chunk size warning | index-*.js 1.16MB，建議 dynamic import code-split |
| window.alert() | bulk delete error 仍用 alert() |
| Date.now() purity lint | React Compiler 新規則標記多處非冪等呼叫，功能正常 |
| BrowserRouter | PWA shortcuts 已改用 hash route，建議下個 sprint 評估轉 HashRouter |
| marked v18 / @types/marked v5 版本差距 | 暫時運作正常 |

---

## 下一個 Sprint 可做（未排程）

- S6-J：書籤導出 Netscape HTML 格式
- S6-K：食譜份量縮放同步更新營養數值
- S6-L：密碼模組加密安全記事本

---

## 開新 Chat 時提供嘅資料

1. 呢份 HANDOVER.md
2. 話明係「Personal Vault PWA Sprint 7」
3. 指定想做邊個功能，或者話「先處理 Firestore Rules 同技術債」
