# 📱 Installing DP Web on Android

You have **two easy ways** to install DP Web on your Android phone!

---

## 🚀 Option 1: Instant 1-Tap Install (PWA / WebAPK) — Recommended
*No Android Studio or PC needed! Works directly on any Android smartphone.*

1. **Open Google Chrome** on your Android phone.
2. Visit your live app URL:
   `https://ais-dev-yyxx2bhpquamxmacajy7pd-412630428646.asia-east1.run.app`
3. Tap the **3 vertical dots menu (⋮)** in the top right corner of Chrome.
4. Tap **"Add to Home screen"** or **"Install App"**.
5. Tap **"Install"**.

🎉 **Done!** DP Web is now installed as a full-screen native Android app on your phone's home screen with its own icon, high performance, camera access, and 1080×1080 HD export support!

---

## 🛠️ Option 2: Build Native Android APK / Play Store AAB (Flutter)

If you want to compile a standalone `.apk` or `.aab` file for Google Play Store using Flutter:

### Prerequisites:
- **Flutter SDK** (Version 3.0+)
- **Android Studio** with Android SDK (API 34)

### Steps to Build APK:
1. **Export Codebase**:
   - In AI Studio, click **Settings (⚙️)** in the top right -> **Export to GitHub** or **Download ZIP**.
2. **Open Flutter Project**:
   - Extract the ZIP and open the `flutter_app` directory inside Android Studio or VS Code.
3. **Get Dependencies**:
   ```bash
   cd flutter_app
   flutter pub get
   ```
4. **Build APK for Phone**:
   ```bash
   flutter build apk --release
   ```
   *Your APK will be generated at:* `flutter_app/build/app/outputs/flutter-apk/app-release.apk`
5. **Build App Bundle for Google Play Store**:
   ```bash
   flutter build appbundle --release
   ```
   *Your AAB will be generated at:* `flutter_app/build/app/outputs/bundle/release/app-release.aab`
