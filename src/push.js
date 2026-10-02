import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "./api";
import { useSession } from "./session";

/**
 * Being told the technician has arrived, without watching for it.
 *
 * The socket only exists while somebody is looking at the app, so "they are at
 * your door" reached the customer on WhatsApp and nowhere else - and the
 * person waiting for that message is, by definition, not staring at their
 * phone. A push is the only thing that reaches a shut app.
 *
 * Nothing here is required for the app to work. A phone that refuses the
 * permission, a build without Firebase credentials for this package, an
 * emulator - each of them ends with no token, the server sends nothing, and
 * the WhatsApp message arrives exactly as it always did.
 */

/*
 * expo-notifications, only if this build can have it.
 *
 * It throws the moment it is imported in Expo Go - Android push was taken out
 * of it in SDK 53 - and this module is imported by the root layout, so that
 * import took the whole app down before a single screen rendered. Which meant
 * the app could not be opened in Expo Go at all, and every look at a change
 * needed a build.
 *
 * The vendor app hit this first and answers it the same way. A build that has
 * the module gets push; Expo Go gets the app, and the arrival still reaches
 * the customer on WhatsApp exactly as it always did.
 */
let Notifications = null;
try {
    Notifications = require("expo-notifications");
} catch {
    Notifications = null;
}

/*
 * A banner even while the app is open.
 *
 * The default is to stay silent when the app is in front of somebody, on the
 * grounds that they can see it. That is right for chatter and wrong for this:
 * a customer with the job screen open is the person most waiting to be told,
 * and the screen they are on may not be the one showing it.
 */
if (Notifications) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

const register = async () => {
    if (!Notifications) return null;

    if (Platform.OS === "android") {
        /*
         * Android decides how a notification behaves from its channel, and the
         * settings are frozen once the channel exists - so a channel is made
         * here with the behaviour it should have, rather than inheriting the
         * silent default.
         */
        await Notifications.setNotificationChannelAsync("updates", {
            name: "Job updates",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
        });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    if (!granted && existing.canAskAgain) {
        granted = (await Notifications.requestPermissionsAsync()).granted;
    }

    if (!granted) return null;

    const token = await Notifications.getExpoPushTokenAsync();
    return token?.data || null;
};

/**
 * Registers once the customer is signed in, and clears the token when they are
 * not - a phone that has been signed out of should stop being rung.
 */
export const usePushRegistration = () => {
    const { customer } = useSession();
    const signedIn = Boolean(customer?.id || customer?._id);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!signedIn) return;

            try {
                const token = await register();
                if (cancelled || !token) return;

                await api.put("/customer/push-token", { token });
            } catch {
                // No token, no push, no problem - see the note at the top.
            }
        })();

        return () => { cancelled = true; };
    }, [signedIn]);
};
