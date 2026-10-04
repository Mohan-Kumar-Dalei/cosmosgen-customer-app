import { View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { AiMark } from "../../src/Marks";
import { CustomerTabBar } from "../../src/TabBar";
import { useSession } from "../../src/session";
import { useColors } from "../../src/theme";
import { Wash } from "../../src/Wash";

/**
 * The five places this app goes.
 *
 * Home is what is happening now and the whole shop front, Your jobs is
 * everything asked for so far, the assistant answers a question before it
 * becomes a booking, and Account is the door and the details behind it.
 *
 * Services was taken out of the bar once, on the grounds that the catalogue
 * also opens on the home screen and four wider targets beat five narrow ones.
 * It never actually left - see the note on the screen below - and it has
 * earned its place back: the shelf now carries a card per machine as well as
 * per trade, which is more than the home screen's grid shows.
 */
export default function TabsLayout() {
    const colors = useColors();
    const { customer, ready } = useSession();

    // Somebody who signed out while sitting on a tab is put back at the door
    // rather than left on a screen that can no longer fetch anything.
    if (ready && !customer) return <Redirect href="/welcome" />;

    return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            {/*
              * One wash for the whole tab bar's worth of screens.
              *
              * It used to be drawn inside each page, which meant five
              * full-screen SVGs alive at once - the tabs are kept mounted so
              * that they can animate - and every switch had to lay one of them
              * out again. That was the pause between pressing a tab and the
              * page actually moving. Here it is drawn once, behind all of
              * them, and the scenes are transparent over it.
              */}
            <Wash />

            <Tabs
                /*
                 * Android detaches inactive tabs by default, which leaves the
                 * navigator with no outgoing screen to move - so `animation`
                 * does nothing at all. Keeping them attached is what makes the
                 * transition possible; freezeOnBlur is what pays for it, by
                 * stopping the ones nobody is looking at from re-rendering.
                 *
                 * The transition was taken out once, to stop the dark smudge
                 * that flickered on the way out of the account tab, and put
                 * back: the movement is what makes the app feel like something
                 * somebody built rather than a set of pages. The smudge was
                 * never the animation - it was the Android elevation on the
                 * cards being composited against a transparent scene while it
                 * faded. That is fixed where it belongs, in shadowFor() in
                 * src/theme.js, and the transition can stay.
                 */
                detachInactiveScreens={false}
                screenOptions={{
                    headerShown: false,
                    freezeOnBlur: true,
                    animation: "shift",

                    // Transparent, so the single wash above shows through. The
                    // navigator's own default here is white, which is what used
                    // to flash between tabs.
                    sceneStyle: { backgroundColor: "transparent" },

                    // `tabBarHideOnKeyboard` belongs here and did nothing: it
                    // is read by the navigator's own bar, and this app draws
                    // its own. The bar takes itself off the screen instead -
                    // see src/TabBar.js.
                }}
                tabBar={(props) => <CustomerTabBar {...props} />}
            >
                <Tabs.Screen name="index" options={{ title: "Home", tabBarIconName: "home" }} />

                {/*
                  * Back in the bar, with an icon of its own.
                  *
                  * This was declared `href: null` - routable, but meant to be
                  * hidden, because the catalogue also opens on the home screen.
                  * The bar draws it anyway: expo-router consumes `href` for its
                  * own routing and does not leave it on `options`, so the
                  * filter in TabBar.js that looks for it never matched, and
                  * Services arrived with no `tabBarIconName` and fell back to
                  * the placeholder circle Mohan photographed.
                  *
                  * Naming the icon rather than chasing the filter, because the
                  * tab turns out to be wanted: he asked for the circle to be
                  * replaced, not for the tab to go. The whole catalogue,
                  * machines included, is a real second place in this app.
                  */}
                <Tabs.Screen name="services" options={{ title: "Services", tabBarIconName: "grid-line" }} />

                {/*
                  * The assistant sits in the middle, which is why it is
                  * declared third - the bar draws these in the order they are
                  * written, and the middle one is the raised circle.
                  */}
                <Tabs.Screen name="ask" options={{ title: "Ask AI", tabBarMark: AiMark }} />
                <Tabs.Screen name="jobs" options={{ title: "Bookings", tabBarIconName: "calendar" }} />
                <Tabs.Screen name="account" options={{ title: "Account", tabBarIconName: "user" }} />
            </Tabs>
        </View>
    );
}
