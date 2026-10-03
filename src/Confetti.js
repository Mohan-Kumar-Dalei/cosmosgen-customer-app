import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { CONFETTI_LIB } from "./confetti.lib";

/**
 * The confetti Mohan asked for, which is a web library.
 *
 * tsParticles is what he pointed at and there is no React Native build of it -
 * it draws to a canvas - so it runs where it can: a transparent WebView laid
 * over the screen with nothing to press. Everything goes through it, because
 * this sits over the two buttons somebody came here to use.
 *
 * The library travels inside the app rather than coming from a CDN. It was
 * fetched at first, and that put the one animation marking something going
 * right behind a network request made at the exact moment it was wanted - so
 * on the booking that mattered, nothing happened at all.
 *
 * There is no `ribbons()` function, whatever the demo page implies. The whole
 * library was searched and the word does not appear in it: confetti.js.org's
 * ribbons are `confetti()` given long, slow, drifting particles. That is what
 * is below.
 */

const html = (lib) => `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; background: transparent !important; }
      canvas { position: absolute !important; inset: 0 !important;
               width: 100% !important; height: 100% !important; pointer-events: none !important; }
    </style>
    <script>${lib}</script>
  </head>
  <body>
    <script>
      /*
       * Cosmosgen's own colours, not the demo's gold and pink - the brand
       * green, the action blue, the done green and one warm accent, so the
       * celebration looks like it came from the same place as the screen.
       */
      var COLOURS = ["#17a03c", "#1b4de4", "#059669", "#f5a524"];

      function ribbons(side) {
        /*
         * A ribbon is a long particle that falls slowly and drifts.
         *
         * scalar makes it big, gravity under one makes it hang, drift
         * pushes it sideways so it wanders rather than drops, and ticks
         * keeps it alive long enough to cross the screen. Those four together
         * are what separates a ribbon from a dot.
         */
        confetti({
          particleCount: 14,
          startVelocity: 46,
          spread: 60,
          angle: side === "left" ? 60 : 120,
          origin: { x: side === "left" ? 0 : 1, y: 0.75 },
          colors: COLOURS,
          shapes: ["square"],
          scalar: 1.9,
          gravity: 0.72,
          drift: side === "left" ? 0.9 : -0.9,
          ticks: 320,
        });
      }

      function run() {
        if (typeof confetti !== "function") return;

        /* The moment itself - a burst from each lower corner. */
        confetti({
          particleCount: 90, spread: 78, startVelocity: 52,
          angle: 60, origin: { x: 0, y: 0.85 }, colors: COLOURS, scalar: 1.1,
        });
        confetti({
          particleCount: 90, spread: 78, startVelocity: 52,
          angle: 120, origin: { x: 1, y: 0.85 }, colors: COLOURS, scalar: 1.1,
        });

        /* Then the ribbons, which take their time. */
        setTimeout(function () { ribbons("left"); ribbons("right"); }, 260);
        setTimeout(function () { ribbons("left"); ribbons("right"); }, 900);

        /* And a thin fall from above, so it does not all end at once. */
        var endAt = Date.now() + 2600;
        var falling = setInterval(function () {
          if (Date.now() >= endAt) return clearInterval(falling);
          confetti({
            particleCount: 4, angle: 90, spread: 100, startVelocity: 14,
            origin: { x: Math.random(), y: -0.1 },
            colors: COLOURS, shapes: ["square"], scalar: 1.5,
            gravity: 0.8, drift: Math.random() * 1.6 - 0.8, ticks: 300,
          });
        }, 140);
      }

      if (document.readyState === "complete") run();
      else window.addEventListener("load", run);
    </script>
  </body>
</html>`;

export const Confetti = ({ delay = 240 }) => {
    /*
     * Mounted after the screen has arrived, and taken down when it is over.
     *
     * A WebView starting during a navigation transition competes with it for
     * the same frames, which on a cheap handset is a visible stutter on the
     * one screen that should feel like a reward. And one left mounted
     * afterwards is a browser held open behind a page somebody is still
     * reading.
     */
    const [phase, setPhase] = useState("waiting");

    useEffect(() => {
        const start = setTimeout(() => setPhase("playing"), delay);
        return () => clearTimeout(start);
    }, [delay]);

    useEffect(() => {
        if (phase !== "playing") return undefined;
        const stop = setTimeout(() => setPhase("done"), 7000);
        return () => clearTimeout(stop);
    }, [phase]);

    if (phase !== "playing") return null;

    return (
        <View style={s.over} pointerEvents="none">
            <WebView
                originWhitelist={["*"]}
                source={{ html: html(CONFETTI_LIB) }}
                style={s.clear}
                containerStyle={s.clear}

                // Android paints a white page behind a WebView unless it is
                // told twice: once for the view and once for the page.
                backgroundColor="transparent"
                androidLayerType="hardware"

                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                javaScriptEnabled

                // Nothing here is a page anybody navigates, and a WebView that
                // cannot start should cost a celebration rather than a screen.
                onError={() => setPhase("done")}
                onRenderProcessGone={() => setPhase("done")}
            />
        </View>
    );
};

const s = StyleSheet.create({
    over: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
    clear: { backgroundColor: "transparent" },
});
