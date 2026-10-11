package com.paynotify.receiver.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val BrandEmerald = Color(0xFF0D9488)
val BrandEmeraldDark = Color(0xFF0F766E)
val BgDark = Color(0xFF0F172A)
val SurfaceDark = Color(0xFF1E293B)
val TextLight = Color(0xFFF8FAFC)
val AccentAmber = Color(0xFFF59E0B)
val AccentRed = Color(0xFFEF4444)

private val DarkColorScheme = darkColorScheme(
    primary = BrandEmerald,
    secondary = Color(0xFF38BDF8),
    tertiary = AccentAmber,
    background = BgDark,
    surface = SurfaceDark,
    onPrimary = Color.White,
    onBackground = TextLight,
    onSurface = TextLight
)

private val LightColorScheme = lightColorScheme(
    primary = BrandEmeraldDark,
    secondary = Color(0xFF0284C7),
    tertiary = AccentAmber,
    background = Color(0xFFF8FAFC),
    surface = Color.White,
    onPrimary = Color.White,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A)
)

@Composable
fun PayNotifyReceiverTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
