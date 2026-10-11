# PayNotify Receiver — Native Android & Firebase

Production-ready Native Android application that listens for mobile transaction SMS notifications from **bKash**, **Nagad**, **Rocket**, and **Upay**, extracts the **Transaction ID** and **exact transaction amount**, eliminates duplicates, and securely streams records to **Firebase Realtime Database**.

---

## 1. Project Specifications

| Property | Value |
|---|---|
| **Platform** | Native Android (API 26+ / Android 8.0 to Android 14+) |
| **Language** | Kotlin 1.9.24 |
| **UI Toolkit** | Jetpack Compose (Material 3) |
| **Local Persistence** | Android Room Database (SQLite) |
| **Background Sync** | WorkManager with Exponential Backoff |
| **Cloud Database** | Firebase Realtime Database |
| **Authentication** | Firebase Authentication (Anonymous Device Auth) |
| **Target Currency** | BDT (Bangladeshi Taka), stored internally as integer Poisha |
| **Supported Providers** | bKash (`16247`), Nagad (`16167`), Rocket (`16216`), Upay (`16268`) |

---

## 2. Security Trust Boundaries & Anti-Fraud Principles

1. **Strictly "Unverified" Status**:
   - Notifications and SMS sender names can be spoofed on cellular networks or manipulated.
   - The application **NEVER** marks a transaction as `verified` or `successful`.
   - Every record ingested into Firebase carries `verificationStatus: "unverified"`.
   - Financial approval logic must live on a secure backend (e.g., verifying with official provider merchant APIs).

2. **Data Minimization**:
   - Full SMS text and sensitive personal messages are **never** uploaded to Firebase.
   - Only parsed financial parameters (`recordId`, `paymentMethod`, `transactionId`, `amountPoisha`, `currency`, `notificationTimestamp`, `deviceId`) are transmitted.

3. **Client-Side & Cloud Security Rules**:
   - Firebase Realtime Database Security Rules (`database.rules.json`) reject any client write attempting to set `verificationStatus: "verified"`.
   - Overwriting existing records is strictly blocked.

---

## 3. How to Build the APK

### Prerequisites
- **JDK 17** (OpenJDK 17 recommended)
- **Android SDK** with build-tools `34.0.0`
- **Android Studio** Hedgehog / Iguana / Jellyfish (or Gradle CLI)

### Building via Terminal
```bash
cd android

# Make Gradle wrapper executable
chmod +x gradlew

# Run Unit Tests (includes all 19 provider test scenarios)
./gradlew test

# Build Debug APK
./gradlew assembleDebug

# Output APK Location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Firebase Setup & Configuration

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. **Add Android App**:
   - Package name: `com.paynotify.receiver`
   - Download the generated `google-services.json` and replace `android/app/google-services.json`.
3. **Enable Firebase Authentication**:
   - Go to **Authentication** > **Sign-in method** > Enable **Anonymous** provider.
4. **Deploy Realtime Database Security Rules**:
   - Go to **Realtime Database** > **Rules** and paste the content of `android/database.rules.json`.

---

## 5. Granting Android Notification Access

To capture SMS receipts from the user's messaging app:
1. Open **PayNotify Receiver** on your Android device.
2. The home screen will show a red prompt: `Notification Access Required`.
3. Tap **Grant**.
4. In the Android system settings menu (`Special app access` > `Notification access`), toggle **PayNotify Receiver** to **Allowed**.
5. Return to the app; the status badge will turn green: `Listener Active & Background Monitoring`.

---

## 6. Known Android Notification Limitations & OEM Configurations

Android's aggressive battery management can throttle background listener services on specific manufacturer skins. To ensure 24/7 reliability:

1. **Samsung (OneUI)**:
   - Go to *Settings > Apps > PayNotify Receiver > Battery > Unrestricted*.
   - Ensure app is removed from *Sleeping apps* and *Deep sleeping apps*.
2. **Xiaomi (MIUI / HyperOS)**:
   - Go to *App Info > Autostart > Enable*.
   - Set *Battery saver > No restrictions*.
3. **Oppo / Realme (ColorOS)**:
   - Enable *Auto-launch* and *Allow background activity*.
4. **Bundled Notifications**:
   - When multiple SMS messages arrive simultaneously, Android groups them into a bundled notification.
   - PayNotify extracts `EXTRA_TEXT_LINES` and `EXTRA_BIG_TEXT` to process each individual message line without truncation.
