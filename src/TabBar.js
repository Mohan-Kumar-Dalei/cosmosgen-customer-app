import { useEffect, useRef, useState } from "react";
import {
    Animated, Keyboard, Platform, Pressable, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, radius, space, useColors, useThemedStyles } from "./theme";
import { Icon } from "./Icon";

/*
 * One set of measurements, so nothing has to be lined up by eye.
 */
/*
 * Smaller than it was, on Mohan's reading of it.
 *
 * At 23 points with an 11 point word under it, five tabs filled the island
 * edge to edge and the bar competed with the page it sits over. A tab bar is
 * the quietest furniture in an app - it has to be findable, not read - so the
 * mark came down to 20 and the word with it, and the slot lost the two points
 * of height that were only there to hold them.
 */
const ICON = 20;
const SLOT_H = 44;
const PAD = 5;
const LIFT = 8;

/**
 * How much room the bar needs above the safe area.
 *
 * It floats over the page rather than sitting under it, so every scrolling
 * screen has to end this far above the bottom or its last card is hidden
 * behind it. Exported from here so there is one number rather than a guess in
 * each screen: the row, the padding either side of it, and the lift.
 */
export const TAB_BAR_SPACE = SLOT_H + PAD * 2 + LIFT;

/**
 * The bar along the bottom: a floating island, five icons, each named.
 *
 * This is the shape the design system asks for in as many words - "suspended
 * floating island docked 16px above the screen base" - and it took Mohan
 * saying so several times before it was built as one. It had been a
 * full-width bar sitting flush on the bottom edge, which is the Android
 * default and reads as the system's furniture rather than as part of this app.
 *
 * All five are named, all the time. An earlier version named only the tab you
 * were on, by sliding a word around above the bar: it was the nicest thing in
 * the app to look at and the wrong thing to have, because a customer opening
 * this once a quarter with a fridge that has stopped should not have to press
 * a tab to find out what it does.
 *
 * There is no blur behind it. A real backdrop blur on Android is a second
 * render pass of everything underneath, every frame, on handsets this app has
 * to keep working on - and at 95% white over warm paper the difference is a
 * tint nobody could name. The fill is solid instead.
 */
export const CustomerTabBar = ({ state, descriptors, navigation }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    /*
     * The marker travels between tabs instead of appearing on the new one.
     *
     * Two tabs changing in the same frame - one off, one on - reads as the
     * screen having been replaced. A mark that slides is the app telling you
     * where you went, and it is the only thing here allowed to move, because
     * it is navigation rather than content.
     *
     * The whole animation is a translateX on the native driver, so it runs
     * while the incoming screen is still mounting - which is exactly when the
     * JS thread has no time to spare.
     */
    /*
     * Only the routes that are meant to be in the bar.
     *
     * The navigator hands over every screen under (tabs), including the ones
     * declared with `href: null` - Services is one now, because the catalogue
     * moved onto the home screen and the screen itself is only reached through
     * "See all". React Navigation's own bar knows to skip those; this app draws
     * its own bar, so it has to skip them itself or the Services tab simply
     * comes back with a default circle for an icon.
     *
     * Everything below measures against this list rather than against
     * `state.routes`: the slot width, the marker's travel and the marker's
     * position all have to agree about how many tabs there actually are.
     */
    const tabs = state.routes.filter((route) => descriptors[route.key]?.options?.href !== null);

    // Where the focused route sits among the visible ones, which is not its
    // index in state.routes once a screen has been hidden.
    const active = Math.max(0, tabs.findIndex((route) => route.key === state.routes[state.index]?.key));

    const [width, setWidth] = useState(0);
    const slide = useRef(new Animated.Value(active)).current;

    useEffect(() => {
        Animated.spring(slide, {
            toValue: active,
            useNativeDriver: true,

            // Firm, with almost no overshoot. A marker that bounces draws the
            // eye to itself rather than to the tab it has landed on.
            stiffness: 210,
            damping: 24,
            mass: 0.8,
        }).start();
    }, [active, slide]);

    /*
     * Out of the way while somebody is typing.
     *
     * `tabBarHideOnKeyboard` is a setting on the navigator's own bar, and this
     * app draws its own - so the option was being set and quietly ignored. On
     * Android the window pans up with the keyboard, which brought the bar up
     * with it and parked it on top of the assistant's composer: the customer
     * could not see the words they were typing.
     */
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (Platform.OS !== "android") return undefined;

        const up = Keyboard.addListener("keyboardDidShow", () => setHidden(true));
        const down = Keyboard.addListener("keyboardDidHide", () => setHidden(false));

        return () => {
            up.remove();
            down.remove();
        };
    }, []);

    if (hidden) return null;

    const slot = width / Math.max(1, tabs.length);

    return (
        <View
            style={[s.dock, { paddingBottom: insets.bottom + LIFT }]}
            pointerEvents="box-none"
        >
            <View
                style={s.island}
                onLayout={(e) => setWidth(e.nativeEvent.layout.width - PAD * 2)}
            >
                {width > 0 ? (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            s.marker,
                            {
                                width: slot,
                                transform: [{
                                    translateX: slide.interpolate({
                                        inputRange: tabs.map((_, i) => i),
                                        outputRange: tabs.map((_, i) => i * slot),
                                    }),
                                }],
                            },
                        ]}
                    />
                ) : null}

                {tabs.map((route, i) => {
                    const { options } = descriptors[route.key];
                    const focused = active === i;
                    const icon = options.tabBarIconName || "circle";

                    // A tab can carry a drawn mark instead of a Feather name -
                    // the assistant has one of its own, because a speech
                    // bubble is what every other tab in this app also is.
                    const Mark = options.tabBarMark;
                    const ink = focused ? colors.field : colors.inkSoft;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: "tabPress",
                            target: route.key,
                            canPreventDefault: true,
                        });
                        if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            accessibilityRole="button"
                            accessibilityState={focused ? { selected: true } : {}}
                            accessibilityLabel={options.title}
                            android_ripple={null}
                            style={s.slot}
                        >
                            {Mark
                                ? <Mark size={ICON - 1} color={ink} />
                                : <Icon name={icon} size={ICON} color={ink} />}

                            <Text
                                numberOfLines={1}
                                style={[s.label, focused ? s.labelOn : null]}
                            >
                                {options.title}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    dock: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: space.lg,
    },

    /*
     * A pill, lifted off the bottom.
     *
     * On paper the lift comes from a shadow tinted with the accent rather than
     * with black - the design system calls it a "primary-tinted ambient
     * bounce", and against warm paper a neutral shadow under a white pill
     * reads as dirt.
     *
     * In the dark theme there is no shadow at all. A shadow is light that did
     * not reach the page, which needs a page bright enough for the absence to
     * register; on a near-black ground the same blur is a smear of colour
     * under the bar rather than a lift, and Mohan asked for it gone. What
     * separates the island there is the border and the fact that the bar is
     * lighter than the page - which is how a dark interface does elevation
     * anyway.
     */
    island: {
        flexDirection: "row",
        alignItems: "center",
        padding: PAD,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,

        ...(colors.isDark ? {
            elevation: 0,
        } : {
            shadowColor: colors.accent,
            shadowOpacity: 0.14,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 10 },

            // iOS draws from the four properties above; Android from
            // `elevation`, and the bar is one of the few places it is safe
            // here because it lives outside the tab scenes rather than inside
            // one being faded across - the case shadowFor() in theme.js
            // documents.
            elevation: 12,
        }),
    },

    /*
     * A soft pill behind the tab you are on.
     *
     * Full height of the slot and in the palest blue the system has, so it
     * marks the position without competing with the icon sitting on it - the
     * icon and its label are already in the accent, and two strong blues
     * stacked would read as a pressed button rather than as where you are.
     */
    marker: {
        position: "absolute",
        left: PAD,
        top: PAD,
        height: SLOT_H,
        borderRadius: radius.pill,
        backgroundColor: colors.accentTint,
    },

    slot: {
        flex: 1,
        height: SLOT_H,
        minWidth: 56,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
    },
    // No fixed height, and a line box with room in it. Five words of
    // different lengths in a face with real descenders will otherwise clip
    // the one word that has a 'y' in it.
    label: {
        fontFamily: font.bold,
        fontSize: 9,
        lineHeight: 12,
        letterSpacing: 0.3,
        color: colors.inkSoft,
        includeFontPadding: false,
    },
    labelOn: { color: colors.field },
});
