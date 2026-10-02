import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { radius, space, useColors, useScheme } from "./theme";

/**
 * The shape of the page, drawn while the page is still coming.
 *
 * A spinner in the middle of an empty screen says only that something is
 * happening. A skeleton says what is about to be there - three rows, a picture
 * on the left of each, a line of title and two of text - so the eye has
 * already found its place by the time the real thing lands, and the swap
 * underneath it is not a re-read. It is the whole reason the big Indian
 * marketplaces feel quick on a slow connection: the page is never blank and
 * never jumps.
 *
 * The logo loader in Loading.js is not replaced by this and should not be. It
 * is for a wait with no known shape - opening the app, or a whole screen the
 * app has never drawn. This is for a list whose shape we already know.
 */

/**
 * One clock for every bone on the screen.
 *
 * Each block used to be able to own its animation, and a list of eight
 * skeleton rows is then thirty timers all doing the same sum a frame apart -
 * which both costs more than the page it is standing in for and looks wrong,
 * because the highlight no longer sweeps across the page as one movement. So
 * there is a single value here, started by whichever bone mounts first and
 * stopped when the last one goes, and every block reads from it.
 */
const clock = new Animated.Value(0);
let watching = 0;
let loop = null;

const useClock = () => {
    useEffect(() => {
        watching += 1;

        if (watching === 1) {
            loop = Animated.loop(
                Animated.timing(clock, {
                    toValue: 1,
                    duration: 1150,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            loop.start();
        }

        return () => {
            watching -= 1;

            // Stopped the moment the last skeleton leaves. A loop nobody can
            // see still wakes the UI thread sixty times a second.
            if (watching === 0) {
                loop?.stop();
                loop = null;
                clock.setValue(0);
            }
        };
    }, []);

    return clock;
};

/** The width of the travelling highlight, as a share of the block it crosses. */
const BAND = 0.55;

/**
 * A single grey block with the light passing over it.
 *
 * The sweep is a transform and nothing else, so it runs on the native thread
 * and keeps running while JavaScript is busy parsing the response this is
 * waiting for - which is exactly the moment a JavaScript-driven animation
 * would stutter.
 */
export const Bone = ({ width = "100%", height = 14, round = 8, style }) => {
    const colors = useColors();
    const t = useClock();

    // Measured rather than assumed: most bones are given a width in percent,
    // and a transform cannot be expressed in percentages.
    const [measured, setMeasured] = useState(0);

    const dark = useScheme() === "dark";
    const highlight = dark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.85)";

    return (
        <View
            onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
            style={[
                {
                    width,
                    height,
                    borderRadius: round,
                    backgroundColor: colors.sunken,
                    overflow: "hidden",
                },
                style,
            ]}
        >
            {measured > 0 ? (
                <Animated.View
                    style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: measured * BAND,
                        transform: [
                            {
                                translateX: t.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-measured * BAND, measured],
                                }),
                            },
                        ],
                    }}
                >
                    <LinearGradient
                        colors={["transparent", highlight, "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            ) : null}
        </View>
    );
};

/** Two or three bones stacked as a paragraph, the last one short like real text. */
export const Lines = ({ count = 2, style }) => (
    <View style={[{ gap: 8 }, style]}>
        {Array.from({ length: count }, (_, i) => (
            <Bone key={i} height={11} width={i === count - 1 ? "62%" : "100%"} />
        ))}
    </View>
);

/**
 * One row of the services list, at the size the real row will be.
 *
 * The measurements are taken from the row itself rather than guessed, so the
 * list does not shift by a few pixels the moment the catalogue arrives.
 */
export const ServiceRowBone = () => {
    const colors = useColors();

    return (
        <View style={[boneRow, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <Bone width={88} height={104} round={radius.md} />

            <View style={{ flex: 1, gap: space.sm }}>
                <Bone width="58%" height={15} />
                <Lines count={2} />
                <Bone width="34%" height={9} round={4} />
            </View>
        </View>
    );
};

/** One job card: the state badge, the service, the date, the money. */
export const JobCardBone = () => {
    const colors = useColors();

    return (
        <View style={[boneCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Bone width={78} height={24} round={radius.pill} />
                <Bone width={62} height={11} />
            </View>

            <Bone width="66%" height={17} style={{ marginTop: space.md }} />
            <Lines count={2} style={{ marginTop: space.sm }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space.lg }}>
                <Bone width={96} height={11} />
                <Bone width={54} height={11} />
            </View>
        </View>
    );
};

/**
 * One tile of the home screen's catalogue rail: the picture, then the fixed
 * two-line foot the real tile keeps for its name.
 */
export const TileBone = () => {
    const colors = useColors();

    return (
        <View style={[boneTile, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <Bone width="100%" height={104} round={radius.md} />

            <View style={{ height: 58, paddingTop: space.sm, gap: 7 }}>
                <Bone width="84%" height={11} />
                <Bone width="52%" height={9} round={4} />
            </View>
        </View>
    );
};

/**
 * The home screen while its one request is out.
 *
 * Home is a job card and then a rail of services, and it is worth drawing both
 * rather than one grey box: a returning customer with a job running looks at
 * the top of this screen and nowhere else, and the shape of the card is what
 * tells them their job is still there.
 */
export const HomeBones = () => (
    <View>
        <JobCardBone />

        <View style={{ flexDirection: "row", gap: space.md, marginTop: space.xxl }}>
            <TileBone />
            <TileBone />
        </View>
    </View>
);

/**
 * A run of the same shape.
 *
 * Three is the default because it fills a phone screen without pretending to
 * know how long the real list is - a skeleton of ten rows for a catalogue of
 * four is its own small lie.
 */
export const Bones = ({ of: Shape, count = 3, gap = space.sm }) => (
    <View style={{ gap }}>
        {Array.from({ length: count }, (_, i) => <Shape key={i} />)}
    </View>
);

const boneRow = {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
};

const boneTile = {
    width: 152,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.sm,
};

const boneCard = {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
};
