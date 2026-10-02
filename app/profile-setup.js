import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fixPosition } from "../src/location";
import { useSession } from "../src/session";
import { font, space, useColors, useThemedStyles } from "../src/theme";
import { Button, Display, Field, Lede, Notice, Small } from "../src/ui";
import { useKeyboardPad, useKeyboardScroll } from "../src/keyboard";

/**
 * The two things we cannot book a job without.
 *
 * Asked once, on the way in, rather than at the moment somebody is trying to
 * book - which is the version where a customer with a flooded bathroom is made
 * to fill in a form. The pin is what the office actually uses; the typed
 * address is what the engineer reads at the gate, so both are kept.
 *
 * "Once" now means once across the whole product. WhatsApp reads the address
 * off this account rather than asking for a live location in the chat, which
 * was the thing Mohan wanted gone - a customer being asked to share where they
 * are, over and over, in a conversation. So both fields here are required:
 * this screen is the only place either of them is collected.
 *
 * The language is deliberately not here. The app opens in English and asks
 * inside the booking flow instead, where the answer starts to matter - one
 * fewer question between somebody installing this and being able to use it.
 */

export default function ProfileSetup() {
    // Room for the keyboard, measured rather than assumed - see src/keyboard.js
    const keyboardPad = useKeyboardPad();
    const scroll = useKeyboardScroll();
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();
    const { customer, saveProfile } = useSession();

    const [name, setName] = useState(customer?.name || "");
    const [address, setAddress] = useState(customer?.address || "");
    const [pin, setPin] = useState(
        Number.isFinite(customer?.lat) ? { lat: customer.lat, lon: customer.lon } : null
    );

    const [locating, setLocating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const locate = async () => {
        setLocating(true);
        setError("");

        const res = await fixPosition();
        setLocating(false);

        if (!res.ok) return setError(res.message);
        setPin({ lat: res.lat, lon: res.lon });
    };

    const save = async () => {
        if (name.trim().length < 2) return setError("Tell us what to call you.");

        /*
         * The pin, not the written address, and not one or the other.
         *
         * The office finds the nearest engineer by distance, so a booking with
         * no coordinates is refused outright - and this is now the only place
         * in the whole product that collects them. WhatsApp used to ask as
         * well and does not any more: it reads the address off this account
         * instead, so somebody who skipped this step would reach the end of a
         * conversation there and find the booking could not be made, with no
         * way left to fix it.
         */
        if (!pin) {
            return setError("Tap Use my current location - the office needs the pin to find somebody near you.");
        }
        if (address.trim().length < 8) {
            return setError("Add your flat or building and a landmark, so the engineer finds the gate.");
        }

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
        router.replace("/(tabs)");
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
                    paddingHorizontal: space.lg,
                    paddingTop: insets.top + space.lg,
                    paddingBottom: insets.bottom + space.xxl + keyboardPad,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/*
                  * An initial in a disc, a centred heading, then the form -
                  * the reference kit's "Complete your profile" laid out its
                  * way, and better here than the photograph that was above it:
                  * on a short handset the picture pushed the first field under
                  * the keyboard.
                  *
                  * The disc carries a letter rather than a camera. There is no
                  * profile photograph in this product and no reason to ask for
                  * one - the engineer is given a name and a door, and a picture
                  * of the customer is something to store and protect for no
                  * benefit to anybody.
                  */}
                <View style={s.avatar}>
                    <Text style={s.avatarInitial}>
                        {(name.trim().charAt(0) || "?").toUpperCase()}
                    </Text>
                </View>

                <Display style={s.title}>Complete your profile</Display>
                <Lede style={s.subtitle}>
                    Only the office and the engineer coming to you ever see this. Your name so
                    they know who to ask for, and your door so we can send somebody near you.
                </Lede>

                <Field
                    label="Your name"
                    value={name}
                    onChangeText={(t) => { setName(t); setError(""); }}
                    placeholder="Name"
                    autoCapitalize="words"
                    style={{ marginTop: space.xl }}
                />

                <View style={{ marginTop: space.lg }}>
                    <Button
                        tone={pin ? "quiet" : "field"}
                        icon={pin ? "check" : "navigation"}
                        busy={locating}
                        onPress={locate}
                    >
                        {pin ? "Location saved" : "Use my current location"}
                    </Button>
                    <Small style={{ marginTop: space.sm }}>
                        Stand at the door when you tap this. The office finds the nearest engineer
                        from this pin, so it is the pin that has to be right - and it is asked for
                        once, here, rather than every time you message us.
                    </Small>
                </View>

                <Field
                    label="Address, in your own words"
                    value={address}
                    onChangeText={(t) => { setAddress(t); setError(""); }}
                    placeholder="Flat, building, landmark"
                    multiline
                    style={{ marginTop: space.lg }}
                    hint="What the engineer reads at the gate - the flat number and the nearest landmark are worth more than the street."
                />

                <View style={{ marginTop: space.xl }}>
                    <Notice>{error}</Notice>
                    <Button icon="arrow-right" busy={busy} onPress={save}>
                        Save and start
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    avatar: {
        alignSelf: "center",
        width: 92, height: 92, borderRadius: 46,
        marginTop: space.lg,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    avatarInitial: { fontFamily: font.displayBold, fontSize: 36, color: colors.accentDeep },

    // Centred, as the reference sets every screen in this part of the app.
    title: { marginTop: space.xl, textAlign: "center", fontSize: 26, lineHeight: 32 },
    subtitle: {
        marginTop: space.sm,
        marginBottom: space.lg,
        textAlign: "center",
        fontSize: 13.5,
        lineHeight: 20,
    },
});
