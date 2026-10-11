export interface AndroidProjectFile {
  path: string;
  category: 'Configuration' | 'Parsers' | 'Service & Worker' | 'Data & Model' | 'UI & Theme' | 'Tests & Rules';
  description: string;
}

export const ANDROID_PROJECT_FILES: AndroidProjectFile[] = [
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/service/PayNotificationListenerService.kt',
    category: 'Service & Worker',
    description: 'Android NotificationListenerService capturing and ingesting live notifications.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/parser/BkashParser.kt',
    category: 'Parsers',
    description: 'bKash transaction SMS parser, extracting TrxID, Poisha, fee, balance, and filtering OTP/promos.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/parser/NagadParser.kt',
    category: 'Parsers',
    description: 'Nagad money received and cash-in parser with TxnID and amount isolation.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/parser/RocketParser.kt',
    category: 'Parsers',
    description: 'DBBL Rocket parser distinguishing 12-digit account numbers from TxnId and amounts.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/parser/UpayParser.kt',
    category: 'Parsers',
    description: 'UCB Upay received money parser and balance boundary validator.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/parser/ProviderParserFactory.kt',
    category: 'Parsers',
    description: 'Provider router with user-configurable filter switches for each payment method.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/data/remote/FirebaseRepository.kt',
    category: 'Data & Model',
    description: 'Firebase Realtime Database repository with anonymous device auth & offline persistence.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/data/model/TransactionRecord.kt',
    category: 'Data & Model',
    description: 'Room entity and Firebase payload mapping with deterministic deduplication key.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/data/local/TransactionDao.kt',
    category: 'Data & Model',
    description: 'Room DAO for local SQLite persistence, search, counts, and pending upload queues.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/worker/SyncWorker.kt',
    category: 'Service & Worker',
    description: 'WorkManager background worker with exponential backoff for offline resilience.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/ui/MainActivity.kt',
    category: 'UI & Theme',
    description: 'Jetpack Compose entry point with dashboard, records history, and diagnostics navigation.'
  },
  {
    path: 'android/app/src/main/java/com/paynotify/receiver/ui/screens/HomeScreen.kt',
    category: 'UI & Theme',
    description: 'Live dashboard with listener status, upload counters, and provider filter switches.'
  },
  {
    path: 'android/app/src/test/java/com/paynotify/receiver/parser/ParserTestSuite.kt',
    category: 'Tests & Rules',
    description: 'Automated JUnit 4 test suite covering 19 required edge cases and payment providers.'
  },
  {
    path: 'android/database.rules.json',
    category: 'Tests & Rules',
    description: 'Strict Firebase Realtime Database Security Rules enforcing unverified status and schema types.'
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    category: 'Configuration',
    description: 'Android manifest registering permissions, BootReceiver, and BIND_NOTIFICATION_LISTENER_SERVICE.'
  },
  {
    path: 'android/app/build.gradle.kts',
    category: 'Configuration',
    description: 'App Gradle build script with Compose, Room, WorkManager, and Firebase dependencies.'
  },
  {
    path: 'android/README.md',
    category: 'Configuration',
    description: 'Complete build instructions, Gradle commands, OEM battery exemption, and setup steps.'
  }
];
