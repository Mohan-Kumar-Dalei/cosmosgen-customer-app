import { useEffect } from "react";
// The navigation theme comes from expo-router rather than
// @react-navigation/native: expo-router carries its own copy of the navigator,
// and importing that package directly pulls in a second one that is not
// installed.
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import {
    Outfit_600SemiBold,
    Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AreaProvider } from "../src/area";
import { usePushRegistration } from "../src/push";
import { SessionProvider } from "../src/session";
import { JobsProvider } from "../src/jobs";
import { NoticesProvider } from "../src/notices";
import { BookmarksProvider } from "../src/bookmarks";
import { FiltersProvider } from "../src/filters";
import { Broke } from "../src/Broke";
import { watchForCrashes } from "../src/watch";
import { OfflineBar } from "../src/Offline";
import { ThemeProvider, useColors, useScheme } from "../src/theme";

// Held open until the faces are in, so a heading does not appear in the system
// font for a frame and then jump when Outfit arrives.
SplashScreen.preventAutoHideAsync().catch(() => { /* already hidden */ });

/*
 * Before anything renders, so a fault on the way up is caught too.
 *
 * `ErrorBoundary` below covers drawing. This covers the rest - a throw in a
 * press handler, a timer, a socket callback, an await nobody caught - which
 * blanks nothing and so was never reported by anybody. A dead button is a
 * worse bug than a crash screen precisely because nobody thinks to mention it.
 */
watchForCrashes();

/**
 * Anything that throws while drawing lands here instead of taking the app down.
 *
 * Expo Router looks for this export by name. Exported from the root layout so
 * it covers every screen: a fault in one of them should cost that screen and
 * nothing else, and the customer should be given words and a button rather than
 * a white rectangle they have to force-stop.
 *
 * It does not catch what happens outside drawing - a failed request, a socket
 * that dies - and it should not: those are answered where they happen, by the
 * screens that know what they were doing. What nobody answered used to vanish
 * entirely; `watchForCrashes` above now reports those without putting anything
 * on the screen, because an invisible fault should stay invisible to the
 * customer and stop being invisible to us.
 */
export function ErrorBoundary({ error, retry }) {
    return <Broke error={error} retry={retry} />;
}

export default function RootLayout() {
    const [fontsReady] = useFonts({
        Outfit_600SemiBold,
        Outfit_700Bold,
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
    });

    useEffect(() => {
        if (fontsReady) SplashScreen.hideAsync().catch(() => { /* already hidden */ });
    }, [fontsReady]);

    if (!fontsReady) return null;

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <SessionProvider>
                    <JobsProvider>
                        {/* Inside the session, because the unread count is
                            per customer and there is nothing to fetch until
                            somebody is signed in. Outside every screen,
                            because the bell is drawn on all of them. */}
                        <NoticesProvider>
                            <BookmarksProvider>
                                <FiltersProvider>
                                    <AreaProvider>
                                        <Shell />
                                    </AreaProvider>
                                </FiltersProvider>
                            </BookmarksProvider>
                        </NoticesProvider>
                    </JobsProvider>
                </SessionProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

/**
 * Everything that needs the palette, which the provider above cannot give to
 * itself: a component cannot read a context it is itself providing.
 */
const Shell = () => {
    /*
     * Ask for the notification permission once somebody is signed in, and hand
     * the server the token. Everything about it is optional - see src/push.js.
     */
    usePushRegistration();

    const colors = useColors();
    const scheme = useScheme();

    /*
     * The window behind everything, painted the page's own colour.
     *
     * The black blink between screens was never the screens: it is the Android
     * window itself showing through for the frame or two where one native
     * screen has gone and the next has not drawn. `backgroundColor` in app.json
     * cannot help - it is baked at build time and cannot follow the phone into
     * dark mode - so expo-system-ui sets it at runtime, and again whenever the
     * palette changes.
     */
    useEffect(() => {
        SystemUI.setBackgroundColorAsync(colors.canvas)
            .catch(() => { /* the flash is cosmetic; never take the app down for it */ });
    }, [colors.canvas]);

    /*
     * React Navigation paints its own ground behind every screen, and its
     * default is white. Left alone, that white shows through for the length of
     * every transition whatever colour the screens themselves are.
     */
    const navTheme = {
        ...(scheme === "dark" ? DarkTheme : DefaultTheme),
        colors: {
            ...(scheme === "dark" ? DarkTheme : DefaultTheme).colors,
            background: colors.canvas,
            card: colors.surface,
            text: colors.ink,
            border: colors.hairline,
            primary: colors.accent,
        },
    };

    return (
        <NavTheme value={navTheme}>
            <StatusBar style={scheme === "dark" ? "light" : "dark"} />

            {/* Over every screen, including the ones outside the tabs */}
            <OfflineBar />

            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.canvas },

                    /*
                     * A push that never shows what is behind it.
                     *
                     * "default" was the black blink between pages. It is not a
                     * translation: read
                     * react-native-screens/android/.../anim/rns_default_enter_in.xml
                     * and the incoming screen comes in from alpha 0 at 85%
                     * scale while the outgoing one fades to 0.4 and scales to
                     * 115%. For those two hundred milliseconds both screens are
                     * part transparent, so whatever the fragment container sits
                     * on shows through the middle of the transition - and under
                     * Expo Go that is the host window, which is black. No
                     * background colour of ours can cover that, because the
                     * thing showing through is behind all of them.
                     *
                     * "ios_from_right" is four plain translates with no alpha
                     * anywhere: the new screen comes across at full opacity
                     * while the old one drifts 30% to the left behind it. The
                     * two always overlap, so there is no frame with a gap in it
                     * to flash.
                     *
                     * It also has a way back, which is what the note that used
                     * to sit here doubted. The mapping registers each animation
                     * twice, once for the push and once for the pop
                     * (react-native-screens utils/FragmentTransactionKt.kt):
                     * the pop branch plays background_close and
                     * foreground_close, so going back reverses rather than
                     * replaying the forward move.
                     */
                    animation: "ios_from_right",
                }}
            />
        </NavTheme>
    );
};
