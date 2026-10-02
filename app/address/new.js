import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { describeHere, useAddresses } from "../../src/addresses";
import { PlaceSearch } from "../../src/PlaceSearch";
import { PageHeader } from "../../src/PageHeader";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Button, Field, Notice, Small } from "../../src/ui";
import { useKeyboardPad, useKeyboardScroll } from "../../src/keyboard";
import { Icon } from "../../src/Icon";

/**
 * A new door, with the map above it.
 *
 * The reference puts a pin on a map at the top and the form on a sheet
 * underneath, and that order is the right one here for a reason beyond looks:
 * the office finds the nearest engineer by distance, so the pin is the part
 * that has to be correct. Showing it first makes the coordinates the subject of
 * the screen rather than a checkbox at the bottom of a form.
 *
 * What the customer types is not thrown away. The pin is what the dispatcher
 * measures against; the words are what the engineer reads at the gate, and a
 * flat number and a landmark beat a street name every time.
 */
const LABELS = ["Home", "Office", "Parent's house", "Other"];

/** Bhubaneswar, until the phone or a search says otherwise. */
const START = { latitude: 20.2961, longitude: 85.8245, latitudeDelta: 0.04, longitudeDelta: 0.04 };

export default function NewAddress() {
    const router = useRouter();
    const keyboardPad = useKeyboardPad();
    const scroll = useKeyboardScroll();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const book = useAddresses();

    /*
     * The same screen adds and edits.
     *
     * An edit form and an add form for one address would be the same nine
     * fields twice, and the second copy is where the two quietly drift apart.
     * `id` in the route is the whole difference: with it the fields start
     * filled and the button says Save changes.
     */
    const { id } = useLocalSearchParams();
    const editing = book.items.find((a) => a._id === id);

    const [label, setLabel] = useState(LABELS[0]);
    const [picking, setPicking] = useState(false);
    const [address, setAddress] = useState("");
    const [floor, setFloor] = useState("");
    const [landmark, setLandmark] = useState("");
    const [place, setPlace] = useState(null);
    const [region, setRegion] = useState(START);

    const [locating, setLocating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    /*
     * Filled once, when the address this screen is editing arrives.
     *
     * The list is fetched after mount, so the fields cannot be seeded from
     * their initial state. `seeded` is what stops it refilling over somebody's
     * typing every time the list is read again.
     */
    const [seeded, setSeeded] = useState(false);

    if (editing && !seeded) {
        setSeeded(true);
        setLabel(LABELS.includes(editing.label) ? editing.label : LABELS[LABELS.length - 1]);
        setAddress(editing.address || "");
        setFloor(editing.floor || "");
        setLandmark(editing.landmark || "");

        if (Number.isFinite(editing.lat) && Number.isFinite(editing.lon)) {
            setPlace({ lat: editing.lat, lon: editing.lon, label: editing.area || "" });
            setRegion({ ...START, latitude: editing.lat, longitude: editing.lon });
        }
    }

    /*
     * What the last search put in the address box, so a later one can replace
     * it without eating what the customer wrote.
     *
     * The box is theirs - it is where the flat, the building and the gate go,
     * and the engineer finds the door by it - so a search result must never
     * overwrite typing. That was the whole reason this only filled an empty
     * box. But it meant the second search filled nothing at all: the box was
     * no longer empty, it was holding the first search's answer, and Mohan
     * picked a different street and watched the old address stay put.
     *
     * Remembering what was auto-filled separates the two. Text that is still
     * exactly what a pick put there is a pick's to replace; anything else has
     * been touched by hand and is left alone.
     */
    const filled = useRef("");

    const take = (found) => {
        if (!found?.lat || !found?.lon) return;

        setPlace(found);
        setRegion((prev) => ({ ...prev, latitude: found.lat, longitude: found.lon }));

        const next = found.address || found.label || "";
        const theirs = address.trim() && address !== filled.current;

        if (next && !theirs) {
            setAddress(next);
            filled.current = next;
        }

        setError("");
    };

    const here = async () => {
        setLocating(true);
        setError("");

        const res = await describeHere();
        setLocating(false);

        if (!res.ok) return setError(res.message);
        take({ lat: res.lat, lon: res.lon, address: res.address, label: res.area });
    };

    const save = async () => {
        if (!place) return setError("Drop a pin - search for the street or tap Use my current location.");
        if (address.trim().length < 6) return setError("Write the flat or building so the engineer finds the gate.");

        const body = {
            label,
            address: address.trim(),
            floor: floor.trim(),
            landmark: landmark.trim(),
            area: place.label || "",
            lat: place.lat,
            lon: place.lon,
        };

        setBusy(true);
        const ok = editing ? await book.update(editing._id, body) : await book.add(body);
        setBusy(false);

        if (ok) router.back();
    };

    return (
        <View style={s.page}>
            {/* ---- the pin ---- */}
            <View style={s.map}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    region={region}
                    onRegionChangeComplete={setRegion}
                    pointerEvents="none"
                >
                    {place ? (
                        <Marker coordinate={{ latitude: place.lat, longitude: place.lon }} />
                    ) : null}
                </MapView>

                <View style={s.header}>
                    <PageHeader title={editing ? "Edit address" : "Add address"} bare />
                </View>
            </View>

            {/* ---- and the words ---- */}
            <ScrollView
                ref={scroll.ref}
                onScroll={scroll.onScroll}
                scrollEventThrottle={16}
                style={s.sheet}
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingTop: space.lg,
                    paddingBottom: insets.bottom + space.xxl + keyboardPad,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/*
                  * A dropdown rather than a row of chips.
                  *
                  * Four chips took a line and a half and still only offered
                  * four; Mohan asked for the dropdown instead. It also leaves
                  * room to add a label without the row wrapping, which chips
                  * cannot do without rearranging themselves.
                  */}
                <Small style={s.groupLabel}>SAVE ADDRESS AS</Small>

                <Pressable
                    onPress={() => setPicking((n) => !n)}
                    android_ripple={null}
                    style={s.select}
                >
                    <Text style={s.selectText}>{label}</Text>
                    <Icon
                        name={picking ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.inkSoft}
                    />
                </Pressable>

                {picking ? (
                    <View style={s.options}>
                        {LABELS.map((name, i) => (
                            <Pressable
                                key={name}
                                onPress={() => { setLabel(name); setPicking(false); }}
                                android_ripple={null}
                                style={[s.option, i > 0 ? s.divided : null]}
                            >
                                <Text style={s.optionText}>{name}</Text>
                                {label === name ? (
                                    <Icon name="check" size={16} color={colors.field} />
                                ) : null}
                            </Pressable>
                        ))}
                    </View>
                ) : null}

                <PlaceSearch
                    label="Search for the street"
                    onPick={take}
                    style={{ marginTop: space.lg }}
                />

                <Pressable onPress={here} android_ripple={null} style={s.here}>
                    <Icon
                        name={locating ? "loader" : "navigation"}
                        size={16}
                        color={colors.field}
                    />
                    <Text style={s.hereText}>
                        {locating ? "Finding you…" : "Use my current location"}
                    </Text>
                </Pressable>

                {place ? (
                    <View style={s.found}>
                        <Icon name="check-circle" size={14} color={colors.ok} />
                        <Small style={s.foundText} numberOfLines={2}>
                            Pin set{place.label ? " near " + place.label : ""}
                        </Small>
                    </View>
                ) : null}

                <Field
                    label="Complete address"
                    value={address}
                    onChangeText={(t) => { setAddress(t); setError(""); }}
                    placeholder="Flat, building, street"
                    multiline
                    style={{ marginTop: space.lg }}
                />

                <Field
                    label="Floor"
                    value={floor}
                    onChangeText={setFloor}
                    placeholder="Which floor, if it has them"
                    style={{ marginTop: space.lg }}
                />

                <Field
                    label="Landmark"
                    value={landmark}
                    onChangeText={setLandmark}
                    placeholder="What to look for from the road"
                    style={{ marginTop: space.lg }}
                />

                <View style={{ marginTop: space.xl }}>
                    <Notice>{error || book.error}</Notice>
                    <Button icon="check" busy={busy} onPress={save}>
                        {editing ? "Save changes" : "Save address"}
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    map: { height: 250, backgroundColor: colors.iconSurface },
    header: { position: "absolute", left: 0, right: 0, top: 0 },

    /*
     * The sheet rides up over the bottom of the map, the same overlap every
     * other screen in this app uses - a panel that starts where a picture ends
     * reads as two blocks stacked.
     */
    sheet: {
        flex: 1,
        marginTop: -space.xl,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        backgroundColor: colors.canvas,
    },

    groupLabel: {
        fontFamily: font.bold,
        fontSize: 10,
        letterSpacing: 0.7,
        color: colors.inkFaint,
    },
    select: {
        flexDirection: "row",
        alignItems: "center",
        height: 50,
        marginTop: space.sm,
        paddingHorizontal: space.lg,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    selectText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.ink },

    options: {
        marginTop: space.sm,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.hairline },
    optionText: { flex: 1, fontSize: 14, color: colors.ink, fontFamily: font.body },

    here: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginTop: space.lg,
        alignSelf: "flex-start",
    },
    hereText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.field },

    found: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md },
    foundText: { flex: 1, fontSize: 12.5, color: colors.ok },
});
