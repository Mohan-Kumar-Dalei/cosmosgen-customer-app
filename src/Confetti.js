import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

/**
 * The confetti Mohan asked for, which is a web library.
 *
 * tsParticles' ribbons are what he pointed at, and there is no React Native
 * build of it - it draws to a canvas. So it runs where it can run: a WebView
 * laid over the screen, transparent, with nothing to press.
 *
 * It is drawn over the screen rather than inside the layout, so nothing here
 * can move a heading or push a button down the page. `pointerEvents="none"`
 * means every tap goes through it to the app underneath, which matters because
 * this sits over the two buttons somebody has come here to press.
 *
 * The hand-drawn ribbons on the booking screen are kept underneath on purpose.
 * This needs the network - the library comes from a CDN at the moment it is
 * wanted - and a booking confirmed on a weak signal is exactly when it will
 * not arrive. When that happens the WebView draws nothing at all and the
 * ribbons behind it are the whole celebration, which is far better than a
 * screen that stays still because a script did not load.
 */

const HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <script src="https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body, html { width: 100%; height: 100%; overflow: hidden; background: transparent !important; }
      canvas { position: absolute !important; top: 0 !important; left: 0 !important;
               width: 100% !important; height: 100% !important; pointer-events: none !important; }
    </style>
  </head>
  <body>
    <script>
      /*
       * Cosmosgen's own colours rather than the demo's.
       *
       * The library's sample throws gold, pink and orange, which belongs to
       * somebody else's product. These are the brand green, the action blue
       * and the done green this app already uses, so the celebration looks
       * like it came from the same place as the screen under it.
       */
      var COLOURS = ["#17a03c", "#1b4de4", "#059669", "#f5a524"];

      function run() {
        if (typeof confetti !== "function") return;

        var endAt = Date.now() + 4000;

        /* A burst from each lower corner first - the moment of the thing. */
        confetti({ particleCount: 70, spread: 70, angle: 60, origin: { x: 0, y: 0.9 }, colors: COLOURS });
        confetti({ particleCount: 70, spread: 70, angle: 120, origin: { x: 1, y: 0.9 }, colors: COLOURS });

        /* Then a thinner fall from the top, so it does not end all at once. */
        var falling = setInterval(function () {
          if (Date.now() >= endAt) return clearInterval(falling);
          confetti({
            particleCount: 6, angle: 90, spread: 70,
            origin: { x: Math.random(), y: 0 },
            gravity: 1.1, colors: COLOURS,
          });
        }, 120);

        /* And the ribbons themselves, once the first burst has cleared. */
        setTimeout(function () {
          if (typeof ribbons === "function") ribbons({ colors: COLOURS });
        }, 700);
      }

      if (document.readyState === "complete") run();
      else window.onload = run;
    </script>
  </body>
</html>`;

export const Confetti = ({ delay = 260 }) => {
    /*
     * Mounted after the screen has arrived.
     *
     * A WebView starting up during a navigation transition competes with it
     * for the same frames, and on a cheap handset that is a visible stutter on
     * the one screen that should feel like a reward. Waiting costs a quarter
     * of a second and the animation has four seconds to run.
     */
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setReady(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    /*
     * And taken down once it has finished.
     *
     * Nothing is animating after that, but a WebView left mounted is a browser
     * held open behind a screen somebody is still reading. It goes when the
     * show is over.
     */
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!ready) return undefined;
        const timer = setTimeout(() => setDone(true), 6000);
        return () => clearTimeout(timer);
    }, [ready]);

    if (!ready || done) return null;

    return (
        <View style={s.over} pointerEvents="none">
            <WebView
                originWhitelist={["*"]}
                source={{ html: HTML }}
                style={s.clear}
                containerStyle={s.clear}

                // Android paints a white page behind a WebView unless it is
                // told twice: once for the view and once for the page itself.
                backgroundColor="transparent"
                androidLayerType="hardware"

                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}

                // Nothing here is a page anybody navigates. If the script
                // cannot be fetched the view simply stays empty, and the
                // ribbons behind it carry the screen.
                javaScriptEnabled
                cacheEnabled
                onError={() => setDone(true)}
                onHttpError={() => setDone(true)}
            />
        </View>
    );
};

const s = StyleSheet.create({
    over: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
    clear: { backgroundColor: "transparent" },
});
