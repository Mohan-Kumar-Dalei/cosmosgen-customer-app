import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AT_THE_DOOR } from "../src/brand";
import { WhatsAppMark } from "../src/Marks";
import { useSession } from "../src/session";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { Art, Body, Button, Display, Field, Greeting, Lede, Notice, Small } from "../src/ui";
import { useKeyboardPad, useKeyboardScroll } from "../src/keyboard";
import { tick } from "../src/touch";
import { Icon } from "../src/Icon";

/**
 * A number, then six digits from WhatsApp.
 *
 * The same two steps as the website, in the same order and with the same
 * words - including the button, which says where the code is going rather than
 * "Continue". There is no password here and there never will be: the number
 * somebody books on is the number we send the job to, so it is the only thing
 * worth proving.
 */
export default function Login() {
    // Room for the keyboard, measured rather than assumed - see src/keyboard.js
    const keyboardPad = useKeyboardPad();
    const scroll = useKeyboardScroll();
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();
    const { requestCode, signIn } = useSession();

    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [sent, setSent] = useState(false);
    const [returning, setReturning] = useState(null);
    const [wait, setWait] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // The resend countdown. One second at a time, and only while there is
    // something to count.
    useEffect(() => {
        if (wait <= 0) return undefined;
        const t = setTimeout(() => setWait((n) => n - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    /**
     * Out of the sign-in screen, wherever it was opened from.
     *
     * `router.back()` on its own throws here, and did: a phone that has already
     * been through the introduction opens straight onto this screen, so there
     * is nothing underneath it to go back to and the navigator refuses the
     * action. When that is the case the introduction is where back belongs -
     * it is the only screen above this one that exists.
     */
    const leave = () => {
        if (router.canGoBack()) router.back();
        else router.replace("/welcome");
    };

    const ask = async () => {
        if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10 digit mobile number.");

        setBusy(true);
        setError("");

        const res = await requestCode(phone);
        setBusy(false);

        if (!res.ok) {
            if (res.retryAfter) setWait(res.retryAfter);
            return setError(res.message);
        }

        // The code is on its way - worth feeling, unlike every other tap.
        tick();
        setSent(true);
        setReturning(res.returning ? res.name : null);
        setWait(res.retryAfter || 45);
    };

    const enter = async () => {
        if (code.length !== 6) return setError("Enter the six digits from WhatsApp.");

        setBusy(true);
        setError("");

        const res = await signIn(phone, code);
        setBusy(false);

        if (!res.ok) return setError(res.message);

        // A row with a phone number and nothing else is somebody's first time.
        // They are asked for their name and their door before they are dropped
        // into an account that has nothing in it.
        router.replace(res.needsProfile ? "/profile-setup" : "/(tabs)");
    };

    return (
        /*
         * A plain box, deliberately.
         *
         * This was a KeyboardAvoidingView. On Android "height" shrinks the
         * whole container by the keyboard's height - so the page above slid
         * up - and the scroller below already keeps that same room as bottom
         * padding, which meant the keyboard was being paid for twice. The
         * padding is the half that works: it lets the field scroll up to the
         * thumb without anything on the page moving on its own.
         */
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            <ScrollView
                ref={scroll.ref}
                onScroll={scroll.onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{
                    paddingTop: insets.top + space.md,
                    paddingBottom: insets.bottom + space.xxl + keyboardPad,
                    paddingHorizontal: space.lg,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Pressable onPress={leave} style={s.back} hitSlop={10}>
                    <Icon name="arrow-left" size={20} color={colors.ink} />
                </Pressable>

                {/*
                  * A centred heading over a plain form, which is the reference
                  * kit's shape for every screen in this part of the app.
                  *
                  * The illustration that used to sit above it has gone. On a
                  * screen whose whole job is one field and one button a
                  * photograph is decoration standing between somebody and the
                  * thing they came to do, and on a short handset it pushed the
                  * button under the keyboard.
                  */}
                {!sent ? (
                    <>
                        <Display style={s.title}>Sign in</Display>
                        <Lede style={s.subtitle}>
                            Hi! Enter the number you message us on - we send six digits to it
                            on WhatsApp, so there is no password to remember or lose.
                        </Lede>

                        <Field
                            label="Mobile number"
                            prefix="+91"
                            value={phone}
                            onChangeText={(t) => { setPhone(t.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                            keyboardType="number-pad"
                            placeholder="10 digit number"
                            returnKeyType="done"
                            onSubmitEditing={ask}
                            style={{ marginTop: space.md }}
                        />

                        <View style={{ marginTop: space.lg }}>
                            <Notice>{error}</Notice>
                            <Button mark={WhatsAppMark} busy={busy} onPress={ask}>
                                Send WhatsApp code
                            </Button>
                        </View>
                    </>
                ) : (
                    <>
                        <Display style={s.title}>
                            {returning ? "Welcome back, " + returning.split(" ")[0] : "Verify code"}
                        </Display>
                        <Lede style={s.subtitle}>
                            Six digits, good for ten minutes. We sent them on WhatsApp to
                            +91 {phone}.
                        </Lede>

                        <CodeBoxes value={code} onChange={(t) => { setCode(t); setError(""); }} onDone={enter} />

                        <View style={{ marginTop: space.lg }}>
                            <Notice>{error}</Notice>
                            <Button icon="arrow-right" busy={busy} onPress={enter}>
                                Sign in
                            </Button>
                        </View>

                        <View style={s.resend}>
                            {wait > 0 ? (
                                <Small>Ask for a new code in {wait}s</Small>
                            ) : (
                                <Button tone="plain" icon="refresh-cw" small onPress={ask} busy={busy}>
                                    Send it again
                                </Button>
                            )}

                            <Button
                                tone="plain"
                                small
                                onPress={() => { setSent(false); setCode(""); setError(""); }}
                            >
                                Change number
                            </Button>
                        </View>

                        {/*
                          * What this screen will and will not ask for.
                          *
                          * The one line worth printing under a code box: the
                          * commonest way anybody loses money to somebody
                          * claiming to be a repair company is reading a code
                          * out over the phone. Saying it here costs a line and
                          * is the only security advice this app is in a
                          * position to give.
                          */}
                        <View style={s.safety}>
                            <Icon name="shield" size={14} color={colors.inkFaint} />
                            <Small style={{ flex: 1, fontSize: 12 }}>
                                Cosmosgen will never ring you for this code. Type it here and
                                nowhere else.
                            </Small>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

/**
 * Six digits as six boxes, over one invisible field.
 *
 * A code typed into an ordinary text input looks like a door number, and the
 * person typing it is checking each digit against a WhatsApp message as they
 * go - which is impossible when the digits run together in a line. Six boxes
 * give each one a place, so a glance says how many have been entered and which
 * one is next.
 *
 * It is still one TextInput, laid over the boxes at zero opacity. Six real
 * inputs would mean six refs, focus juggling on every keystroke, and a
 * backspace on an empty box that has to reach backwards into the one before
 * it - a well known source of bugs on Android keyboards that do not report
 * key events reliably. One field cannot have any of those problems, and it
 * gets the phone's own SMS autofill for free.
 */
const CodeBoxes = ({ value, onChange, onDone }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const [focused, setFocused] = useState(false);

    const digits = [0, 1, 2, 3, 4, 5];

    return (
        <View style={s.codeWrap}>
            <View style={s.codeRow} pointerEvents="none">
                {digits.map((i) => {
                    const here = focused && value.length === i;
                    const filled = value.length > i;

                    return (
                        <View
                            key={i}
                            style={[
                                s.box,
                                filled ? s.boxFilled : null,
                                here ? s.boxHere : null,
                            ]}
                        >
                            <Body style={s.boxDigit}>{value[i] || ""}</Body>
                        </View>
                    );
                })}
            </View>

            <TextInput
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 6))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={onDone}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                autoFocus
                maxLength={6}
                caretHidden
                selectionColor="transparent"
                style={s.codeInput}
            />
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    // Centred, as the reference sets every screen in this part of the app.
    // A left-aligned heading over a centred form reads as two layouts.
    title: { marginTop: space.xxl, textAlign: "center", fontSize: 28, lineHeight: 34 },
    subtitle: {
        marginTop: space.sm,
        marginBottom: space.xl,
        textAlign: "center",
        fontSize: 13.5,
        lineHeight: 20,
    },

    back: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
        backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.hairline,
    },
    resend: {
        marginTop: space.lg,
        alignItems: "center",
        gap: space.xs,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginTop: space.xl,
    },
    stepDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.field },
    sentRow: {
        backgroundColor: colors.okTint,
        borderRadius: radius.md,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
    },
    stepText: { flex: 1, fontFamily: font.semibold, fontSize: 12.5, color: colors.inkSoft },
    stepOf: { fontSize: 12, color: colors.inkFaint },

    codeWrap: { marginTop: space.lg },
    codeRow: { flexDirection: "row", gap: space.sm },
    box: {
        flex: 1,
        height: 60,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.sunken,
        alignItems: "center",
        justifyContent: "center",
    },
    boxFilled: { backgroundColor: colors.surface, borderColor: colors.hairlineStrong },

    // The one waiting for the next digit, marked by its edge rather than by a
    // blinking caret - there is no caret to blink, the real field is invisible.
    boxHere: { borderColor: colors.field, backgroundColor: colors.surface },
    boxDigit: { fontFamily: font.bold, fontSize: 24, color: colors.ink },

    // Over the boxes, invisible, and the only thing the keyboard is attached
    // to. Opacity rather than display, because a field that is not drawn
    // cannot be focused.
    codeInput: {
        position: "absolute",
        left: 0, right: 0, top: 0, bottom: 0,
        opacity: 0,
        fontSize: 24,
        color: "transparent",
    },

    safety: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginTop: space.xl,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: colors.sunken,
    },
});
