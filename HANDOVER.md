# Personal Vault PWA — 交接文件

## 項目概覽

個人知識庫 PWA，托管於 GitHub Pages，Firebase 後端。支援多用戶獨立登入，數據完全分開。

**Live URL 格式：** `https://<username>.github.io/<repo-name>/`

---

## Tech Stack

| 項目 | 技術 |
|------|------|
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand（persist middleware） |
| Database | Firebase Firestore（realtime） |
| Auth | Firebase Auth（Google + Email） |
| Hosting | GitHub Pages + GitHub Actions |
| PWA | vite-plugin-pwa + Workbox |
| Encryption | crypto-js（AES-256） |
| Icons | lucide-react |

---

## 項目結構

```
src/
├── types/index.ts              ← 所有 TypeScript 類型定義
├── lib/
│   ├── firebase.ts             ← Firebase 初始化（Auth + Firestore）
│   ├── bookmarkService.ts      ← Firestore CRUD（bookmarks collection）
│   ├── noteService.ts          ← Firestore CRUD（notes collection）
│   ├── recipeService.ts        ← Firestore CRUD（recipes collection）
│   ├── passwordService.ts      ← Firestore CRUD（passwords collection）
│   ├── crypto.ts               ← AES-256 加密、主密碼驗證、密碼生成
│   ├── ocr.ts                  ← Claude API OCR（文字提取、食譜提取）
│   ├── urlMeta.ts              ← URL metadata 抓取（via allorigins.win）
│   └── exportImport.ts         ← JSON/CSV 導出、JSON 匯入
├── stores/
│   ├── appStore.ts             ← 全局（user、語言、settings、recentItems）
│   ├── bookmarkStore.ts        ← 書籤 state
│   ├── noteStore.ts            ← 筆記 state
│   ├── recipeStore.ts          ← 食譜 state
│   └── passwordStore.ts        ← 密碼 state（含鎖定邏輯）
├── hooks/
│   └── useAuth.ts              ← Firebase Auth hook
├── i18n/
│   └── translations.ts         ← 繁中/英 翻譯字串
├── pages/
│   ├── LoginPage.tsx
│   ├── HomePage.tsx            ← Dashboard（搜尋、收藏、提醒）
│   ├── BookmarksPage.tsx
│   ├── NotesPage.tsx
│   ├── RecipesPage.tsx
│   ├── PasswordsPage.tsx
│   └── SettingsPage.tsx        ← 語言、API key、Export/Import
├── components/
│   ├── BottomNav.tsx
│   ├── TagInput.tsx            ← 共用標籤輸入（Enter/逗號加tag）
│   ├── OcrButton.tsx           ← 共用 OCR 按鈕
│   ├── BookmarkCard.tsx / BookmarkModal.tsx
│   ├── NoteCard.tsx / NoteModal.tsx
│   ├── RecipeCard.tsx / RecipeModal.tsx / RecipeDetailModal.tsx
│   ├── PasswordCard.tsx / PasswordModal.tsx / PasswordLockScreen.tsx
│   └── ChangeMasterPasswordModal.tsx
├── App.tsx                     ← Router（BrowserRouter + basename）
├── main.tsx
└── index.css                   ← 完整 Design System + 所有 CSS
```

---

## Firebase 設定

### Firestore Collections

| Collection | 主要 Fields |
|------------|------------|
| `bookmarks` | userId, url, title, description, favicon, tags[], isFavourite, createdAt, updatedAt |
| `notes` | userId, title, content, tags[], isFavourite, reminderAt, createdAt, updatedAt |
| `recipes` | userId, title, description, ingredients[], steps[], cookTime, prepTime, servings, difficulty, nutrition{}, tags[], isFavourite, createdAt, updatedAt |
| `passwords` | userId, site, username, encryptedPassword, notes, tags[], isFavourite, expiresAt, createdAt, updatedAt |

### 必須 Composite Indexes（Firestore Console → Indexes → Composite）

全部格式相同：`userId` ASC + `createdAt` DESC

- `bookmarks`
- `notes`
- `recipes`
- `passwords`

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### GitHub Secrets（Settings → Secrets → Actions）

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

---

## 重要技術規則

1. **絕對唔用 `sed -i` 做多行改動**——用 Python script
2. **唔用 Tailwind 顏色 class**——全部用 inline `style={{}}` 或 CSS variables
3. **React hooks 必須係 conditional return 之前**
4. **`tsc --noEmit` 必須零錯誤先 build**
5. **HTML `<form>` tag 唔用**——全部用 onClick handler
6. **Emoji 寫入文件用 Python**，唔用 str_replace
7. **useMemo dependency 用 `.map().join()` 字串**代替 array reference（避免 Firestore realtime update 唔觸發 memo）

---

## 密碼加密機制

- 用 **AES-256**（crypto-js）
- 主密碼只存 localStorage（verifier token），唔上傳 Firestore
- `encryptedPassword` 以加密後字串存 Firestore
- 更換主密碼：逐一 decrypt → re-encrypt → 更新 Firestore
- 驗證邏輯在 `src/lib/crypto.ts`：`verifyMasterPassword()`、`saveMasterVerifier()`

---

## OCR 機制

- 用 Claude API（`claude-sonnet-4-6`）
- API Key 存 localStorage（via appStore settings）
- 圖片本地讀取 → base64 → Claude API → 返回文字/JSON
- 食譜：`ocrExtractRecipe()` → 返回結構化 JSON 自動填表
- 筆記：`ocrExtractText()` → 返回純文字插入內容

---

## 已完成功能

### Phase 1 ✅
- Firebase Auth（Google + Email）
- PWA manifest + Service Worker
- 底部導航（5 tabs）
- 語言切換（繁中/英）
- Design System（CSS variables）
- GitHub Actions 自動部署

### Phase 2 ✅
- 網址收藏：完整 CRUD、自動抓 metadata、標籤、收藏、搜尋篩選

### Phase 3 ✅
- 筆記：完整 CRUD、標籤、提醒時間、Claude OCR 識字

### Phase 4 ✅
- 食譜：完整 CRUD、從圖片提取食譜（OCR）、食材份量縮放、購物清單、按食材搜尋、步驟 + 營養資料

### Phase 5 ✅
- 密碼管理：AES-256 加密、主密碼鎖屏、閒置自動鎖、密碼強度顯示、密碼生成器、一鍵複製、到期提醒

### Phase 6 ✅
- Dashboard：全局搜尋（跨模組）、收藏宮格、提醒列表
- Export/Import：JSON（完整）、CSV（網址+筆記）
- 主密碼更換（重新加密所有密碼）
- Bug fix：tag useMemo dependency 修正、詳細錯誤訊息

---

## 下一個 Phase 可以做的功能

### 🔴 高優先（實用性高）

**P7-A：Shopping List 專頁**
- 從食譜勾選食材後，匯集到獨立 Shopping List 頁面
- 按類別分組（肉類/蔬菜/調味料）
- 打剔完成後自動移除

**P7-B：密碼 TOTP / 2FA 支援**
- 儲存 TOTP secret，app 內直接生成 6 位驗證碼
- 需要 `otpauth` 或 `@otplib/preset-browser` library

**P7-C：網址截圖預覽（Cloudflare Worker）**
- 用免費 Cloudflare Worker 抓網頁 og:image
- 顯示在書籤卡片頂部

### 🟡 中優先（體驗提升）

**P7-D：全局 Tag 管理頁**
- 睇所有 tag、改名、合併、刪除
- 跨模組 tag 統計

**P7-E：深色模式（Dark Mode）**
- CSS variables 已準備好，加 `[data-theme="dark"]` selector
- Toggle 加入 Settings

**P7-F：批量操作**
- 多選 → 批量刪除 / 加 tag / 移除 tag

**P7-G：食譜分享**
- 生成公開連結（Firestore 加 `isPublic` field）
- 只讀頁面唔需要登入

### 🟢 低優先（進階功能）

**P7-H：筆記 Markdown 支援**
- 用 `marked` 或 `react-markdown` render Markdown
- 編輯模式 / 預覽模式切換

**P7-I：密碼健康報告**
- 偵測重複密碼、弱密碼、已到期密碼
- Dashboard 顯示健康分數

**P7-J：Widget / 快速新增**
- iOS/Android Home Screen Widget（需要 PWA Shortcuts API）
- 長按 App icon 快速新增筆記/書籤

---

## 開新 Chat 時提供嘅資料

1. 呢份 `HANDOVER.md`
2. 話明係「Personal Vault PWA Phase 7」
3. 指定想做邊個功能（P7-A 至 P7-J）
