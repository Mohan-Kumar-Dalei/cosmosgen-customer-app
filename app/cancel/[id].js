import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorFrom } from "../../src/api";
import { useJobs } from "../../src/jobs";
import { PageHeader } from "../../src/PageHeader";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Body, Button, Field, Lede, Notice, Small } from "../../src/ui";
import { useKeyboardPad, useKeyboardScroll } from "../../src/keyboard";
import { Icon } from "../../src/Icon";

/**
 * Calling a job off, or asking the office to.
 *
 * Which of the two it is depends on whether anybody has taken the job, and the
 * screen says so before the button is pressed rather than after. That is
 * Mohan's own line, given when he was asked directly: a customer may cancel
 * freely until a vendor accepts, because nothing has been committed and nobody
 * has travelled; after that an engineer may already be on their way, so the
 * same form becomes a request and the office decides.
 *
 * The reasons are the reference kit's, because they are the right ones - they
 * are what people actually say - and they are checked against the same list on
 * the server so a reason cannot arrive that the office has no word for.
 */
const REASONS = [
    "Change in plans",
    "Found another provider",
    "Unexpected work",
    "Change in requirements",
    "Conflict in scheduling",
    "Other",
];

export default function Cancel() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const keyboardPad = useKeyboardPad();
    const scroll = useKeyboardScroll();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { open, closed, reload } = useJobs();

    const ticket = useMemo(
        () => [...open, ...closed].find((t) => t.id === id),
        [open, closed, id]
    );

    const [reason, setReason] = useState(REASONS[0]);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(null);

    // Nobody has accepted it yet, so this ends the job outright. The wording
    // below turns on exactly this.
    const outright = !ticket?.technician
        && ["Pending", "Queued"].includes(String(ticket?.status || ""));

    const send = async () => {
        if (reason === "Other" && note.trim().length < 4) {
            return setError("Say what happened, so the office knows.");
        }

        setBusy(true);
        setError("");

        try {
            const res = await api.post("/customer/tickets/" + id + "/cancel", {
                reason,
                note: note.trim(),
            });

            await reload();
            setDone(res.data?.message || "Done.");
        } catch (err) {
            setError(errorFrom(err, "Could not send that."));
        } finally {
            setBusy(false);
        }
    };

    /* ---- said, and nothing left to do on this screen ---- */
    if (done) {
        return (
            <View style={s.page}>
                <PageHeader title="Cancel booking" />

                <View style={s.doneWrap}>
                    <View style={s.doneMark}>
                        <Icon
                            name={outright ? "check" : "clock"}
                            size={30}
                            color={colors.fieldInk}
                        />
                    </View>

                    <Body style={s.doneTitle}>
                        {outright ? "Cancelled" : "The office has your request"}
                    </Body>
                    <Lede style={s.doneBody}>{done}</Lede>

                    <Button
                        icon="arrow-right"
                        style={{ marginTop: space.xl }}
                        onPress={() => router.replace("/(tabs)/jobs")}
                    >
                        Back to my bookings
                    </Button>
                </View>
            </View>
        );
    }

    return (
        <View style={s.page}>
            <PageHeader title="Cancel booking" />

            <ScrollView
                ref={scroll.ref}
                onScroll={scroll.onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + 108 + keyboardPad,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Lede style={s.lede}>
                    {outright
                        ? "Nobody has taken this job yet, so it stops here and nothing is charged."
                        : "An engineer has accepted this and may already be on the way, so the office decides. They will ring you."}
                </Lede>

                <Body style={s.heading}>Please select the reason</Body>

                <View style={s.list}>
                    {REASONS.map((name, i) => {
                        const on = reason === name;

                        return (
                            <Pressable
                                key={name}
                                onPress={() => { setReason(name); setError(""); }}
                                android_ripple={null}
                                style={[s.row, i > 0 ? s.divided : null]}
                            >
                                <View style={[s.radio, on ? s.radioOn : null]}>
                                    {on ? <View style={s.dot} /> : null}
                                </View>
                                <Body style={s.rowLabel}>{name}</Body>
                            </Pressable>
                        );
                    })}
                </View>

                <Field
                    label={reason === "Other" ? "Tell us what happened" : "Anything else? (optional)"}
                    value={note}
                    onChangeText={(t) => { setNote(t); setError(""); }}
                    placeholder="Enter your reason"
                    multiline
                    style={{ marginTop: space.xl }}
                />

                <Small style={s.small}>
                    {outright
                        ? "You can book the same trade again at any time."
                        : "If somebody has already travelled to your door, a visit charge may apply to cover the trip."}
                </Small>
            </ScrollView>

            <View style={[s.dock, { paddingBottom: insets.bottom + space.md }]}>
                <Notice>{error}</Notice>
                <Button tone="quiet" icon="x" busy={busy} onPress={send}>
                    {outright ? "Cancel this booking" : "Send the request"}
                </Button>
            </View>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    lede: { fontSize: 13.5, lineHeight: 20, marginTop: space.sm },
    heading: { fontFamily: font.semibold, fontSize: 15, marginTop: space.xl, marginBottom: space.md },

    list: {
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md + 1,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.hairline },
    rowLabel: { flex: 1, fontSize: 14 },

    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.hairlineStrong,
        alignItems: "center", justifyContent: "center",
    },
    radioOn: { borderColor: colors.field },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.field },

    small: { fontSize: 12, lineHeight: 18, marginTop: space.lg },

    dock: {
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
    },

    doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl },
    doneMark: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: colors.field,
        alignItems: "center", justifyContent: "center",
    },
    doneTitle: { marginTop: space.lg, fontFamily: font.display, fontSize: 21 },
    doneBody: { marginTop: space.sm, textAlign: "center", fontSize: 13.5, lineHeight: 20 },
});
