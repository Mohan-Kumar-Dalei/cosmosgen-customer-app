import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { api, errorFrom } from "./api";
import { ik } from "./brand";
import { Icon } from "./Icon";
import { pickPhoto, uploadPhoto } from "./photos";
import { font, radius, space, useColors, useThemedStyles } from "./theme";
import { Body, Button, Notice, Small, Title } from "./ui";

const WORD = ["", "Poor", "Not great", "Fine", "Good", "Excellent"];

/**
 * What the customer thought, asked once and kept.
 *
 * Stars first, because that is the only part most people will do, and the box
 * and the camera only once a star has been touched - a form in front of
 * somebody who has not yet decided anything is a form.
 *
 * The reason used to be six chips to tap. They were quick and they were also
 * the whole of what anybody could say, so Mohan asked for a box: a customer
 * with something specific to tell the office should not have to pick the
 * nearest of six approved phrases. The pictures are the other half of it - a
 * cleaned kitchen says more than any wording.
 *
 * There is no editing. A rating the office reads as a fact about a visit
 * should not be something a vendor can talk somebody into changing
 * afterwards, so it is asked once, plainly, and then shown back.
 */
export const RateJob = ({ ticket, onRated }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const [stars, setStars] = useState(0);
    const [note, setNote] = useState("");

    /*
     * Pictures of the finished work, up to four.
     *
     * Uploaded as they are chosen rather than when Send is pressed, so the
     * customer sees each one land and the button is never holding four
     * photographs open over a phone connection. What is kept here is the
     * address each one came back with.
     */
    const [photos, setPhotos] = useState([]);
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const given = ticket.rating;

    const addPhoto = async () => {
        setAdding(true);
        setError("");

        const picked = await pickPhoto();

        if (picked.cancelled) return setAdding(false);
        if (!picked.ok) { setAdding(false); return setError(picked.message); }

        const up = await uploadPhoto(picked.asset, { path: "/customer/photo", field: "photo" });
        setAdding(false);

        if (!up.ok) return setError(up.message);
        setPhotos((p) => [...p, up.url].slice(0, 4));
    };

    const send = async () => {
        if (!stars) return setError("Tap a star first.");

        setBusy(true);
        setError("");

        try {
            await api.post("/customer/tickets/" + ticket.id + "/rating", {
                stars,
                comment: note.trim(),
                photos,
            });
            onRated?.();
        } catch (err) {
            setError(errorFrom(err, "Could not save your rating."));
        } finally {
            setBusy(false);
        }
    };

    /* ---- already said, so it is read back rather than asked again ---- */
    if (given) {
        return (
            <View style={[s.card, s.done]}>
                <View style={s.doneHead}>
                    <View style={s.stars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <Icon
                                key={n}
                                name="star"
                                size={17}
                                color={n <= given.stars ? colors.star : colors.hairlineStrong}
                            />
                        ))}
                    </View>
                    <Small style={s.doneWord}>{WORD[given.stars] || ""}</Small>
                </View>

                <Small style={{ marginTop: space.sm }}>
                    {given.note || "Thank you - the office has this on the job."}
                </Small>

                {given.photos?.length ? (
                    <View style={s.shots}>
                        {given.photos.map((url) => (
                            <Image
                                key={url}
                                source={{ uri: ik(url, "w-240") }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                style={s.shot}
                            />
                        ))}
                    </View>
                ) : null}
            </View>
        );
    }

    return (
        <View style={s.card}>
            <Title style={{ fontSize: 18 }}>How did it go?</Title>
            <Small style={{ marginTop: space.xs }}>
                The office reads this before sending the same engineer anywhere else.
            </Small>

            <View style={s.starRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                        key={n}
                        onPress={() => { setStars(n); setError(""); }}
                        hitSlop={6}
                        style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
                        accessibilityLabel={n + " star" + (n === 1 ? "" : "s")}
                    >
                        <Icon
                            name="star"
                            size={34}
                            color={n <= stars ? colors.star : colors.hairlineStrong}
                        />
                    </Pressable>
                ))}
            </View>

            {stars ? (
                <>
                    <Body style={s.word}>{WORD[stars]}</Body>

                    {/*
                      * The reason, in their own words.
                      *
                      * This was six chips to tap. They were quick, and they
                      * were also the whole of what anybody could say - Mohan
                      * asked for a box instead. A customer who wants to tell
                      * the office something specific about the engineer who
                      * came should not have to pick the nearest of six
                      * approved phrases.
                      *
                      * Optional. Most people leave five stars and nothing
                      * else, which is a complete answer.
                      */}
                    <TextInput
                        value={note}
                        onChangeText={(v) => { setNote(v); setError(""); }}
                        placeholder="Anything you want the office to know? (optional)"
                        placeholderTextColor={colors.inkFaint}
                        multiline
                        maxLength={500}
                        style={s.note}
                    />
                </>
            ) : null}

            {stars ? (
                <View style={s.shots}>
                    {photos.map((url) => (
                        <View key={url}>
                            <Image
                                source={{ uri: ik(url, "w-240") }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                style={s.shot}
                            />
                            <Pressable
                                onPress={() => setPhotos((p) => p.filter((x) => x !== url))}
                                hitSlop={8}
                                android_ripple={null}
                                style={s.shotX}
                                accessibilityLabel="Remove this photo"
                            >
                                <Icon name="x" size={12} color={colors.white} />
                            </Pressable>
                        </View>
                    ))}

                    {photos.length < 4 ? (
                        <Pressable
                            onPress={addPhoto}
                            android_ripple={null}
                            style={s.addShot}
                            accessibilityLabel="Add a photo"
                        >
                            <Icon
                                name={adding ? "loader" : "camera"}
                                size={18}
                                color={colors.field}
                            />
                            <Small style={s.addShotText}>
                                {photos.length ? "Add" : "Add a photo"}
                            </Small>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}

            <View style={{ marginTop: space.lg }}>
                <Notice>{error}</Notice>
                <Button icon="check" busy={busy} disabled={!stars} onPress={send}>
                    Send it
                </Button>
            </View>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    shots: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.lg },
    shot: {
        width: 68, height: 68,
        borderRadius: radius.sm + 2,
        backgroundColor: colors.iconSurface,
    },
    shotX: {
        position: "absolute",
        top: -5, right: -5,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: colors.ink,
        alignItems: "center", justifyContent: "center",
    },
    addShot: {
        width: 68, height: 68,
        borderRadius: radius.sm + 2,
        alignItems: "center", justifyContent: "center",
        gap: 2,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.accentEdge,
        backgroundColor: colors.accentTint,
    },
    addShotText: { fontSize: 10, color: colors.field, fontFamily: font.semibold },

    card: {
        marginTop: space.lg,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    done: { backgroundColor: colors.sunkenSoft, borderColor: "transparent" },
    doneHead: { flexDirection: "row", alignItems: "center", gap: space.md },
    doneWord: { fontFamily: font.semibold, color: colors.ink },
    stars: { flexDirection: "row", gap: 3 },

    // Spread across the card rather than bunched, so each one is its own
    // target - five stars in a row at 34 points is the easiest thing on this
    // screen to mis-tap.
    starRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: space.md,
        marginTop: space.xl,
    },
    word: {
        marginTop: space.md,
        textAlign: "center",
        fontFamily: font.semibold,
        fontSize: 16,
        color: colors.ink,
    },

    note: {
        marginTop: space.lg,
        minHeight: 96,
        padding: space.lg,
        borderRadius: radius.md,
        backgroundColor: colors.sunken,
        borderWidth: 1,
        borderColor: colors.hairline,
        fontFamily: font.body,
        fontSize: 14,
        lineHeight: 20,
        color: colors.ink,
        textAlignVertical: "top",
    },
});
