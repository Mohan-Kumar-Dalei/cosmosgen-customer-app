import { memo, useEffect, useRef, useState } from "react";
import { Marker, MarkerAnimated } from "react-native-maps";
import { Rider, RIDER_ANCHOR } from "./Rider";

/**
 * The bike, turning like something that has to turn.
 *
 * The heading came off the road, which was right, and was applied the instant
 * it changed, which was not. A corner is a ninety degree change between one
 * position and the next, so the bike did not turn at all - it faced one way,
 * blinked, and faced another. Real motion is the thing the eye reads as a
 * vehicle, and the blink reads as a sticker being moved.
 *
 * So the drawn angle chases the true one instead of copying it, the short way
 * round, and settles in under a second. It is the same behaviour as the
 * direction cone on a map's blue dot: the cone swings, it does not jump.
 *
 * Its own component, and memoised, because the smoothing ticks about fifteen
 * times a second. Inside the screen that would re-render the map and every
 * other thing on it at that rate; here only the marker moves.
 */

/** How much of the remaining turn is taken each tick. */
const EASE = 0.2;

/** Under half a degree is not a turn anybody can see. */
const SETTLED = 0.4;

const TICK_MS = 60;

export const RiderMarker = memo(({ coordinate, heading = 0, animated = false }) => {
    const [shown, setShown] = useState(heading);

    /** Whether the artwork has arrived; see tracksViewChanges below. */
    const [drawn, setDrawn] = useState(false);
    const current = useRef(heading);
    const timer = useRef(null);

    useEffect(() => {
        clearTimeout(timer.current);

        const step = () => {
            /*
             * The short way round. 359 to 1 degrees is a two degree turn, not
             * a three hundred and fifty eight degree one, and a bike crossing
             * due north must not spin on the spot to get there.
             */
            const turn = ((heading - current.current + 540) % 360) - 180;

            if (Math.abs(turn) < SETTLED) {
                current.current = heading;
                setShown(heading);
                return;
            }

            current.current += turn * EASE;
            setShown(current.current);
            timer.current = setTimeout(step, TICK_MS);
        };

        step();

        return () => clearTimeout(timer.current);
    }, [heading]);

    const props = {
        coordinate,
        anchor: RIDER_ANCHOR,

        /*
         * `flat` is what makes the rotation a compass bearing rather than a
         * spin of the picture: a marker that is not flat stands up facing the
         * camera like a pin.
         */
        flat: true,
        rotation: shown,

        /*
         * Watched until the picture is there, and never again.
         *
         * Rotation is a native property of the marker and is applied without
         * redrawing the child, which is the whole reason this can tick fifteen
         * times a second for a whole journey. The drawing it used to hold was
         * shapes and was complete in its first frame, so the marker never had
         * to look at it at all.
         *
         * Artwork is not: it is decoded a moment after the marker is laid out,
         * and a marker told never to look would keep the empty frame it first
         * saw - a bike-shaped hole in the map for the whole ride. So it watches
         * until the image reports itself loaded, and then stops.
         */
        tracksViewChanges: !drawn,
    };

    const child = <Rider onReady={() => setDrawn(true)} />;

    return animated
        ? <MarkerAnimated {...props}>{child}</MarkerAnimated>
        : <Marker {...props}>{child}</Marker>;
});

RiderMarker.displayName = "RiderMarker";
