import Svg, { Circle, Path } from "react-native-svg";
import { Icon } from "./Icon";

/**
 * Other people's marks, and our own, drawn properly.
 *
 * The WhatsApp buttons carried a Feather speech bubble, which is a drawing of
 * a conversation and not a drawing of WhatsApp. The difference matters more
 * here than it would elsewhere: the code that signs somebody in arrives on
 * WhatsApp, so that button is the most important control in the app, and
 * anybody recognises the real glyph without reading the words beside it.
 *
 * The same reasoning gives the assistant a mark of its own. A generic message bubble
 * says "chat", which is what every other button in this app also is; the four
 * point star is what people now read as "this one answers you".
 *
 * Both take their colour from the caller rather than carrying one, so a button
 * decides its own, and both are the same shape at any size - they are paths,
 * not pictures, so there is nothing to load and nothing to go blurry.
 */

/** The WhatsApp glyph: the handset in a speech bubble, one path. */
export const WhatsAppMark = ({ size = 18, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.57-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </Svg>
);

/**
 * The assistant's mark: a four point star with a smaller one beside it.
 *
 * Filled rather than outlined, because it sits at tab-bar size where an
 * outline of something this thin closes up into a blob.
 */
export const AiMark = ({ size = 18, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        {/* The big star: four concave arms meeting at the middle */}
        <Path d="M13.6 2.3a.85.85 0 0 0-1.62 0l-1.02 3.1a5.6 5.6 0 0 1-3.55 3.55l-3.1 1.02a.85.85 0 0 0 0 1.62l3.1 1.02a5.6 5.6 0 0 1 3.55 3.55l1.02 3.1a.85.85 0 0 0 1.62 0l1.02-3.1a5.6 5.6 0 0 1 3.55-3.55l3.1-1.02a.85.85 0 0 0 0-1.62l-3.1-1.02a5.6 5.6 0 0 1-3.55-3.55l-1.02-3.1Z" />
        {/* The small one, low and left, which is what stops it reading as a
            snowflake or a sparkle from a loading spinner */}
        <Path d="M5.1 16.4a.5.5 0 0 0-.95 0l-.36 1.1a2.6 2.6 0 0 1-1.64 1.64l-1.1.36a.5.5 0 0 0 0 .95l1.1.36a2.6 2.6 0 0 1 1.64 1.64l.36 1.1a.5.5 0 0 0 .95 0l.36-1.1a2.6 2.6 0 0 1 1.64-1.64l1.1-.36a.5.5 0 0 0 0-.95l-1.1-.36A2.6 2.6 0 0 1 5.46 17.5l-.36-1.1Z" />
    </Svg>
);

/**
 * The scooter, for the engineer on their way.
 *
 * Drawn rather than taken from the icon set, because the set has a bicycle and
 * this is not a bicycle - a technician in Odisha arrives on a two-wheeler with
 * a toolbag, and the marker on the tracking map is where the app says so.
 * Kept to four strokes: at the size it travels the route, anything more
 * detailed turns to mush.
 */
export const ScooterMark = ({ size = 18, color = "currentColor" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="5.6" cy="16.6" r="3.2" />
        <Circle cx="18.2" cy="16.6" r="3.2" />
        <Path d="M8.8 16.6h6.2l-2.5-5.7H9.3" />
        <Path d="M12.5 10.9 15 6h2" />
    </Svg>
);
