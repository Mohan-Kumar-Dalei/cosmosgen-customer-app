import { Image, View } from "react-native";

/**
 * The engineer on his bike, seen from above.
 *
 * A pin is right for a place and wrong for a person: two identical teardrops on
 * a road say "here are two points", not "this one is coming to that one".
 *
 * From above, and that is the whole point. It was drawn from the side twice and
 * both were wrong for the same reason Mohan gave: a map is looked down on, so a
 * bike shown in profile is lying on its side on the road. What you see from up
 * there is the helmet, the shoulders, the handlebar across, an arm out to each
 * grip, and a little wheel showing front and back.
 *
 * It was drawn here in SVG for a long time, and it is artwork now - the company
 * had a proper one made, in its own colours, with the name on the rider's back
 * where a uniform carries it. The website still has the drawn copy in
 * LocationMap.jsx; tracking lives in the app, so the two no longer have to
 * match, but that is worth knowing before anybody wonders why they differ.
 *
 * It points north, and the marker turns the whole picture by the heading - see
 * RiderMarker.
 */
export const RIDER_IMAGE = require("../assets/rider.webp");

/**
 * How big it is drawn, in map points.
 *
 * Mohan settled the old drawing at 30 wide against real tiles at the zoom the
 * tracking screen uses - small enough to sit between the kerbs, which is what
 * makes the movement look like movement. The artwork is a narrower shape than
 * the drawing was, so the width is kept and the height follows from its own
 * proportions rather than the drawing's.
 */
export const RIDER_WIDTH = 20;
export const RIDER_HEIGHT = 34;

/**
 * Centred.
 *
 * A marker drawn from above sits on its position rather than pointing at it, so
 * there is no tip to anchor. The artwork is trimmed to the bike itself and is
 * centred in its own frame, so the middle of the picture is the middle of the
 * machine - which is the point being reported.
 */
export const RIDER_ANCHOR = { x: 0.5, y: 0.5 };

/**
 * A shadow, so it sits on the tarmac instead of being printed on it.
 *
 * Three rounded shapes, each wider and fainter than the last, which is a blur
 * anybody can afford: a real one would cost a layer the map has to composite on
 * every frame of every glide. It turns with the bike, which is right - a bike's
 * shadow is bike-shaped and points where the bike points.
 */
const Shade = ({ width, height, opacity = 0.22 }) => (
    <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        {[1.0, 0.78, 0.58].map((size, i) => (
            <View
                key={size}
                style={{
                    position: "absolute",
                    width: width * size,
                    height: height * size,
                    borderRadius: width,
                    backgroundColor: "rgba(13,26,38," + (opacity * (i + 1) / 3).toFixed(3) + ")",
                }}
            />
        ))}
    </View>
);

export const Rider = ({ onReady }) => (
    <View style={{ width: RIDER_WIDTH, height: RIDER_HEIGHT, alignItems: "center", justifyContent: "center" }}>
        <Shade width={RIDER_WIDTH * 0.72} height={RIDER_HEIGHT * 0.62} />

        <Image
            source={RIDER_IMAGE}
            style={{ width: RIDER_WIDTH, height: RIDER_HEIGHT }}
            resizeMode="contain"

            /*
             * No fade. A marker that dissolves into view reads as the map
             * loading rather than as somebody arriving, and the map redraws the
             * marker bitmap the moment this finishes - see RiderMarker.
             */
            fadeDuration={0}
            onLoad={onReady}

            /*
             * And if it cannot be decoded at all, stop watching for it.
             *
             * The marker redraws itself until the picture arrives - see
             * RiderMarker - so an image that never arrives would leave it
             * rasterising every frame for the length of the journey. A missing
             * bike is a blemish; a marker burning the battery is worse.
             */
            onError={onReady}
        />
    </View>
);

export { Shade };
