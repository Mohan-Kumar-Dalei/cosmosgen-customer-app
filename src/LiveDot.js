import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/**
 * The dot beside LIVE, breathing.
 *
 * A word that says "live" next to a dot that never moves is a claim the screen
 * does not back up - and this card sits in a list somebody scrolls past, so
 * the claim has about a second to be believed. The same swell as the ring
 * around a waiting vendor on the map, for the same reason.
 *
 * Driven natively: the loop is handed to the platform once and runs off the
 * JavaScript thread entirely, so a list of these costs nothing to scroll past.
 * That is the only reason it is allowed in an app that otherwise animates
 * navigation and nothing else.
 */
export const LiveDot = ({ style }) => {
    const swell = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(swell, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(swell, {
                    toValue: 0,
                    duration: 900,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        );

        loop.start();
        return () => loop.stop();
    }, [swell]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: swell.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                    transform: [{
                        scale: swell.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }),
                    }],
                },
            ]}
        />
    );
};
