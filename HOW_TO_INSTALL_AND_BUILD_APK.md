# THE ALPHA PULSE — GITHUB PAGES & ZERO-HISTORY INSTALLATION GUIDE
**Created for: Er. Rizwan Ahmad**
**Project:** THE ALPHA PULSE — Institutional Trading Screener & Mobile PWA

---

## 🌐 STEP 1: HOST 100% FREE ON GITHUB PAGES (UNLIMITED DEPLOYS)
Netlify ki monthly free tier limit exhaust ho gayi hai, isliye ab hum **GitHub Pages** use kar rahe hain jo **100% free, unlimited traffic aur zero deployment limit** provide karta hai.

### 4 Simple Steps to Deploy on GitHub:
1. Open [GitHub.com](https://github.com/) on your laptop and log in.
2. Click the **"+"** icon in the top right -> select **"New repository"**.
   - Repository name: `the-alpha-pulse` (ya koi bhi manpasand naam).
   - Select **Public** (GitHub Pages free accounts ke liye repository Public honi chahiye).
   - Click **"Create repository"**.
3. Unzip `AlphaPulse_PWA_Mobile_Bundle.zip` on your laptop:
   - GitHub repo page par **"uploading an existing file"** par click karein.
   - Bundle ke saare files drag & drop karein:
     * `index.html`
     * `manifest.json`
     * `sw.js`
     * `.nojekyll`
     * `icons/` folder (saare 5 PNG icons ke saath)
   - Bottom me **"Commit changes"** button dabayein.
4. Enable GitHub Pages:
   - Repo ke top menu me **"Settings"** tab par jayein.
   - Left sidebar me **"Pages"** par click karein.
   - "Build and deployment" -> Source me select karein: **Deploy from a branch**.
   - Branch: **main** | Folder: **/ (root)**.
   - Click **"Save"**.
   - 60 seconds ke andar aapka live link activate ho jayega:
     `https://<your-username>.github.io/the-alpha-pulse/`

---

## 🔒 ZERO-HISTORY PRIVACY GUARANTEE (CHROME BROWSER)
Aapne poocha ki Chrome browser me koi history na bane — iske liye humne 3-layer security implement ki hai:

1. **Standalone PWA / Android APK Mode (Best & Zero History)**:
   - Jab aap terminal ko phone par "Install" karte hain ya PWABuilder se APK bana kar phone me chalate hain, toh ye Chrome browser ke regular tabs se bahar ek **isolated native app window** me run karta hai (`display: standalone`).
   - **Isme Chrome ki regular browsing history (`chrome://history`) me 1 bhi entry nahi banti!** Ye ekdam clean aur private rehta hai.

2. **In-App Zero-History Code Guard**:
   - `window.history.pushState` ko override karke `replaceState` par lock kar diya gaya hai.
   - App ke andar Overview, Option Chain, Screener tabs switch karne ya chart dekhne par Chrome ke back-forward stack me koi history entries add nahi hoti.
   - FYERS login ke baad `auth_code` ya token turant URL bar se wipe out ho jata hai.
   - `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">` aur `no-referrer` meta tags Chrome ko cache aur external tracking save karne se rokte hain.

3. **Chrome Web Browser Me Direct Open Karne Par**:
   - Web browser security standards ke mutabiq, koi bhi website user ke Chrome browser ki global history ko code ke through clear nahi kar sakti (Google Chrome safety feature).
   - Agar aap laptop ya mobile Chrome me directly chalana chahte hain aur chahte hain ki visit history bhi record na ho, toh bas **Chrome Incognito (Private) Window** me link open karein (`Ctrl + Shift + N`).

---

## 📱 STEP 2: BUILD DIRECT ANDROID `.APK` FILE (PWABUILDER)
1. Go to: [https://www.pwabuilder.com/](https://www.pwabuilder.com/)
2. Apni new GitHub Pages URL enter karein:
   `https://<your-username>.github.io/the-alpha-pulse/`
3. Click **"Start"** (Manifest aur Icons 100% compliant pass honge).
4. Click **"Package for Stores"** -> Select **"Android"**.
5. Select **"Download APK"** — 1 minute me aapka signed `.apk` file download ho jayega.
6. Apne Android phone me install karein (agar purana APK installed ho toh pehle use uninstall kar lein).