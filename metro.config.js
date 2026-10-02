const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/**
 * Expo's own bundler settings, with one substitution.
 *
 * `react-native-maps` is a wrapper around the native Google Maps SDK and ships
 * nothing for the browser, so importing it on web throws before any screen
 * draws - which is why `expo start --web` could not run this app at all. Web
 * gets src/maps.web.js instead: the same exports, drawing a panel where the map
 * would be.
 *
 * Done as a resolver rather than by renaming files to `.web.js`, because the
 * import is in four different modules and this keeps all four writing the one
 * import that is correct on a phone.
 *
 * Android and iOS are untouched - they never enter the branch - so a release
 * build is byte for byte what it was.
 */
const config = getDefaultConfig(__dirname);

const MAPS_ON_WEB = path.resolve(__dirname, "src/maps.web.js");
const fallback = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === "web" && moduleName === "react-native-maps") {
        return { type: "sourceFile", filePath: MAPS_ON_WEB };
    }

    return (fallback || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
