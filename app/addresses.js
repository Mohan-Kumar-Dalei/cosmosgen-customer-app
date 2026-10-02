import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { oneLine, useAddresses } from "../src/addresses";
import { PageHeader } from "../src/PageHeader";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { Button, Confirm, Empty, Notice, Small } from "../src/ui";
import { Icon } from "../src/Icon";

/**
 * Everywhere this customer might want somebody sent, as a list to choose from.
 *
 * The reference kit calls this Confirm address and that is exactly what it is
 * for: a radio against each saved place, a dashed box to add another, and one
 * button at the foot. The editing that used to happen in place has moved to its
 * own screen - a list somebody is picking from should not also be a form.
 *
 * It answers two jobs. Opened from the account it is an address book, and the
 * button says Done. Opened from a booking with `pick=1` it is the confirm step,
 * the choice is handed back, and the button continues the booking.
 */
export default function Addresses() {
    const router = useRouter();
    const { pick } = useLocalSearchParams();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const book = useAddresses();

    const chosenId = book.items.find((a) => a.isDefault)?._id || book.items[0]?._id;
    const [selected, setSelected] = useState(null);
    const [doomed, setDoomed] = useState(null);
    const [busy, setBusy] = useState(false);

    const current = selected || chosenId;

    const done = async () => {
        // Choosing here is choosing the default. The booking reads the default
        // rather than being handed a value, so the two cannot disagree.
        if (current && current !== chosenId) {
            setBusy(true);
            await book.makeDefault(current);
            setBusy(false);
        }

        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)/account");
    };

    const remove = async () => {
        setBusy(true);
        await book.remove(doomed._id);
        setBusy(false);
        setDoomed(null);
    };

    return (
        <View style={s.page}>
            <PageHeader title={pick ? "Confirm address" : "Manage addresses"} />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + 108,
                }}
                showsVerticalScrollIndicator={false}
            >
                <Notice>{book.error}</Notice>

                {!book.loading && !book.items.length ? (
                    <View style={{ marginTop: space.xxl }}>
                        <Empty
                            icon="map-pin"
                            title="No address saved yet"
                            hint="Add the door an engineer should come to. You can keep as many as you like - home, the office, a parent's flat."
                        />
                    </View>
                ) : (
                    <View style={s.list}>
                        {book.items.map((item, i) => {
                            const on = current === item._id;

                            return (
                                <Pressable
                                    key={item._id}
                                    onPress={() => setSelected(item._id)}
                                    android_ripple={null}
                                    style={[s.row, i > 0 ? s.divided : null]}
                                >
                                    <Icon
                                        name="map-pin"
                                        size={17}
                                        color={on ? colors.field : colors.inkFaint}
                                    />

                                    <View style={{ flex: 1 }}>
                                        <Text style={s.label} numberOfLines={1}>
                                            {item.label || "Address"}
                                        </Text>
                                        <Small style={s.line} numberOfLines={2}>
                                            {oneLine(item)}
                                        </Small>
                                    </View>

                                    {/*
                                      * A long press deletes rather than a bin
                                      * on every row. The list is read far more
                                      * often than it is edited, and a row of
                                      * delete buttons beside a row of radios is
                                      * two taps that look alike.
                                      */}
                                    <Pressable
                                        onPress={() => router.push("/address/new?id=" + item._id)}
                                        hitSlop={8}
                                        android_ripple={null}
                                        accessibilityLabel={"Edit " + (item.label || "address")}
                                    >
                                        <Icon name="edit-2" size={15} color={colors.inkFaint} />
                                    </Pressable>

                                    <Pressable
                                        onPress={() => setDoomed(item)}
                                        hitSlop={8}
                                        android_ripple={null}
                                        accessibilityLabel={"Remove " + (item.label || "address")}
                                    >
                                        <Icon name="trash-2" size={15} color={colors.inkFaint} />
                                    </Pressable>

                                    <View style={[s.radio, on ? s.radioOn : null]}>
                                        {on ? <View style={s.dot} /> : null}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* ---- the dashed box the reference puts under the list ---- */}
                <Pressable
                    onPress={() => router.push("/address/new")}
                    android_ripple={null}
                    style={s.add}
                >
                    <Icon name="plus" size={17} color={colors.field} />
                    <Text style={s.addText}>Add a new address</Text>
                </Pressable>
            </ScrollView>

            <View style={[s.dock, { paddingBottom: insets.bottom + space.md }]}>
                <Button
                    icon={pick ? "arrow-right" : "check"}
                    busy={busy}
                    disabled={!book.items.length}
                    onPress={done}
                >
                    {pick ? "Continue" : "Done"}
                </Button>
            </View>

            <Confirm
                open={Boolean(doomed)}
                title="Remove this address?"
                badge={doomed?.label || "Address"}
                body={"“" + (doomed?.label || "This address") + "” will be taken off your account. Jobs already booked to it are not affected."}
                confirmLabel="Yes, remove"
                cancelLabel="Cancel"
                busy={busy}
                onConfirm={remove}
                onCancel={() => setDoomed(null)}
            />
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

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
        paddingVertical: space.lg - 2,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.hairline },

    label: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
    line: { fontSize: 12, lineHeight: 17, marginTop: 1 },

    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.hairlineStrong,
        alignItems: "center", justifyContent: "center",
    },
    radioOn: { borderColor: colors.field },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.field },

    /*
     * Dashed, as the reference draws it. The broken line is what says "this is
     * where another one would go" rather than "this is another one".
     */
    add: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space.sm,
        marginTop: space.lg,
        paddingVertical: space.lg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.accentEdge,
        backgroundColor: colors.accentTint,
    },
    addText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.field },

    dock: {
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
    },
});
