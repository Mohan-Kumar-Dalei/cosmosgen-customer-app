import { StyleSheet, View } from "react-native";
import { font, radius, space, useColors, useThemedStyles } from "./theme";
import { Small } from "./ui";
import { Icon } from "./Icon";

/**
 * react-native-maps, for the browser, where it does not exist.
 *
 * The package is a wrapper around the Google Maps SDK on Android and MapKit on
 * iOS, and it ships nothing at all for web - importing it in a browser throws
 * before a single screen draws, which is what stopped `expo start --web` from
 * running this app at all.
 *
 * Every screen is worth looking at in a browser: it is the only way Mohan and I
 * can be looking at the same pixels at the same time, and the alternative is a
 * build and a phone for every change to a margin. So metro.config.js points
 * `react-native-maps` here whenever the platform is web, and everything except
 * the live map behaves exactly as it does on a handset.
 *
 * What is deliberately not here is a real web map. Loading the Google Maps
 * JavaScript API would mean a second key, a second billing line and a second
 * implementation of the tracking screen to keep in step with the phone's - all
 * so a developer can watch a dot move in a browser. The panel below says what
 * it is standing in for instead, which is honest and costs nothing.
 */
const MapView = ({ children, style }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    return (
        <View style={[s.stand, style]}>
            <Icon name="map" size={22} color={colors.inkFaint} />
            <Small style={s.word}>The live map draws on the phone</Small>
            <Small style={s.hint}>Everything else on this screen is real.</Small>

            {/* Markers and routes are rendered as children of the map, so they
                are swallowed here rather than left to draw themselves over the
                panel in whatever position they were given. */}
            <View style={{ display: "none" }}>{children}</View>
        </View>
    );
};

/** The overlays. Each draws nothing; each has to exist to be imported. */
const Nothing = () => null;

export const Marker = Nothing;
export const MarkerAnimated = Nothing;
export const Circle = Nothing;
export const Polyline = Nothing;
export const Callout = Nothing;
export const Polygon = Nothing;
export const Overlay = Nothing;

/**
 * A stand-in for the animated region the tracking screen keeps a rider in.
 *
 * It is constructed at module scope on some screens and then driven every time
 * a location arrives, so it cannot simply be undefined - it has to accept the
 * same calls and do nothing. `timing` returns something with a `start`, because
 * that is how it is always used.
 */
export class AnimatedRegion {
    constructor(region = {}) { Object.assign(this, region); }

    setValue() {}
    setOffset() {}
    flattenOffset() {}
    stopAnimation() {}
    addListener() { return 0; }
    removeListener() {}

    timing() { return { start: () => {} }; }
    spring() { return { start: () => {} }; }
}

export const PROVIDER_GOOGLE = "google";
export const PROVIDER_DEFAULT = undefined;
export const MAP_TYPES = { STANDARD: "standard", SATELLITE: "satellite", HYBRID: "hybrid", TERRAIN: "terrain" };

export default MapView;

const makeStyles = (colors) => StyleSheet.create({
    stand: {
        alignItems: "center",
        justifyContent: "center",
        gap: space.xs,
        minHeight: 200,
        borderRadius: radius.lg,
        backgroundColor: colors.iconSurface,
    },
    word: { fontFamily: font.semibold, color: colors.inkSoft, marginTop: space.sm },
    hint: { fontSize: 11.5, color: colors.inkFaint },
});
