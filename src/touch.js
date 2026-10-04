import * as Haptics from "expo-haptics";

/**
 * How this app answers a thumb.
 *
 * Three things, in one place, because a press that is handled differently on
 * three screens is three different apps. Mohan asked for a premium Android
 * feel, and on Android that is not a visual - it is what happens in the
 * quarter of a second between touching something and letting go.
 */

/**
 * The dim, held while the finger is down.
 *
 * Opacity through `Pressable`'s own `pressed` flag rather than an Animated
 * value, so there is no driver, no wrapper view around every button in the app
 * and no work at all until a thumb lands.
 */
export const PRESSED_OPACITY = 0.82;

/**
 * And the squeeze underneath it.
 *
 * Two per cent, flat, held until the finger lifts. This is deliberately not
 * the spring that was here before: a spring overshoots and comes back, which
 * reads as the button pulsing at you rather than responding, and Mohan asked
 * for it to go. A linear scale that locks at 0.98 is the opposite - it is the
 * thing moving under your finger and staying there.
 */
export const PRESSED_SCALE = 0.98;

/**
 * The style a pressable gets while it is pressed.
 *
 * Both halves together, so a card and a button answer a thumb the same way.
 */
export const pressStyle = ({ pressed }) => (pressed
    ? { opacity: PRESSED_OPACITY, transform: [{ scale: PRESSED_SCALE }] }
    : null);

/**
 * Android's own answer, very quietly.
 *
 * The app said "pressed" with a dim and nothing else, which is a defensible
 * design and the one place it stepped outside the platform. A ripple at eight
 * per cent is not decoration competing with the dim - it is the thing an
 * Android user is expecting to see under their finger, and at that opacity it
 * registers without being noticed.
 *
 * `foreground` because several of these sit on a gradient or a photograph,
 * which covers the view's own background completely - drawn behind, the ripple
 * would happen where nobody can see it.
 */
export const RIPPLE_ON_LIGHT = { color: "rgba(0,0,0,0.06)", foreground: true };
export const RIPPLE_ON_DARK = { color: "rgba(255,255,255,0.08)", foreground: true };

export const rippleFor = (colors) => (colors.isDark ? RIPPLE_ON_DARK : RIPPLE_ON_LIGHT);

/**
 * A tick, on the things that actually matter.
 *
 * Strictly milestones: a booking going through, a code being sent, a job
 * cancelled, a payment confirmed. Never a list row, never a tab, never
 * scrolling. A phone that buzzes at every tap is not premium - it is a phone
 * somebody turns the haptics off on, and then the four moments that were worth
 * it are gone too.
 *
 * Never awaited and never allowed to throw. A handset with no motor, or one
 * where the user has switched system haptics off, should cost the buzz and
 * nothing else - certainly not the booking it was celebrating.
 */
export const tick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** The same, for something that has gone right and is worth a firmer note. */
export const tickDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/** And for something that did not. */
export const tickFailed = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};
