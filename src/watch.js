import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

/**
 * The crashes the error screen never sees.
 *
 * `Broke` catches what React throws while rendering, which is the kind that
 * blanks a screen and is therefore the kind somebody reports. It cannot see
 * the rest: a throw inside a press handler, a timer or a socket callback, and
 * an await whose rejection nobody caught. Those do not blank anything. They
 * leave a button that does nothing, a map that stops moving, a booking that
 * never arrives - and until now they left no trace at all, on the phone or on
 * the server.
 *
 * So the same report goes out for those, to the same endpoint, and the app
 * carries on. Nothing here changes what the customer sees: an error that was
 * already invisible stays invisible, it simply stops being invisible to us
 * as well.
 */

/* One line per fault, not one per occurrence - a socket that fails every two
   seconds would otherwise be a thousand reports and a flat battery. */
const seen = new Map();
const QUIET_MS = 5 * 60 * 1000;

const tooSoon = (key) => {
    const last = seen.get(key) || 0;
    if (Date.now() - last < QUIET_MS) return true;

    seen.set(key, Date.now());

    // The map is only a memory of the last few minutes, and a phone that has
    // been open all day should not be holding every message it has ever seen.
    if (seen.size > 40) seen.clear();

    return false;
};

const report = (error, where) => {
    const message = String(error?.message || error || "Unknown error");

    if (tooSoon(where + "|" + message.slice(0, 80))) return;

    api.post("/app/error", {
        app: "customer",
        message,
        stack: String(error?.stack || ""),
        screen: where + " " + Platform.OS + " " + String(Platform.Version),
        version: String(Constants.expoConfig?.version || ""),
    }).catch(() => {
        // A reporter that throws is worse than the fault it is reporting.
    });
};

/**
 * Installed once, from the root layout.
 *
 * The previous handler is kept and still called. In a development build that
 * is what draws the red screen, and taking it away would mean a crash on a
 * laptop told you less than a crash on a customer's phone.
 */
export const watchForCrashes = () => {
    if (global.__cosmosgenWatching) return;
    global.__cosmosgenWatching = true;

    const ErrorUtils = global.ErrorUtils;

    if (ErrorUtils?.setGlobalHandler) {
        const previous = ErrorUtils.getGlobalHandler?.();

        ErrorUtils.setGlobalHandler((error, isFatal) => {
            report(error, isFatal ? "fatal" : "uncaught");
            if (previous) previous(error, isFatal);
        });
    }

    /*
     * And the promises nobody caught.
     *
     * Hermes raises these as an event on the global object the same way a
     * browser does. Wrapped because the shape of this has moved between
     * engine versions, and a crash reporter that crashes the app on startup
     * is the worst possible trade.
     */
    try {
        if (typeof global.addEventListener === "function") {
            global.addEventListener("unhandledrejection", (event) => {
                report(event?.reason || event, "unhandled-promise");
            });
        }
    } catch {
        // Nothing to do. One of the two handlers is better than neither.
    }
};
