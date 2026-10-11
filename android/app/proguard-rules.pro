# Proguard rules for PayNotify Receiver
-keepclassmembers class * {
    @androidx.room.Entity *;
}
-keep class com.paynotify.receiver.data.model.** { *; }
-keepattributes *Annotation*
-dontwarn com.google.firebase.**
