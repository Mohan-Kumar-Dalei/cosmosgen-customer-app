const { withMainActivity } = require("@expo/config-plugins");

/**
 * Let the app run at the screen's real refresh rate.
 *
 * Android does not give an app the fast mode of a 90, 120 or 144Hz display
 * just because the display has one. Unless the window asks, most phones hand
 * out 60Hz to save battery - which is exactly what Mohan measured with
 * "Show refresh rate" turned on: a 144Hz handset, and the app running at 60.
 * Everything downstream then looks like the app's fault. Every animation here
 * is already on the native driver and there is no blur anywhere; the ceiling
 * was never ours.
 *
 * So the window asks, once, as the activity is created. `preferredDisplayModeId`
 * names an exact mode rather than a rate, which matters because a phone's mode
 * list mixes refresh rates *and* resolutions - asking only for "fastest" can
 * quietly drop the screen to a lower resolution. The mode is chosen from those
 * matching the resolution already in use, so only the rate changes.
 *
 * There is no Expo option for this - expo-build-properties has nothing for
 * refresh rate - so it is a config plugin, which is the supported way to touch
 * MainActivity without ejecting. It re-applies on every prebuild, so the
 * android/ folder stays disposable.
 *
 * The phone still has the final say: a device in battery saver, or one whose
 * manufacturer pins a rate, will ignore the request. Nothing breaks when it
 * does - the app runs at whatever it is given, exactly as before.
 */

const ANCHOR = /super\.onCreate\([^)]*\)/;

const SNIPPET = `
    // Ask for the display's fastest mode at this resolution. Android hands
    // out 60Hz on a 120/144Hz screen unless the window asks for more, and
    // the modes list mixes rates with resolutions - so only modes matching
    // the current resolution are considered, and only the rate changes.
    try {
      val display = windowManager.defaultDisplay
      val current = display.mode
      val fastest = display.supportedModes
        .filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }
        .maxByOrNull { it.refreshRate }

      if (fastest != null && fastest.modeId != current.modeId) {
        window.attributes = window.attributes.apply { preferredDisplayModeId = fastest.modeId }
      }
    } catch (e: Throwable) {
      // A refresh rate is a nicety. Never let it stop the app starting.
    }
`;

const withHighRefreshRate = (config) =>
    withMainActivity(config, (cfg) => {
        const file = cfg.modResults;

        if (file.language !== "kt") {
            throw new Error(
                "withHighRefreshRate expects a Kotlin MainActivity; this project has " + file.language
            );
        }

        // Already applied - prebuild can run more than once against the same
        // file, and a second copy would be dead code rather than a fault.
        if (file.contents.includes("preferredDisplayModeId")) return cfg;

        const match = file.contents.match(ANCHOR);

        if (!match) {
            throw new Error(
                "withHighRefreshRate could not find super.onCreate(...) in MainActivity. "
                + "Expo changed the template; update plugins/withHighRefreshRate.js."
            );
        }

        file.contents = file.contents.replace(match[0], match[0] + "\n" + SNIPPET);
        return cfg;
    });

module.exports = withHighRefreshRate;
