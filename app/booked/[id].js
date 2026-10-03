import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Button, Display, Lede, Small } from "../../src/ui";
import { Icon } from "../../src/Icon";

/**
 * Ribbons, falling, rather than dots flying apart.
 *
 * The first version was eight round specks thrown outward from the tick, which
 * reads as a loading flourish rather than as a celebration. Mohan asked for the
 * confetti.js ribbons instead - and that library is a web canvas, so it cannot
 * come along; what travels is the shape and the motion. A ribbon is a thin
 * rectangle that spins as it falls, and spinning is what separates confetti
 * from a particle effect.
 *
 * Still two animated values for the whole screen, not twelve. Every ribbon
 * reads the same clock and differs only in where it starts and how fast it
 * turns, so this is two native-driven animations rather than two dozen springs
 * on the JS thread - which is the difference between a celebration and a
 * stutter on the handsets this app has to keep working on.
 *
 * It plays once. Nothing loops, nothing is left running behind the screen.
 */
const RIBBONS = [
    { x: -96, y: 150, w: 7, h: 15, spin: 3, tone: "brand", delay: 0 },
    { x: 88, y: 168, w: 6, h: 13, spin: -4, tone: "field", delay: 40 },
    { x: -46, y: 190, w: 8, h: 17, spin: 2, tone: "ok", delay: 90 },
    { x: 52, y: 146, w: 5, h: 12, spin: -3, tone: "brand", delay: 130 },
    { x: -124, y: 128, w: 6, h: 14, spin: 4, tone: "warn", delay: 70 },
    { x: 118, y: 136, w: 7, h: 16, spin: -2, tone: "ok", delay: 170 },
    { x: -16, y: 206, w: 6, h: 13, spin: 3, tone: "field", delay: 200 },
    { x: 20, y: 184, w: 8, h: 18, spin: -4, tone: "brand", delay: 110 },
    { x: -72, y: 172, w: 5, h: 11, spin: 2, tone: "ok", delay: 150 },
    { x: 74, y: 198, w: 6, h: 14, spin: -3, tone: "warn", delay: 230 },
    { x: -108, y: 206, w: 7, h: 15, spin: 4, tone: "field", delay: 190 },
    { x: 104, y: 214, w: 5, h: 12, spin: -2, tone: "brand", delay: 250 },
];

export default function Booked() {
    const { id, ticket } = useLocalSearchParams();
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    // One value for the tick, one shared by every speck. Two animations rather
    // than nine, because nine springs on the JS thread is how a celebration
    // becomes a stutter.
    const pop = useRef(new Animated.Value(0)).current;
    const burst = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(pop, {
                toValue: 1,
                useNativeDriver: true,
                stiffness: 180,
                damping: 12,
                mass: 0.9,
            }),
            /*
             * Slower, and started after the screen has arrived.
             *
             * It was seven hundred milliseconds beginning the instant this
             * mounted - which is while the navigation transition is still
             * moving the screen into place. The whole celebration was over
             * before there was anything to celebrate on, so what Mohan saw was
             * its end state: a green tick and nothing else.
             *
             * The delay is roughly one navigation transition. The duration is
             * double what it was, because ribbons falling need long enough to
             * read as falling rather than as a flicker.
             */
            Animated.timing(burst, {
                toValue: 1,
                delay: 260,
                duration: 1500,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [pop, burst]);

    return (
        <View style={[s.page, { paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }]}>
            <View style={s.middle}>
                <View style={s.stage}>
                    {RIBBONS.map((ribbon, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                s.ribbon,
                                {
                                    width: ribbon.w,
                                    height: ribbon.h,
                                    backgroundColor: colors[ribbon.tone],
                                    opacity: burst.interpolate({
                                        inputRange: [0, 0.08, 0.82, 1],
                                        outputRange: [0, 1, 1, 0],
                                    }),
                                    transform: [
                                        {
                                            translateX: burst.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, ribbon.x],
                                            }),
                                        },
                                        {
                                            /*
                                             * Up first, then down - thrown rather
                                             * than dropped. A ribbon that only
                                             * falls looks like something broke.
                                             */
                                            translateY: burst.interpolate({
                                                inputRange: [0, 0.35, 1],
                                                outputRange: [0, -ribbon.y * 0.45, ribbon.y],
                                            }),
                                        },
                                        {
                                            // The spin is the whole difference
                                            // between confetti and a dot.
                                            rotate: burst.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ["0deg", ribbon.spin * 180 + "deg"],
                                            }),
                                        },
                                        {
                                            scale: burst.interpolate({
                                                inputRange: [0, 0.2, 1],
                                                outputRange: [0.4, 1, 0.9],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        />
                    ))}

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
     * A thin rectangle with a softened end, which is what a paper ribbon looks
     * like once it is moving. Rounded all the way would be a pill and would
     * lose the flat edge that catches the eye as it turns.
     */
    ribbon: { position: "absolute", borderRadius: 2 },

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
