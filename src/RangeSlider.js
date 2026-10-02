import { useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { font, space, useColors, useThemedStyles } from "./theme";
import { Small } from "./ui";

/**
 * Two thumbs on one track, for a price range.
 *
 * Written here rather than installed. `@react-native-community/slider` is the
 * usual answer and it has one thumb; every two-thumb package is a native module
 * this app would then have to carry for one screen. What this needs is a track,
 * two circles and some arithmetic, and all of that is cheaper than a dependency
 * that has to survive every Expo upgrade.
 *
 * Nothing here animates. The thumbs are positioned from state on each move,
 * which is a layout per frame while a finger is down and nothing at all when it
 * is not - on the handsets this app has to work on that is the version that
 * stays smooth, and a drag is the one interaction where the JS thread is
 * already being asked for a value every frame anyway.
 *
 * `step` snaps the values, so the label under a thumb never reads ₹347 when the
 * list it filters is priced in hundreds.
 */
export const RangeSlider = ({
    min = 0,
    max = 2000,
    step = 100,
    low,
    high,
    onChange,
    format = (n) => "₹" + n,
}) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const [width, setWidth] = useState(0);

    // Read inside the responder, which is created once and would otherwise
    // close over the first render's values for ever.
    const state = useRef({ low, high, width: 0 });
    state.current = { low, high, width };

    const toValue = (x) => {
        const w = state.current.width || 1;
        const raw = min + (Math.max(0, Math.min(w, x)) / w) * (max - min);
        return Math.round(raw / step) * step;
    };

    const toX = (value) => {
        if (!width) return 0;
        return ((value - min) / (max - min)) * width;
    };

    const grab = (which) => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderMove: (_e, gesture) => {
            const from = which === "low" ? state.current.low : state.current.high;
            const next = toValue(toX(from) + gesture.dx);

            /*
             * The thumbs cannot cross.
             *
             * Held one step apart rather than allowed to meet: two circles at
             * the same point is a control nobody can get out of, because
             * whichever one is on top takes every touch afterwards.
             */
            if (which === "low") {
                onChange({ low: Math.min(next, state.current.high - step), high: state.current.high });
            } else {
                onChange({ low: state.current.low, high: Math.max(next, state.current.low + step) });
            }
        },
    });

    const lowThumb = useRef(grab("low")).current;
    const highThumb = useRef(grab("high")).current;

    return (
        <View>
            <View
                style={s.track}
                onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            >
                {/* What is selected, between the two thumbs. */}
                <View
                    style={[
                        s.fill,
                        { left: toX(low), width: Math.max(0, toX(high) - toX(low)) },
                    ]}
                />

                <View
                    {...lowThumb.panHandlers}
                    style={[s.thumb, { left: toX(low) - 13 }]}
                    hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
                />
                <View
                    {...highThumb.panHandlers}
                    style={[s.thumb, { left: toX(high) - 13 }]}
                    hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
                />
            </View>

            <View style={s.reading}>
                <Small style={s.value}>{format(low)}</Small>
                <Small style={s.value}>
                    {high >= max ? format(max) + "+" : format(high)}
                </Small>
            </View>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    track: {
        height: 4,
        marginTop: space.xl,
        marginHorizontal: 13,
        borderRadius: 2,
        backgroundColor: colors.hairlineStrong,
    },
    fill: {
        position: "absolute",
        top: 0, bottom: 0,
        borderRadius: 2,
        backgroundColor: colors.field,
    },
    thumb: {
        position: "absolute",
        top: -11,
        width: 26, height: 26,
        borderRadius: 13,
        backgroundColor: colors.field,
        borderWidth: 3,
        borderColor: colors.surface,
    },

    reading: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: space.lg,
    },
    value: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
});
