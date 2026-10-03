import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Body, Button, Display, Lede, Small } from "../../src/ui";
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
                {/*
                  * The tick sits in a halo rather than on the page.
                  *
                  * A green disc alone on paper is a status badge. Two rings of
                  * the same green at low opacity around it make it the thing
                  * the screen was built for, which is what Mohan meant by
                  * premium - the mark is the same, what changed is that the
                  * page now appears to be arranged around it.
                  */}
                <View style={s.stage}>
                    <Animated.View style={[s.haloOuter, { transform: [{ scale: pop }] }]} />
                    <Animated.View style={[s.haloInner, { transform: [{ scale: pop }] }]} />

                    <Animated.View style={[s.tick, { transform: [{ scale: pop }] }]}>
                        <Icon name="check" size={44} color={colors.onInverse} weight="bold" />
                    </Animated.View>
                </View>

                <Display style={s.title}>Booked</Display>

                <Lede style={s.body}>
                    The office is looking for an engineer near you. You will be told their name
                    and number the moment somebody accepts - nobody unknown turns up at your door.
                </Lede>

                {/*
                  * The ticket number as a card, not a pill.
                  *
                  * It is the one thing on this screen somebody might read out
                  * on a phone call or search for later, and it was set in the
                  * same small grey as everything else. A panel of its own, the
                  * number large and tabular, is the difference between a label
                  * and a receipt.
                  */}
                {ticket ? (
                    <View style={s.receipt}>
                        <Small style={s.numberLabel}>YOUR JOB NUMBER</Small>
                        <Body style={s.numberValue}>{ticket}</Body>

                        <View style={s.receiptRule} />

                        <View style={s.receiptRow}>
                            <Icon name="shield" size={14} color={colors.ok} />
                            <Small style={s.receiptNote}>
                                Nothing is charged until the work is done and you have seen the bill
                            </Small>
                        </View>
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

    /*
     * Two rings of the tick's own colour, barely there.
     *
     * Opacity rather than a lighter green, so they hold up on the dark theme
     * as well - a tint mixed for paper goes muddy on a dark page, and the same
     * colour at eight per cent does not.
     */
    haloOuter: {
        position: "absolute",
        width: 196, height: 196, borderRadius: 98,
        backgroundColor: colors.ok,
        opacity: 0.08,
    },
    haloInner: {
        position: "absolute",
        width: 148, height: 148, borderRadius: 74,
        backgroundColor: colors.ok,
        opacity: 0.14,
    },

    receipt: {
        alignSelf: "stretch",
        marginTop: space.xl,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        alignItems: "center",
    },
    receiptRule: {
        alignSelf: "stretch",
        height: 1,
        marginVertical: space.md,
        backgroundColor: colors.hairline,
    },
    receiptRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
    receiptNote: { flex: 1, fontSize: 12, lineHeight: 17 },

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

    numberLabel: {
        fontFamily: font.bold,
        fontSize: 9.5,
        letterSpacing: 0.7,
        color: colors.inkFaint,
    },
    numberValue: { fontFamily: font.bold, fontSize: 13, color: colors.ink },

    foot: { paddingTop: space.lg },
});
