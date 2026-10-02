import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { ik, LOGO } from "./brand";
import { Wash } from "./Wash";
import { font, space, useThemedStyles } from "./theme";
import { Small } from "./ui";

const PLATE = 108;
const TRACK = 116;
const BAR = 46;

/**
 * What a screen shows while it is genuinely waiting.
 *
 * A bare spinner on an empty page is the moment an app stops looking like a
 * company and starts looking like a request in flight. This is the same mark
 * and the same filling line the introduction opens with, so a wait reads as
 * the app doing something rather than as nothing happening.
 *
 * The bar travels rather than fills. A progress bar that fills is a promise
 * about how long this will take, and nothing here knows that - it is one
 * request over somebody's mobile data.
 *
 * One transform on the native thread and nothing else moves, which is the only
 * kind of animation this app runs on a page that is not being touched.
 */
export const Loading = ({ label = "One moment", inline }) => {
    const s = useThemedStyles(makeStyles);

    const slide = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(slide, {
                    toValue: 1,
                    duration: 820,
                    easing: Easing.inOut(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(slide, {
                    toValue: 0,
                    duration: 820,
                    easing: Easing.inOut(Easing.cubic),
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();

        // Stopped explicitly rather than left to be collected: a loop that
        // outlives its screen keeps the UI thread awake for nobody.
        return () => loop.stop();
    }, [slide]);

    return (
        <View style={inline ? s.inline : s.root}>
            {/* A page that is already sitting on the wash does not need a
                second one drawn over it */}
            {inline ? null : <Wash />}

            <View style={s.middle}>
                <View style={s.plate}>
                    <Image
                        source={{ uri: ik(LOGO, "w-240") }}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        style={{ width: 72, height: 72 }}
                    />
                </View>

                <View style={s.track}>
                    <Animated.View
                        style={[
                            s.bar,
                            {
                                transform: [
                                    {
                                        translateX: slide.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, TRACK - BAR],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                </View>

                <Small style={s.label}>{label}</Small>
            </View>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" },
    inline: { alignItems: "center", paddingVertical: space.xxl * 1.5 },
    middle: { alignItems: "center" },

    plate: {
        width: PLATE, height: PLATE, borderRadius: 34,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        alignItems: "center", justifyContent: "center",

        shadowColor: colors.shadow,
        shadowOpacity: colors.shadowOpacity + 0.05,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },

        // iOS only, the same as every other shadow in this app - see the note
        // on shadowFor() in theme.js. This one is drawn inside a tab, so on
        // Android its elevation would smudge across a tab transition exactly
        // the way the cards' did.
        elevation: Platform.OS === "android" ? 0 : 6,
    },

    track: {
        width: TRACK,
        height: 3,
        borderRadius: 2,
        marginTop: space.xl,
        backgroundColor: colors.hairline,
        overflow: "hidden",
    },
    bar: { width: BAR, height: 3, borderRadius: 2, backgroundColor: colors.field },

    label: {
        marginTop: space.md,
        fontFamily: font.medium,
        fontSize: 12.5,
        color: colors.inkSoft,
    },
});
