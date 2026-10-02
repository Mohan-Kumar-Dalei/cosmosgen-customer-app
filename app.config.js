/**
 * app.json, with the map key read in at build time.
 *
 * The same arrangement the vendor app uses, and for the same reason: an
 * Android maps key is restricted to the package that may use it, but a key
 * committed to a file is still a key anybody can lift. So it lives in .env,
 * which git ignores, and is merged in here.
 *
 * No dotenv - the Expo CLI loads .env itself before it reads this file, and
 * requiring the package as well only adds a dependency that can be missing on
 * a build machine.
 */
const base = require("./app.json");

module.exports = {
    ...base.expo,

    extra: {
        ...base.expo.extra,

        // `android.config` is stripped out of the public manifest, which is
        // what Constants.expoConfig returns - so the native map gets its key
        // from the manifest at build time and JavaScript reads this one.
        googleMapsKey: process.env.GOOGLE_MAPS_ANDROID_KEY,

        // Where the backend lives, so a build can be pointed at a laptop or at
        // the hosted API without editing a source file. `src/config.js` falls
        // back to the hosted address when this is missing.
        apiUrl: process.env.API_URL,
    },

    android: {
        ...base.expo.android,

        // Nothing written when the variable is missing: the map then draws
        // black rather than half-working, and the cause is one line in the
        // build log rather than a mystery on a phone.
        config: process.env.GOOGLE_MAPS_ANDROID_KEY
            ? { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } }
            : undefined,
    },
};
