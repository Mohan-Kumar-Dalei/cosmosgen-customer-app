import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { font, space, useColors, useThemedStyles } from "./theme";

/**
 * The map's own panel, while Google is still drawing it.
 *
 * A map does not appear with the screen: it mounts, asks for tiles, and until
 * those land there is nothing underneath the route but grey - so a blue line
 * and a bike hang in mid-air for a second, which reads as a map that has
 * failed rather than one that is coming.
 *
 * Plain on purpose, and twice corrected to get here. The app's own Loading
 * mark - the logo on a plate with a bar under it - took over the screen for
 * the one second it showed. A drawn skeleton of a map, roads and blocks and a
 * sheen crossing them, was worse in the other direction: a fake map is a thing
 * somebody has to look at and decide is not real. What Mohan drew is what
 * belongs here - a spinner, the word, and the map's own ground behind them -
 * and it covers the map's area only, so the job card underneath stays
 * readable the whole time.
 */
export const MapWait = ({ label = "Loading", tone }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    return (
        <View style={[s.wait, tone ? { backgroundColor: tone } : null]} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={s.label}>{label}</Text>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    wait: {
        /*
         * Spelled out rather than spread, and lifted.
         *
         * Two things went wrong with the short version. The panel came out the
         * height of its own contents, sitting as a band across the top of the
         * screen with the map plainly visible underneath it - which is the
         * opposite of a cover. And on Android a Google map is a native surface
         * that draws over its siblings unless they are given an elevation of
         * their own: it is why the sheet below carries one, and why this now
         * does too.
         */
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,

        /*
         * Just above the map, and below everything else.
         *
         * Android stacks by elevation, and this panel had more of it than the
         * card of details below - so the "cover over the map" became a cover
         * over the whole screen: a cream page with one spinner on it and the
         * job nowhere to be seen. The back button sits at 4 and the card at
         * 12; this needs only to beat the map, which sits at nothing.
         */
        elevation: 2,

        backgroundColor: colors.canvas,
        alignItems: "center",
        justifyContent: "center",
        gap: space.md,
    },
    label: {
        fontFamily: font.semibold,
        fontSize: 13,
        color: colors.inkSoft,
    },
});
