import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { ik } from "../src/brand";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../src/Icon";
import { fixPosition } from "../src/location";
import { takeAndUpload } from "../src/photos";
import { PageHeader } from "../src/PageHeader";
import { useSession } from "../src/session";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { Button, Field, Notice, Rule, Small } from "../src/ui";
import { useKeyboardPad, useKeyboardScroll } from "../src/keyboard";

/**
 * The four facts this company holds about a customer, and the two they can
 * change.
 *
 * This used to be the whole Account tab, with the list of links bolted under
 * it. The reference kit splits them, and it is the better arrangement: the tab
 * somebody opens most often is a short list of destinations, and the form that
 * is filled in once a year sits behind one of them instead of taking the top
 * half of the screen for ever.
 *
 * The number is shown and cannot be edited. It is not a detail of the account,
 * it is what the account is - changing it means signing in with the new one,
 * and a field that looks editable and then refuses is worse than a fact stated
 * plainly.
 */
export default function Profile() {
    const keyboardPad = useKeyboardPad();
    const scroll = useKeyboardScroll();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { customer, saveProfile } = useSession();

    const [name, setName] = useState(customer?.name || "");
    const [address, setAddress] = useState(customer?.address || "");
    const [pin, setPin] = useState(null);

    const [photo, setPhoto] = useState(customer?.photoUrl || "");
    const [photoSaved, setPhotoSaved] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [locating, setLocating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);

    const dirty =
        name !== (customer?.name || "")
        || address !== (customer?.address || "")
        || Boolean(pin);

    const locate = async () => {
        setLocating(true);
        setError("");

        const res = await fixPosition();
        setLocating(false);

        if (!res.ok) return setError(res.message);
        setPin({ lat: res.lat, lon: res.lon });
        setSaved(false);
    };

    /*
     * Uploaded first, then written to the account.
     *
     * Two steps rather than one because they fail differently: a picture that
     * will not upload should say so and leave the rest of the profile alone,
     * and a profile that will not save should not lose a picture already
     * sitting on ImageKit.
     */
    const savePhoto = async (url) => {
        setPhoto(url);
        setError("");
        setPhotoSaved(false);

        const res = await saveProfile({ name: name.trim(), address: address.trim(), photoUrl: url });

        if (!res.ok) return setError(res.message);

        /*
         * Said out loud, because there is no button to press.
         *
         * A picture saves the moment it is chosen - there is nothing to
         * confirm and no reason to make somebody press Save for it. Mohan
         * looked for that button, did not find it, and reasonably assumed
         * nothing had happened. The line below is the whole fix.
         */
        setPhotoSaved(true);
        setTimeout(() => setPhotoSaved(false), 2500);
    };

    const changePhoto = async () => {
        setUploading(true);
        setError("");

        const res = await takeAndUpload({ square: true });
        setUploading(false);

        if (res.cancelled) return;
        if (!res.ok) return setError(res.message);

        await savePhoto(res.url);
    };

    const save = async () => {
        setBusy(true);
        setError("");

        const res = await saveProfile({
            name: name.trim(),
            address: address.trim(),
            lat: pin?.lat,
            lon: pin?.lon,
        });

        setBusy(false);
        if (!res.ok) return setError(res.message);

        setPin(null);
        setSaved(true);
    };

    return (
        <View style={s.page}>
            <PageHeader title="Your profile" />

            <ScrollView
                ref={scroll.ref}
                onScroll={scroll.onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + space.xxl + keyboardPad,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/*
                  * A letter, not a photograph.
                  *
                  * The reference puts a camera on this disc. There is no
                  * profile picture anywhere in this product and no use for one
                  * - the engineer is given a name and a door - so asking for a
                  * face would be collecting something the company then has to
                  * store and protect for nobody's benefit.
                  */}
                {/*
                  * A picture if they want one, a letter if they do not.
                  *
                  * Entirely optional and asked for nowhere else: the engineer
                  * is given a name and a door. It is here because Mohan asked
                  * for the option, and because a face is the one thing an
                  * account screen can show that makes it feel like yours.
                  */}
                <Pressable onPress={changePhoto} android_ripple={null} style={s.avatarWrap}>
                    {photo ? (
                        <Image
                            source={{ uri: ik(photo, "w-240") }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={180}
                            style={s.avatar}
                        />
                    ) : (
                        <View style={s.avatar}>
                            <Text style={s.avatarInitial}>
                                {(name.trim().charAt(0) || customer?.name?.charAt(0) || "?").toUpperCase()}
                            </Text>
                        </View>
                    )}

                    <View style={s.camera}>
                        <Icon
                            name={uploading ? "loader" : "camera"}
                            size={14}
                            color={colors.fieldInk}
                        />
                    </View>
                </Pressable>

                {photoSaved ? (
                    <Small style={s.photoSaved}>Photo saved</Small>
                ) : photo ? (
                    <Pressable onPress={() => savePhoto("")} hitSlop={8} android_ripple={null}>
                        <Small style={s.removePhoto}>Remove photo</Small>
                    </Pressable>
                ) : (
                    <Small style={s.photoHint}>Tap to add a photo</Small>
                )}

                <Text style={s.who}>{customer?.name || "Your details"}</Text>
                <Small style={s.number}>
                    +91 {(customer?.phone || "").replace(/^91/, "")}
                </Small>

                <Field
                    label="Name"
                    value={name}
                    onChangeText={(t) => { setName(t); setSaved(false); setError(""); }}
                    placeholder="Name"
                    autoCapitalize="words"
                    style={{ marginTop: space.xl }}
                />

                <Field
                    label="Address"
                    value={address}
                    onChangeText={(t) => { setAddress(t); setSaved(false); setError(""); }}
                    placeholder="Flat, building, landmark"
                    multiline
                    style={{ marginTop: space.lg }}
                />

                {/*
                  * The language used to be set on this screen and does not
                  * belong on a profile at all. Mohan's rule is that a language
                  * belongs to a job: whichever one a customer books in carries
                  * that job from the first message to the last, and the next
                  * booking is a fresh choice. A switch here could change the
                  * language of a visit already under way.
                  */}

                <Rule style={{ marginVertical: space.lg }} />

                <Button tone="quiet" icon={pin ? "check" : "navigation"} busy={locating} onPress={locate}>
                    {pin ? "New location ready to save" : "Update my location"}
                </Button>

                <View style={{ marginTop: space.lg }}>
                    <Notice>{error}</Notice>
                    {saved ? <Notice tone="brand">Saved.</Notice> : null}

                    <Button icon="check" busy={busy} disabled={!dirty} onPress={save}>
                        Save changes
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    avatarWrap: { alignSelf: "center", marginTop: space.md },
    avatar: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    camera: {
        position: "absolute",
        right: -2, bottom: -2,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: colors.field,
        alignItems: "center", justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.canvas,
    },
    photoSaved: {
        marginTop: space.sm,
        textAlign: "center",
        fontFamily: font.semibold,
        fontSize: 12.5,
        color: colors.ok,
    },
    photoHint: { marginTop: space.sm, textAlign: "center", fontSize: 12 },

    removePhoto: {
        marginTop: space.sm,
        textAlign: "center",
        fontFamily: font.semibold,
        fontSize: 12.5,
        color: colors.danger,
    },
    avatarInitial: { fontFamily: font.displayBold, fontSize: 38, color: colors.accentDeep },

    who: {
        marginTop: space.lg,
        textAlign: "center",
        fontFamily: font.display,
        fontSize: 21,
        color: colors.ink,
    },
    number: { marginTop: 2, textAlign: "center", fontSize: 13 },
});
