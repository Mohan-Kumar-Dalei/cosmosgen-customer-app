import { memo, useEffect, useState } from "react";
import { Circle, Marker } from "react-native-maps";
import { SvgXml } from "react-native-svg";

/**
 * Somebody, standing still.
 *
 * Before a vendor has accepted a job there is a person out there and no
 * journey. Drawing the bike then claims a journey that has not begun: the
 * marker sits motionless in the middle of a road for as long as the offer is
 * unanswered, and a customer reads a bike that never moves as tracking that
 * has broken rather than as nobody having set off.
 *
 * So the same man is drawn from the front, in a disc - a helmet and shoulders,
 * waiting. The moment he accepts he becomes the bike, pointing along the road,
 * with the route drawn ahead of him. The change of mark is the announcement.
 *
 * The web tracking page has carried this for a while and the app did not,
 * which is exactly the sort of split Mohan treats as the app being wrong. The
 * drawing is the same one, kept in step deliberately: a customer who opens the
 * WhatsApp link and one who opens the app are watching the same job.
 *
 * The ring around him pulses, the man does not.
 *
 * A marker that never moves is hard to tell from a page that has stopped
 * working - and this one never moves on purpose, because standing still is its
 * whole meaning. So the ring behaves the way a live dot does anywhere else: it
 * swells outward and fades, over and over. Scaling the whole mark was wrong on
 * the web for the same reason it would be wrong here: the man grows and
 * shrinks, which reads as a zoom rather than as a signal.
 *
 * The ring is a map circle rather than part of the drawing, because a marker's
 * artwork is rasterised once and any animation inside it never runs. Only the
 * circle re-renders - the marker, the route and the screen around them are all
 * left alone, which is what keeps this affordable on a cheap phone.
 */
const WAITING_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <radialGradient id="wshell" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#f0f3f6"/>
      <stop offset="1" stop-color="#bcc6cf"/>
    </radialGradient>
    <linearGradient id="wblue" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#4b9ee4"/>
      <stop offset="0.5" stop-color="#1e40af"/>
      <stop offset="1" stop-color="#0a4f8c"/>
    </linearGradient>
  </defs>

  <circle cx="48" cy="48" r="34" fill="#1e40af" opacity="0.13"/>
  <circle cx="48" cy="48" r="25" fill="#ffffff"/>
  <circle cx="48" cy="48" r="25" fill="none" stroke="#1e40af" stroke-width="2.2" opacity="0.55"/>

  <path d="M34 60 C34 51 40 46 48 46 C56 46 62 51 62 60 L62 64 C57 66 39 66 34 64 Z" fill="url(#wblue)"/>
  <circle cx="48" cy="44" r="12" fill="url(#wshell)"/>
  <path d="M44.5 33 C45.8 32.7 50.2 32.7 51.5 33 L51.5 55 C50.2 55.3 45.8 55.3 44.5 55 Z" fill="url(#wblue)" opacity="0.9"/>
  <path d="M38.5 41 C41 36.5 44 34.5 48 34.5 C52 34.5 55 36.5 57.5 41 C53 38.8 43 38.8 38.5 41 Z" fill="#0b0e11"/>
  <circle cx="48" cy="44" r="12" fill="none" stroke="rgba(13,26,38,0.14)" stroke-width="1"/>
</svg>`;

/**
 * The same scale as the bike, because it is the same person - see the note in
 * Rider.js about sitting between the kerbs rather than across them. A shade
 * wider only because the faint halo is drawn inside this box.
 */
const WAITING_SIZE = 34;

/** How long one swell takes, and how far it travels, in metres on the ground. */
const PULSE_MS = 1800;
const PULSE_FROM = 12;
const PULSE_TO = 46;

/** About fifteen frames a second, which is enough for a slow swell. */
const TICK_MS = 66;

const Pulse = memo(({ center }) => {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const began = Date.now();
        const id = setInterval(
            () => setPhase(((Date.now() - began) % PULSE_MS) / PULSE_MS),
            TICK_MS,
        );

        return () => clearInterval(id);
    }, []);

    const radius = PULSE_FROM + phase * (PULSE_TO - PULSE_FROM);

    // Fading as it travels, which is what makes it read as a signal leaving
    // him rather than as a circle being drawn around him.
    const fade = (base) => Math.round(base * (1 - phase) * 255).toString(16).padStart(2, "0");

    return (
        <Circle
            center={center}
            radius={radius}
            strokeWidth={1.5}
            strokeColor={"#1e40af" + fade(0.45)}
            fillColor={"#1e40af" + fade(0.12)}
        />
    );
});

Pulse.displayName = "WaitingPulse";

export const Waiting = memo(({ coordinate, pulsing = false }) => (
    <>
        {pulsing ? <Pulse center={coordinate} /> : null}

        <Marker
            coordinate={coordinate}

            // A mark drawn from above sits on its position rather than
            // pointing at it, so the middle of the disc is the place.
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
        >
            <SvgXml xml={WAITING_SVG} width={WAITING_SIZE} height={WAITING_SIZE} />
        </Marker>
    </>
));

Waiting.displayName = "Waiting";
