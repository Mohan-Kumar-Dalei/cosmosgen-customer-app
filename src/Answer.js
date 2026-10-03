import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { font, radius, space, useThemedStyles } from "./theme";

/**
 * What the assistant said, set like an answer rather than dumped as a blob.
 *
 * The model writes the way anybody sensible writes when asked "how does the
 * bill work": a line of explanation, then a short list, then a line about what
 * to do next - with the odd **bold** where it matters. Printed raw, the reader
 * gets asterisks in the middle of sentences and a hyphen where a bullet should
 * be, which is what made the replies look unfinished.
 *
 * Deliberately not a Markdown library. What comes back is plain prose with
 * dashes, digits and the occasional emphasis, and a parser for exactly that is
 * thirty lines that cannot be surprised by a model emitting a table or a
 * script tag. The website answers with the same parser - frontend's
 * Customer/Answer.jsx - so a reply reads the same in both places.
 *
 * The website's letter-by-letter reveal is not carried over, but a reply does
 * arrive a word at a time - Mohan asked for it, and it is the difference
 * between an answer appearing and an answer being written to you.
 *
 * Done by revealing more of one string rather than by animating anything. The
 * website mounts an animated element per letter, which is several hundred
 * views left on the page to be laid out on every scroll afterwards; this is a
 * number going up and the same text re-cut from it, so what is on screen when
 * it finishes is exactly what would have been there without it. That keeps the
 * app's rule intact - nothing here animates, the text simply grows.
 */

/** `**like this**` becomes bold, and nothing else is interpreted. */
const withEmphasis = (text, styles) =>
    String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        const bold = part.startsWith("**") && part.endsWith("**") && part.length > 4;

        return bold
            ? <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>
            : <Text key={i}>{part}</Text>;
    });

/** A line that opens with a dash, a bullet or "1." is an item in a list. */
const ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;

const blocksFrom = (text) => {
    const blocks = [];
    let list = null;

    String(text).split("\n").forEach((raw) => {
        const line = raw.trimEnd();

        if (ITEM.test(line)) {
            const ordered = /^\s*\d+[.)]/.test(line);

            if (!list || list.ordered !== ordered) {
                list = { kind: "list", ordered, items: [] };
                blocks.push(list);
            }

            list.items.push(line.replace(ITEM, ""));
            return;
        }

        list = null;
        if (line.trim()) blocks.push({ kind: "p", text: line });
    });

    return blocks;
};

/*
 * How long a whole reply takes to appear, however long it is.
 *
 * This was two seconds, and two seconds is what Mohan was feeling as the
 * assistant having got slower - the answer was already on the phone, being
 * held back so it could be typed out. A reveal is worth having: it tells
 * somebody the thing in front of them is being written rather than recalled,
 * and it gives the eye somewhere to start on a long answer. It is not worth
 * two seconds of a person waiting with a broken fridge.
 *
 * Under a second still reads as typing and no longer reads as a delay.
 */
const REVEAL_MS = 800;

/** One frame every 32ms is fast enough to read as typing and cheap enough. */
const TICK_MS = 32;

/**
 * The reply, arriving a word at a time.
 *
 * The separators are kept when splitting, so the newlines the block parser
 * needs survive - cut the text on plain spaces and every list and paragraph
 * collapses into one run-on line while it is being revealed.
 *
 * The pace is set from the length rather than fixed per word: a two-line
 * answer and a twenty-line one both finish in about two seconds, so a long
 * reply never leaves somebody watching a machine type at them.
 */
/*
 * Anything in double brackets is ours, not theirs.
 *
 * The assistant ends some answers with a marker the server reads and removes -
 * [[SERVICES:...]] and the rest. The server is where that belongs and it does
 * it. But one of them reached a customer's screen once, inside the answer,
 * because the expression that removed it was also the one that had to
 * understand it and it understood nothing.
 *
 * So the screen refuses to draw one too. The server will almost always have
 * taken it already; this is the second lock on a door that should not have
 * opened, and it costs one pass over a string nobody is waiting on.
 */
const MARKERS = /\[\[[A-Z]+(?::[^\]]*)?\]\]/g;

const useReveal = (text, enabled) => {
    const full = String(text ?? "").replace(MARKERS, "").trim();
    const [shown, setShown] = useState(enabled ? "" : full);

    useEffect(() => {
        if (!enabled) {
            setShown(full);
            return undefined;
        }

        const parts = full.split(/(\s+)/);
        const words = Math.ceil(parts.length / 2) || 1;
        const perTick = Math.max(1, Math.ceil(words / (REVEAL_MS / TICK_MS)));

        let at = 0;
        setShown("");

        const timer = setInterval(() => {
            at += perTick;

            // Two entries per word - the word and the gap after it.
            setShown(parts.slice(0, at * 2).join(""));

            if (at >= words) {
                clearInterval(timer);

                // Ends on the real string, never on a slice of it: a reveal
                // that stops a character short is a typo nobody can find.
                setShown(full);
            }
        }, TICK_MS);

        return () => clearInterval(timer);
    }, [full, enabled]);

    return { shown, done: shown.length >= full.length };
};

export const Answer = ({ text, typing, onDone }) => {
    const styles = useThemedStyles(makeStyles);
    const { shown, done } = useReveal(text, Boolean(typing));
    const blocks = blocksFrom(shown);

    /*
     * Told when the answer has finished arriving.
     *
     * The suggested cards under a reply were appearing beside the first word
     * of it, so somebody was offered something to book before they had read
     * what it was for. Mohan asked for them after the typing, and the only
     * thing that knows when typing ends is this.
     */
    useEffect(() => {
        if (done) onDone?.();
    }, [done, onDone]);

    return (
        <View style={{ gap: space.md }}>
            {blocks.map((block, i) => {
                if (block.kind === "p") {
                    const last = i === blocks.length - 1;

                    return (
                        <Text key={i} style={styles.paragraph}>
                            {withEmphasis(block.text, styles)}

                            {/* A caret while it is still being written. Not a
                                blinking one - a blink is a timer per reply for
                                decoration, and this says the same thing. */}
                            {!done && last ? <Text style={styles.caret}>{"▍"}</Text> : null}
                        </Text>
                    );
                }

                return (
                    <View key={i} style={{ gap: space.sm }}>
                        {block.items.map((item, j) => (
                            <View key={j} style={styles.item}>
                                {block.ordered ? (
                                    <View style={styles.number}>
                                        <Text style={styles.numberText}>{j + 1}</Text>
                                    </View>
                                ) : (
                                    <View style={styles.dot} />
                                )}

                                <Text style={[styles.paragraph, { flex: 1 }]}>
                                    {withEmphasis(item, styles)}
                                </Text>
                            </View>
                        ))}
                    </View>
                );
            })}
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    paragraph: {
        fontFamily: font.body,
        fontSize: 14.5,
        lineHeight: 22,
        color: colors.ink,
    },
    bold: { fontFamily: font.bold, color: colors.ink },
    caret: { color: colors.accent },

    item: { flexDirection: "row", alignItems: "flex-start", gap: space.sm + 2 },

    // Sits on the first line's optical centre rather than its top, which is
    // where a bullet aligned to the box always looks a little high
    dot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: colors.accent,
        marginTop: 8,
    },

    number: {
        width: 19, height: 19, borderRadius: radius.pill,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
        marginTop: 1.5,
    },
    numberText: { fontFamily: font.bold, fontSize: 10.5, color: colors.accent },
});
