import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, TextInput, useWindowDimensions } from "react-native";

/**
 * How tall the keyboard is, where its top edge sits, and the room a form has
 * to leave for it.
 *
 * The room is the hard part, and it has been got wrong twice.
 *
 * First by platform: Android was assumed to shorten its own window
 * (`softwareKeyboardLayoutMode: "resize"`), so nothing was lifted there, and
 * iOS was lifted by the whole keyboard. That held in Expo Go and stopped
 * holding in the installed build - from Android 15 every app draws edge to
 * edge, and an edge-to-edge window is not resized for the keyboard at all.
 *
 * Then by arithmetic: remember the window height with the keyboard down,
 * subtract the height with it up, and lift by whatever the window failed to
 * absorb. Closer, but it under-shot by the height of the keyboard's own
 * toolbar - the row with the sticker and microphone buttons - which is part of
 * the keyboard but is not always part of what the resize accounts for. The
 * composer ended up with its bottom edge tucked behind that row.
 *
 * So neither is used now. `endCoordinates.screenY` is the top edge of the
 * keyboard measured against the screen, toolbar included, and the window's own
 * bottom edge is `windowHeight`. The overlap between the two is the answer,
 * whatever the platform did or did not do:
 *
 *   window not resized  -> windowHeight is the screen, overlap is the keyboard
 *   window fully resized -> windowHeight stops at the keyboard, overlap is 0
 *   window partly resized -> overlap is exactly the part it missed
 *
 * `GAP` is the breathing room the office asked for: the field sits a little
 * above the keyboard rather than flush against it.
 *
 * Where that room is put matters as much as its size. It used to be added to
 * the lift, which raised the whole bar and left a band of bare page showing
 * between it and the keyboard - the thread scrolling past underneath, visible
 * through the gap. The bar now sits flush and carries the room as its own
 * padding, so there is still air above the field and nothing behind it.
 */
const GAP = 14;

/**
 * Everything the keyboard reports, in one listener.
 *
 * Height and top edge come from the same event, so measuring them separately
 * would mean two subscriptions delivering two halves of one fact - and a
 * render in between where they disagree.
 */
const useKeyboard = () => {
    const [state, setState] = useState({ height: 0, top: null });

    useEffect(() => {
        /*
         * `Will` on iOS, `Did` on Android.
         *
         * iOS announces the keyboard before it animates, so room made then
         * slides up with it. Android only announces it once it has arrived,
         * and the `Will` events are not delivered there at all - listening for
         * them would mean listening for nothing.
         */
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const up = Keyboard.addListener(showEvent, (e) => {
            const end = e?.endCoordinates;
            setState({
                height: end?.height || 0,
                top: Number.isFinite(end?.screenY) ? end.screenY : null,
            });
        });

        const down = Keyboard.addListener(hideEvent, () => setState({ height: 0, top: null }));

        return () => { up.remove(); down.remove(); };
    }, []);

    return state;
};

/** The raw height, for anything that only needs to know the keyboard is up. */
export const useKeyboardHeight = () => useKeyboard().height;

/**
 * How far a bar docked to the bottom of the screen has to rise.
 *
 * Measured against the keyboard's top edge rather than worked out from its
 * height - see the note at the top of this file for why that difference is the
 * whole bug.
 */
export const useKeyboardLift = () => {
    const { height, top } = useKeyboard();
    const { height: windowHeight } = useWindowDimensions();

    if (height === 0) return 0;

    // Bare overlap, with no breathing room added: a docked bar has a
    // background of its own and must meet the keyboard, not hover above it.

    /*
     * A keyboard that did not say where its top edge is.
     *
     * Not expected on either platform, but a lift of zero would put the field
     * straight under it, so the height is used instead. Too much room is a
     * gap; too little is a field nobody can see what they are typing into.
     */
    if (top === null) return height;

    return Math.max(0, windowHeight - top);
};

/**
 * The room to make at the foot of a scrolling form, or under a bar docked to
 * the bottom of the screen.
 *
 * Zero while the keyboard is down, so a closed form is laid out exactly as it
 * was drawn. `extra` is for a screen that already keeps space for something of
 * its own - a floating tab bar, a docked button - which must not be counted
 * twice.
 */
export const useKeyboardPad = (extra = 0) => {
    const lift = useKeyboardLift();

    // Here the room does belong in the measurement: this is padding at the
    // foot of a scrolling form, so the gap is inside the page rather than
    // underneath a floating bar.
    return lift > 0 ? Math.max(0, lift + GAP - extra) : 0;
};

/**
 * Scrolls whatever is being typed into out from under the keyboard.
 *
 * Padding at the foot of a form is only half the job, and it was the half that
 * was done. It makes room to scroll into; it does not scroll. A field that was
 * under the keyboard when the keyboard arrived stayed under it, and the
 * customer had to know to drag the page up while typing - on the sign-in
 * screen, where the very first thing anybody does is tap a phone number.
 *
 * This measures the field that actually has focus against the keyboard's top
 * edge and scrolls by the difference, so nothing moves when nothing is covered
 * and the page never jumps further than it has to.
 *
 * Used as:
 *
 *   const scroll = useKeyboardScroll();
 *   <ScrollView ref={scroll.ref} onScroll={scroll.onScroll} scrollEventThrottle={16} ...>
 *
 * Measuring can fail - a field inside something exotic, a platform that has
 * not laid out yet - and when it does nothing happens, which is exactly the
 * behaviour before this existed.
 */
export const useKeyboardScroll = () => {
    const ref = useRef(null);
    const offset = useRef(0);
    const { top } = useKeyboard();

    const onScroll = useCallback((e) => {
        offset.current = e?.nativeEvent?.contentOffset?.y || 0;
    }, []);

    useEffect(() => {
        if (top === null || !ref.current) return undefined;

        /*
         * A beat after the keyboard says it is up.
         *
         * The field's position on screen is only final once the window has
         * settled around the keyboard, and on Android that is a frame or two
         * after the event.
         */
        const id = setTimeout(() => {
            const node = TextInput.State?.currentlyFocusedInput?.();
            if (!node?.measureInWindow) return;

            try {
                node.measureInWindow((x, y, width, height) => {
                    if (!Number.isFinite(y) || !Number.isFinite(height)) return;

                    const covered = (y + height + GAP) - top;
                    if (covered <= 0) return;

                    ref.current?.scrollTo?.({ y: offset.current + covered, animated: true });
                });
            } catch {
                // Nothing measured, nothing moved.
            }
        }, 120);

        return () => clearTimeout(id);
    }, [top]);

    return { ref, onScroll };
};

export const KEYBOARD_GAP = GAP;
