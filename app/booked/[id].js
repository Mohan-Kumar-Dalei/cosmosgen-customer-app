import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Button, Display, Lede, Small } from "../../src/ui";
import { Icon } from "../../src/Icon";
import { Confetti } from "../../src/Confetti";

/*
 * The hand-drawn ribbons were removed from here.
 *
 * They were a stand-in: twelve rectangles on an Animated value, written
 * because tsParticles is a web library and this is not the web. Mohan looked
 * at them and said plainly that it was not what he had asked for, and he was
 * right - it read as a stand-in.
 *
 * `Confetti` draws the real thing now, and carries the library inside the app,
 * so there is no longer a case where it cannot run and something simpler has
 * to cover for it.
 */


export default function Booked() {
    const { id, ticket } = useLocalSearchParams();
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    // One value for the tick, one shared by every speck. Two animations rather
    // than nine, because nine springs on the JS thread is how a celebration
    // becomes a stutter.
    // Only the tick animates here now; the confetti over the top is its own
    // thing entirely - see src/Confetti.js.
    const pop = useRef(new Animated.Value(0)).current;

    useEffect(() => {
Animated.spring(pop, {
                toValue: 1,
                useNativeDriver: true,
                stiffness: 180,
                damping: 12,
                mass: 0.9,
            }).start();
    }, [pop]);

    return (
        <View style={[s.page, { paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }]}>
            {/*
              * The real thing, over everything, when the network allows it.
              *
              * The hand-drawn ribbons below stay. They are what plays when this
              * cannot load - a booking confirmed on a weak signal is exactly
              * when a script from a CDN will not arrive, and a still screen at
              * that moment would be worse than a smaller celebration.
              */}
            <Confetti />
            <View style={s.middle}>
                <View style={s.stage}>

                    <Animated.View style={[s.tick, { transform: [{ scale: pop }] }]}>
                        <Icon name="check" size={44} color={colors.onInverse} weight="bold" />
                    </Animated.View>
                </View>

                <Display style={s.title}>Booked</Display>

                <Lede style={s.body}>
                    The office is looking for an engineer near you. You will be told their name
                    and number the moment somebody accepts - nobody unknown turns up at your door.
                </Lede>

                {ticket ? (
                    <View style={s.number}>
                        <Small style={s.numberLabel}>YOUR JOB</Small>
                        <Small style={s.numberValue}>{ticket}</Small>
                    </View>
                ) : null}
            </View>

            <View style={s.foot}>
                <Button
                    icon="arrow-right"
                    onPress={() => router.replace(id ? "/job/" + id : "/(tabs)/jobs")}
                >
                    Track this job
                </Button>

                <Button
                    tone="plain"
                    onPress={() => router.replace("/(tabs)")}
                    style={{ marginTop: space.sm }}
                >
                    Back to home
                </Button>
            </View>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: {
        flex: 1,
        paddingHorizontal: space.xl,
        backgroundColor: colors.canvas,
    },

    middle: { flex: 1, alignItems: "center", justifyContent: "center" },

    // A fixed box so the specks have something to fly out of without pushing
    // the heading around as they go.
    stage: { width: 240, height: 240, alignItems: "center", justifyContent: "center" },

    /*
     * Green, not blue.
     *
     * Blue is this app's action colour - it is the Continue button, the field,
     * the thing you press. On the one screen where there is nothing left to
     * press, it reads as another control. Green is the only thing on the
     * screen and it means what it says: done.
     */
    tick: {
        width: 104, height: 104, borderRadius: 52,
        backgroundColor: colors.ok,
        alignItems: "center", justifyContent: "center",
    },

    title: { marginTop: space.lg, fontSize: 30 },
    body: {
        marginTop: space.md,
        textAlign: "center",
        fontSize: 14,
        lineHeight: 21,
    },

    number: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginTop: space.xl,
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    numberLabel: {
        fontFamily: font.bold,
        fontSize: 9.5,
        letterSpacing: 0.7,
        color: colors.inkFaint,
    },
    numberValue: { fontFamily: font.bold, fontSize: 13, color: colors.ink },

    foot: { paddingTop: space.lg },
});
