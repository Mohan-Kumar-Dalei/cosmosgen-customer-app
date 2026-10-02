import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Button, Display, Lede, Small } from "../../src/ui";
import { Icon } from "../../src/Icon";

/**
 * The moment the job exists.
 *
 * A screen that does nothing except say so, which is the one place in this app
 * that is allowed to be purely celebratory - everywhere else a page that only
 * congratulates somebody is a page between them and what they came for. Here it
 * is the point: a booking is a stranger agreeing to come to your house, and
 * landing back on a list with a new row in it does not acknowledge that.
 *
 * The animation is the one exception to this app's own rule that only
 * navigation moves. It is eight discs and a tick, each on a single transform
 * driven by the native driver, and it plays once and stops - no loop, nothing
 * left running behind the screen. On the handsets this app has to work on that
 * is a few hundred milliseconds of compositing, which is affordable for the
 * only screen in the product that is a full stop.
 */
const SPECKS = [
    { x: -84, y: -54, size: 8, tone: "field", delay: 60 },
    { x: 78, y: -66, size: 6, tone: "brand", delay: 140 },
    { x: -102, y: 26, size: 5, tone: "warn", delay: 100 },
    { x: 96, y: 18, size: 9, tone: "field", delay: 180 },
    { x: -58, y: 84, size: 6, tone: "brand", delay: 220 },
    { x: 62, y: 92, size: 7, tone: "warn", delay: 160 },
    { x: -14, y: -102, size: 5, tone: "brand", delay: 200 },
    { x: 26, y: 108, size: 5, tone: "field", delay: 120 },
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
            Animated.timing(burst, {
                toValue: 1,
                duration: 700,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [pop, burst]);

    return (
        <View style={[s.page, { paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }]}>
            <View style={s.middle}>
                <View style={s.stage}>
                    {SPECKS.map((speck, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                s.speck,
                                {
                                    width: speck.size,
                                    height: speck.size,
                                    borderRadius: speck.size / 2,
                                    backgroundColor: colors[speck.tone],
                                    opacity: burst.interpolate({
                                        inputRange: [0, 0.7, 1],
                                        outputRange: [0, 1, 0.35],
                                    }),
                                    transform: [
                                        {
                                            translateX: burst.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, speck.x],
                                            }),
                                        },
                                        {
                                            translateY: burst.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, speck.y],
                                            }),
                                        },
                                        {
                                            scale: burst.interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.3, 1.2, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        />
                    ))}

                    <Animated.View style={[s.tick, { transform: [{ scale: pop }] }]}>
                        <Icon name="check" size={44} color={colors.fieldInk} />
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
    speck: { position: "absolute" },

    tick: {
        width: 104, height: 104, borderRadius: 52,
        backgroundColor: colors.field,
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
