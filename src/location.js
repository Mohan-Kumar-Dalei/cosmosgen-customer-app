import * as Location from "expo-location";

/**
 * The customer's door, as a pin.
 *
 * The address itself is worked out on the server from these two numbers, the
 * same way it is on WhatsApp - so somebody who registers in the app ends up
 * registered at exactly the door the office would have sent an engineer to
 * anyway, rather than at whatever they typed.
 *
 * What comes back is either a fix or a sentence to put on the screen. Nothing
 * here throws: a customer who has said no to the permission has made a choice,
 * and the screen offers to let them type the address instead.
 */
export const fixPosition = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
        return {
            ok: false,
            message: "We need the location permission to find your door. You can type the address instead.",
        };
    }

    try {
        /*
         * Balanced, not Highest.
         *
         * Highest keeps the GPS chip awake hunting for a metre of precision
         * that changes nothing here - the difference between two accuracies is
         * a few metres on a map and several seconds of somebody watching a
         * spinner on a cheap phone.
         */
        const fix = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return { ok: true, lat: fix.coords.latitude, lon: fix.coords.longitude };
    } catch {
        return {
            ok: false,
            message: "Could not get a location fix. Try again outside, or type the address instead.",
        };
    }
};
