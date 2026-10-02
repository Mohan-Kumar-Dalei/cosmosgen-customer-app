import { memo, useEffect, useRef, useState } from "react";
import { Image, View } from "react-native";
import { Shade } from "./Rider";
import { MarkerAnimated } from "react-native-maps";

/**
 * Somebody who can move a motorcycle, seen from above.
 *
 * There is a stretch of many rides where the vendor is on a lane the map does
 * not have, and no road can honestly be drawn under him. Rather than apologise
 * for that with a dashed line to the door, the screen says what is happening:
 * the bike comes off the map and he flies instead, at the vendor's own
 * position, until there is a road to put the bike back on.
 *
 * He is drawn rather than modelled. A map marker is a picture the map rasterises
 * and rotates; there is no engine behind it to run a 3D model in, and putting
 * one on this screen would cost every low-end phone far more than it is worth.
 * So this is artwork, made for us and looked straight down on - the same camera
 * the rider is drawn from.
 *
 * There was a second and a third frame for a while - reaching, and holding -
 * from when he picked the bike up and carried it. That whole piece of theatre
 * is gone: he now simply flies at the vendor's own position while there is no
 * road to draw, and the bike is taken off the map for those stretches rather
 * than handed about. One pose is the whole of what that needs.
 */
const FLYING = require("../assets/carrier-flying.webp");

export const CARRIER_WIDTH = 40;
export const CARRIER_HEIGHT = 60;

/** The same smoothing the bike uses, so the two turn alike. */
const EASE = 0.25;
const SETTLED = 0.5;
const TICK_MS = 60;

export const Carrier = memo(({ coordinate, heading = 0 }) => {
    const [shown, setShown] = useState(heading);

    /** Whether the artwork has arrived; see tracksViewChanges below. */
    const [drawn, setDrawn] = useState(false);
    const current = useRef(heading);
    const timer = useRef(null);

    useEffect(() => {
        clearTimeout(timer.current);

        const step = () => {
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

    return (
        <MarkerAnimated
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            flat

            /* Above the line, as anything in the air should be. */
            zIndex={9}

            /*
             * Watched until the picture is there, and never again - the same
             * as the bike's marker, and for the same reason: artwork is decoded
             * a moment after the marker is laid out, and a marker told never to
             * look would keep the empty frame it first saw.
             */
            tracksViewChanges={!drawn}
            rotation={shown}
        >
            {/*
              * React Native's own Image rather than expo-image, and with its
              * size written out: a marker's child has to report a size before
              * the map can lay it out, and a plain Image with fixed dimensions
              * always does. The same reason the rider is drawn the way it is.
              */}
            <View style={{ width: CARRIER_WIDTH, height: CARRIER_HEIGHT, alignItems: "center", justifyContent: "center" }}>
                {/*
                  * Smaller and fainter than the bike's, because he is well
                  * above the road: height is what spreads a shadow out and
                  * takes the weight out of it.
                  */}
                <Shade width={CARRIER_WIDTH * 0.5} height={CARRIER_HEIGHT * 0.34} opacity={0.14} />

                <Image
                    source={FLYING}
                    style={{ width: CARRIER_WIDTH, height: CARRIER_HEIGHT }}
                    resizeMode="contain"
                    fadeDuration={0}
                    onLoad={() => setDrawn(true)}

                /* And stop watching if it never arrives - see the rider. */
                onError={() => setDrawn(true)}
                />
            </View>
        </MarkerAnimated>
    );
});

Carrier.displayName = "Carrier";
