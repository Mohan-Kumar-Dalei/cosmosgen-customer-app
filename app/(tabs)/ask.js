import { useCallback, useEffect, useRef, useState } from "react";
import {
    Pressable, ScrollView, StyleSheet, TextInput, View,
} from "react-native";
import { useRouter } from "expo-router";
import { vaultDelete, vaultGet, vaultSet } from "../../src/vault";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorFrom } from "../../src/api";
import { Loading } from "../../src/Loading";
import { TAB_BAR_SPACE } from "../../src/TabBar";
import { Answer } from "../../src/Answer";
import { TradeCard } from "../../src/TradeCard";
import { useJobs } from "../../src/jobs";
import { PageHeader } from "../../src/PageHeader";
import { AiMark } from "../../src/Marks";
import { Thinking } from "../../src/Thinking";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Body, Confirm, Display, GradientFill, Greeting, Notice, Small } from "../../src/ui";
import { KEYBOARD_GAP, useKeyboardHeight, useKeyboardLift } from "../../src/keyboard";
import { Icon } from "../../src/Icon";

/*
 * The thread outlives the app being closed.
 *
 * The server keeps it for a few days and is the record; this only remembers
 * which thread is ours, so somebody who asked about their fridge last night
 * does not start again from nothing this morning.
 */
const CHAT_KEY = "cosmosgen.customer.chat";

/** What people actually open this screen to ask. */
const OPENERS = [
    "My AC is cooling but the water is dripping inside",
    "What does a fridge gas refill cost?",
    "The bathroom tap drips even when it is closed",
    "Do you clean a 2BHK in one visit?",
];

/**
 * The assistant, which answers before anything is booked.
 *
 * It cannot book - the service behind it is never given a booking tool, and
 * that is deliberate: nothing is ever raised in somebody's name because a
 * model decided it had heard a yes. What it can do is say what the fault
 * usually is and what it usually costs, and hand over to the booking flow when
 * the customer wants one.
 */
export default function Ask() {
    /*
     * How far the composer has to rise, measured rather than guessed.
     *
     * This was decided by platform - lift on iOS, nothing on Android, because
     * Android was asked for softwareKeyboardLayoutMode: "resize" and shortens
     * its own window. In Expo Go that held. In the installed build it does
     * not: Android 15 draws every app edge to edge, an edge-to-edge window is
     * not resized for the keyboard, and the composer went straight back
     * underneath it. useKeyboardLift reads how much the window actually moved
     * and asks for the rest, so it is right either way - see src/keyboard.js.
     */
    const lift = useKeyboardLift();
    const typing = useKeyboardHeight() > 0;
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();


    // The catalogue is already here; the assistant only sends keys.
    const { services } = useJobs();
    const [turns, setTurns] = useState([]);

    /*
     * Which answers have finished arriving.
     *
     * The cards under a reply were drawn beside its first word, so somebody
     * was offered something to book before they had read what it was for.
     * They wait for the typing now. A turn read back from the server is not
     * typed out at all, so it is in here from the start.
     */
    const [revealed, setRevealed] = useState(() => new Set());

    const markRevealed = useCallback((key) => {
        setRevealed((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    }, []);
    const [chatId, setChatId] = useState(null);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Asked before the thread goes, the way a chat app asks - it is the only
    // copy the customer has, and there is no undo behind it.
    const [confirmingClear, setConfirmingClear] = useState(false);
    const [clearing, setClearing] = useState(false);

    const scroller = useRef(null);

    /*
     * How tall the composer is, so the thread can end above it.
     *
     * Measured rather than worked out from the styles: the box grows as
     * somebody types a long complaint into it, and a number written here would
     * be right only while the message was one line.
     */
    const [dockHeight, setDockHeight] = useState(0);

    /*
     * The thread follows the keyboard down to its new bottom.
     *
     * onContentSizeChange covers a new message arriving, because that changes
     * the content. A keyboard opening does not - the same content simply has
     * less room - so nothing fired and the last thing said stayed hidden
     * behind it.
     */
    useEffect(() => {
        if (!typing) return undefined;

        const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 140);
        return () => clearTimeout(id);
    }, [typing, lift]);

    // Last night's thread, read back before anything is shown - so the screen
    // does not appear empty for a moment and then fill in.
    useEffect(() => {
        let alive = true;

        (async () => {
            const saved = await vaultGet(CHAT_KEY);

            if (saved) {
                try {
                    const res = await api.get("/customer/chat/" + saved);
                    if (alive) {
                        setTurns(res.data.data?.turns || []);
                        setChatId(saved);
                    }
                } catch {
                    // A thread the server has since forgotten. Starting a new
                    // one is the right answer, not an error message.
                    await vaultDelete(CHAT_KEY);
                }
            }

            if (alive) setLoading(false);
        })();

        return () => { alive = false; };
    }, []);

    const send = useCallback(async (text) => {
        const message = String(text || "").trim();
        if (!message || busy) return;

        setDraft("");
        setError("");
        setBusy(true);

        // Shown immediately. Waiting for the server to echo it back means a
        // second of the screen looking as though the send did nothing.
        setTurns((prev) => [...prev, { role: "user", text: message }]);

        try {
            const res = await api.post("/customer/ask", { message, chatId });
            const { reply, services, chatId: id } = res.data.data;

            /*
             * Marked as just-arrived, so it is written out a word at a time.
             *
             * Only this one. A thread read back from the server on opening the
             * screen is history, and history that types itself out is a wait
             * for something the customer has already read.
             */
            setTurns((prev) => [...prev, {
                role: "model",
                text: reply,
                fresh: true,

                /*
                 * The trades the answer pointed at, drawn as cards under it.
                 *
                 * The assistant used to be words and nothing else, so somebody
                 * who had just described a fault was told what it sounded like
                 * and then had to go and find the right card themselves. These
                 * are keys; the catalogue is already on the phone.
                 */
                services: services || [],
            }]);

            if (id && id !== chatId) {
                setChatId(id);
                vaultSet(CHAT_KEY, id).catch(() => { /* a thread that starts again tomorrow */ });
            }
        } catch (err) {
            setError(errorFrom(err, "That one did not get an answer. Try asking it a different way."));
        } finally {
            setBusy(false);
        }
    }, [busy, chatId]);

    /**
     * Throw the conversation away, here and on the server.
     *
     * The server forgets it on its own after a few days, but somebody who has
     * just described a fault in their own bathroom should not have to wait for
     * that - which is the same reason every chat app has this. Both copies go:
     * the record on the server, and the note of which thread was ours.
     *
     * The screen is cleared whatever the server says. A delete that failed
     * still leaves a thread that expires by itself, and refusing to clear the
     * screen over it would leave the customer looking at the conversation they
     * just asked to be rid of.
     */
    const forget = useCallback(async () => {
        setClearing(true);

        try {
            if (chatId) await api.delete("/customer/chat/" + chatId);
        } catch {
            // Said nothing about: see above.
        }

        await vaultDelete(CHAT_KEY).catch(() => { /* never written */ });

        setTurns([]);
        setChatId(null);
        setError("");
        setClearing(false);
        setConfirmingClear(false);
    }, [chatId]);

    return (
        /*
         * A plain box, deliberately.
         *
         * This was a KeyboardAvoidingView, and that is what Mohan saw as the
         * page jumping. Android already shortens the window to the space above
         * the keyboard, so "height" took that same height off a second time:
         * the thread ended up half the screen, the auto-scroll ran on the
         * shorter box, and the heading left the top.
         *
         * Nothing here measures the keyboard now. The window shortening is the
         * whole of it on Android, and the composer below sits at the foot of
         * whatever is left - which is exactly above the keyboard, once.
         */
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            {/*
              * No blue band here either.
              *
              * It was the last screen still wearing one. The colour belongs to
              * the home screen, where it carries the address and the search;
              * everywhere else is a plain back arrow and a title.
              */}
            <PageHeader title="Ask AI" />

            <ScrollView
                ref={scroller}
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingTop: space.sm,
                    /*
                     * Room for the docked composer, and for whatever is under
                     * it - the tab bar when there is no keyboard, the keyboard
                     * when there is.
                     *
                     * The keyboard used to be left out of this on purpose, and
                     * the result was that the newest message sat behind it:
                     * scrollToEnd puts the foot of the content at the foot of
                     * the scroller, and the foot of the scroller was under the
                     * keyboard. Padding here extends what can be scrolled
                     * through; it does not move the page, which is what the old
                     * note was worried about.
                     */
                    paddingBottom: dockHeight + space.md + space.md
                        + (typing ? lift : insets.bottom + TAB_BAR_SPACE + space.md),
                }}
                onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/*
                  * The label and the way to clear the thread, on one line.
                  *
                  * Up here rather than at the foot of the conversation: it
                  * belongs to the whole thread, not to the last thing said in
                  * it, and a destructive control under the newest message is
                  * one the thumb finds by accident. Hidden entirely until
                  * there is something to throw away.
                  */}
                <View style={s.topRow}>
                    <Greeting>Tell it what the machine is doing</Greeting>

                    {turns.length ? (
                        <Pressable
                            onPress={() => setConfirmingClear(true)}
                            hitSlop={10}
                            style={s.clear}
                            android_ripple={null}
                        >
                            <Icon name="trash-2" size={14} color={colors.inkFaint} />
                            <Small style={{ color: colors.inkFaint }}>Clear chat</Small>
                        </Pressable>
                    ) : null}
                </View>

                <Display>What is it doing?</Display>
                <Small style={{ marginTop: space.sm }}>
                    Describe it the way you would to a neighbour. You will get what it usually
                    is, what it usually costs, and whether it is worth sending somebody.
                </Small>

                {loading ? (
                    <Loading inline label="Reading your last conversation" />
                ) : (
                    <>
                        {!turns.length ? (
                            <View style={{ marginTop: space.xl, gap: space.sm }}>
                                {OPENERS.map((line) => (
                                    <Pressable
                                        key={line}
                                        onPress={() => send(line)}
                                        android_ripple={null}
                                        style={s.opener}
                                    >
                                        <View style={s.openerMark}>
                                            <Icon name="corner-down-right" size={13} color={colors.accent} />
                                        </View>
                                        <Small style={{ flex: 1, color: colors.ink }}>{line}</Small>
                                        <Icon name="arrow-up-right" size={15} color={colors.inkFaint} />
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <View style={{ marginTop: space.xl, gap: space.md }}>
                                {turns.map((turn, i) => (
                                    <View
                                        key={i}
                                        style={[turn.role === "user" ? s.mine : s.hers]}
                                    >
                                        {turn.role !== "user" ? (
                                            <View style={s.byline}>
                                                <AiMark size={12} color={colors.accent} />
                                                <Small style={s.name}>AI assistant</Small>
                                            </View>
                                        ) : null}
                                        {/* The answer is parsed - bold, bullets,
                                            the lot; the customer's own words are
                                            printed exactly as they typed them */}
                                        {turn.role === "user" ? (
                                            <Body style={{ color: colors.fieldInk }}>{turn.text}</Body>
                                        ) : (
                                            <Answer
                                                text={turn.text}
                                                typing={turn.fresh}
                                                onDone={() => markRevealed(i)}
                                            />
                                        )}

                                        {/*
                                          * What it just talked about, ready to open.
                                          *
                                          * Only on an answer, and only where the
                                          * assistant named something - a card under
                                          * "your engineer is ten minutes away" would
                                          * be clutter, so the server sends no keys for
                                          * those and nothing is drawn.
                                          */}
                                        {turn.role !== "user" ? (
                                            (() => {
                                                /*
                                                 * Resolved first, drawn second.
                                                 *
                                                 * The server sends keys and the
                                                 * catalogue is looked up here, so
                                                 * a key for a trade this phone has
                                                 * not loaded - or one the office
                                                 * has since removed - finds
                                                 * nothing. Mapping inside the JSX
                                                 * meant the row itself was still
                                                 * drawn in that case: an empty box
                                                 * with a gap above it, under an
                                                 * answer, for no reason.
                                                 */
                                                // Nothing until the answer has
                                                // finished arriving - see `revealed`.
                                                if (turn.fresh && !revealed.has(i)) return null;

                                                const cards = (turn.services || [])
                                                    .map((key) => services.find((x) => x.key === key))
                                                    .filter(Boolean);

                                                if (!cards.length) return null;

                                                return (
                                                    <View style={s.suggested}>
                                                        {cards.map((service) => (
                                                            <TradeCard
                                                                key={service.key}
                                                                service={service}
                                                                wide
                                                            />
                                                        ))}
                                                    </View>
                                                );
                                            })()
                                        ) : null}
                                    </View>
                                ))}

                                {/*
                                  * Something that keeps changing while it
                                  * composes.
                                  *
                                  * This was the word "Thinking…" sitting
                                  * still, and a still word is indistinguishable
                                  * from a screen that has stopped - which on a
                                  * slow connection is exactly what somebody
                                  * assumes. See src/Thinking.js: it runs
                                  * entirely on the native driver, so it keeps
                                  * moving even while the JS thread is busy,
                                  * which is the only moment it is on screen.
                                  */}
                                {busy ? (
                                    <View style={[s.hers, s.waiting]}>
                                        <Thinking />
                                    </View>
                                ) : null}
                            </View>
                        )}

                        {error ? <View style={{ marginTop: space.md }}><Notice>{error}</Notice></View> : null}

                        {/* She answers; she does not book. When somebody has
                            decided, this is the way across rather than a
                            promise she cannot keep. */}
                        {turns.length ? (
                            <Pressable
                                onPress={() => router.push("/(tabs)/services")}
                                android_ripple={null}
                                style={s.handoff}
                            >
                                <Icon name="calendar" size={15} color={colors.brandDeep} />
                                <Small style={{ flex: 1, color: colors.brandDeep, fontFamily: font.semibold }}>
                                    Ready to book it? Pick the service here.
                                </Small>
                                <Icon name="chevron-right" size={18} color={colors.brandDeep} />
                            </Pressable>
                        ) : null}
                    </>
                )}
            </ScrollView>

            {/*
              * The composer, docked above the tab bar - and above the keyboard
              * when there is one.
              *
              * Absolute rather than a row at the foot of the column: a docked
              * row would take its height out of the thread above it, and every
              * change to it would re-lay the page out. Sitting over the page
              * instead, it can rise by the keyboard's exact height and nothing
              * else on the screen knows it happened.
              *
              * The tab bar takes itself off screen while somebody is typing,
              * so the room kept for it goes at the same moment - otherwise the
              * box floats a bar's height above the keyboard with a gap under
              * it.
              */}
            <View
                style={[
                    s.dock,
                    {
                        bottom: lift,
                        /*
                          * The breathing room above the keyboard, inside the
                          * bar rather than under it - see src/keyboard.js.
                          *
                          * And above the tab bar, a gap. The bar is a floating
                          * island now rather than a strip along the bottom
                          * edge, so ending the composer exactly where the bar
                          * begins left the two touching, with the island
                          * appearing to hang off the composer instead of over
                          * the page.
                          */
                        paddingBottom: typing
                            ? KEYBOARD_GAP
                            : insets.bottom + TAB_BAR_SPACE + space.md,
                    },
                ]}
            >
                {/* The row alone is measured, never the padding around it:
                    that padding changes with the keyboard, and the thread's
                    own spacing must not. */}
                <View
                    style={s.dockRow}
                    onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
                >
                    <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        placeholder="Type what is wrong…"
                        placeholderTextColor={colors.inkFaint}
                        style={s.input}
                        multiline
                        onSubmitEditing={() => send(draft)}
                        blurOnSubmit={false}
                    />

                    <Pressable
                        onPress={() => send(draft)}
                        disabled={busy || !draft.trim()}
                        android_ripple={null}
                        style={[s.sendButton, { opacity: busy || !draft.trim() ? 0.5 : 1 }]}
                    >
                        <GradientFill color={colors.field} />
                        <Icon name="arrow-up" size={20} color={colors.fieldInk} />
                    </Pressable>
                </View>
            </View>

            <Confirm
                open={confirmingClear}
                title="Clear this conversation?"
                body="Everything you have asked and everything you were told goes, on this phone and on our side. It cannot be brought back."
                confirmLabel="Clear it"
                busy={clearing}
                onConfirm={forget}
                onCancel={() => setConfirmingClear(false)}
            />
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    suggested: { marginTop: space.md, gap: space.sm },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: space.sm,
    },
    clear: { flexDirection: "row", alignItems: "center", gap: 5 },

    opener: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        padding: space.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    openerMark: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },

    mine: {
        alignSelf: "flex-end",
        maxWidth: "86%",
        backgroundColor: colors.field,
        borderRadius: radius.lg,
        borderBottomRightRadius: radius.sm,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    hers: {
        alignSelf: "flex-start",
        maxWidth: "92%",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        borderRadius: radius.lg,
        borderBottomLeftRadius: radius.sm,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    byline: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },

    // While it is composing there is no byline and no answer, so the bubble
    // shrinks to what it actually holds.
    waiting: { paddingVertical: space.sm + 2 },
    // The line beside the star on each answer. It says what is talking, not
    // who - the assistant has no name until Mohan gives it one.
    /*
     * Said, not stamped.
     *
     * This was AI ASSISTANT in tracked-out capitals, and unlike a section
     * divider it is not furniture - it appears above every single answer in
     * the thread, so the loudest typography in the app was also the most
     * repeated thing in it. Sentence case, and it reads as a byline.
     */
    name: {
        fontFamily: font.semibold,
        fontSize: 12,
        color: colors.accent,
    },

    handoff: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginTop: space.lg,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: colors.brandTint,
    },

    dock: {
        position: "absolute",
        left: 0,
        right: 0,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        backgroundColor: colors.canvas,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
    },
    dockRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: space.sm,
    },
    input: {
        flex: 1,
        minHeight: 52,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: colors.hairline,
        borderRadius: radius.lg,
        backgroundColor: colors.sunken,
        paddingHorizontal: space.md,
        paddingTop: space.md - 2,
        paddingBottom: space.md - 2,
        fontFamily: font.body,
        fontSize: 15,
        color: colors.ink,
    },
    sendButton: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: colors.field,
        alignItems: "center", justifyContent: "center",

        // So the graded fill behind the arrow is a disc, not a square
        overflow: "hidden",
    },
});
