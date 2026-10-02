import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import * as Network from "expo-network";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, space, useColors, useThemedStyles } from "./theme";
import { Icon } from "./Icon";

/**
 * The line that says the phone has lost the internet.
 *
 * Without it every screen tells the same lie in its own words - "could not
 * read your jobs", "that did not work" - and the customer is left wondering
 * whether the company is broken. One bar at the top says the true thing once,
 * and every screen underneath keeps whatever it had loaded.
 *
 * `isInternetReachable` matters as much as `isConnected`: a phone joined to a
 * wifi that has stopped paying its bill is connected to something and can
 * reach nothing, which is the case people actually hit.
 */
export const OfflineBar = () => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();
    const network = Network.useNetworkState();

    const down = network.isConnected === false || network.isInternetReachable === false;

    /*
     * Slides in, and is the one thing in this app allowed to move on its own.
     *
     * It is not decoration: something changed on the phone and the bar is the
     * feedback for it. Appearing from nowhere at the top of a page somebody is
     * reading is what makes a banner feel like an error dialog.
     */
    const slide = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(slide, {
            toValue: down ? 1 : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [down, slide]);

    // Nothing in the tree at all while the connection is fine, so it cannot
    // catch a touch meant for the page underneath.
    if (!down) return null;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                s.bar,
                {
                    paddingTop: insets.top + space.sm,
                    opacity: slide,
                    transform: [
                        { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
                    ],
                },
            ]}
        >
            <Icon name="wifi-off" size={14} color={colors.warn} />
            <Text style={s.text}>No internet. Whatever is on screen may be out of date.</Text>
        </Animated.View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    bar: {
        position: "absolute",
        top: 0, left: 0, right: 0,
        zIndex: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space.sm,
        paddingHorizontal: space.lg,
        paddingBottom: space.sm,
        backgroundColor: colors.warnTint,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
    },
    text: {
        fontFamily: font.semibold,
        fontSize: 12.5,
        color: colors.warn,
    },
});
