import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookmarks } from "../src/bookmarks";
import { SERVICE_GROUP, SERVICE_GROUPS } from "../src/brand";
import { useJobs } from "../src/jobs";
import { HeaderButton, PageHeader } from "../src/PageHeader";
import { TradeCard } from "../src/TradeCard";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { Confirm, Empty, Small } from "../src/ui";

/**
 * The trades this customer kept, filtered by the kind of work.
 *
 * Saving a service is not saving a booking: what it holds is "this is the one I
 * call when the AC stops", so the list is short, it changes rarely, and the
 * thing it has to be good at is being found again in a hurry. Hence the chips -
 * with seven trades they are barely needed, and with twenty they are the
 * difference between a list and a pile.
 *
 * Removing asks first. A bookmark is one tap to make and one tap to lose, and
 * the tap that loses it is in the same place on the card as the one that made
 * it - the reference kit puts a sheet in the way for exactly that reason.
 */
export default function Bookmarks() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { services } = useJobs();
    const { keys, remove } = useBookmarks();

    const [group, setGroup] = useState(SERVICE_GROUPS[0]);
    const [doomed, setDoomed] = useState(null);

    const saved = useMemo(
        () => services.filter((item) => keys.includes(item.key)),
        [services, keys]
    );

    const shown = useMemo(() => saved.filter((item) => (
        group === SERVICE_GROUPS[0] || SERVICE_GROUP[item.key] === group
    )), [saved, group]);

    // Only the chips that would actually find something. A filter offering
    // "Cleaning" over a list with no cleaning in it is a dead end.
    const groups = useMemo(() => SERVICE_GROUPS.filter((name) => (
        name === SERVICE_GROUPS[0] || saved.some((item) => SERVICE_GROUP[item.key] === name)
    )), [saved]);

    return (
        <View style={s.page}>
            <PageHeader
                title="Saved"
                right={(
                    <HeaderButton
                        icon="search"
                        label="Search services"
                        onPress={() => router.push("/search")}
                    />
                )}
            />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + space.xxl,
                }}
                showsVerticalScrollIndicator={false}
            >
                {!saved.length ? (
                    <View style={{ marginTop: space.xxl }}>
                        <Empty
                            icon="bookmark"
                            title="Nothing saved yet"
                            hint="Tap the bookmark on any trade and it waits here - the one you call when something stops working."
                        />
                    </View>
                ) : (
                    <>
                        {groups.length > 1 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}
                                style={s.chips}
                            >
                                {groups.map((name) => {
                                    const on = group === name;

                                    return (
                                        <Pressable
                                            key={name}
                                            onPress={() => setGroup(name)}
                                            android_ripple={null}
                                            style={[s.chip, on ? s.chipOn : null]}
                                        >
                                            <Small style={[s.chipText, on ? s.chipTextOn : null]}>
                                                {name}
                                            </Small>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        ) : null}

                        <View style={{ gap: space.md }}>
                            {shown.map((item) => (
                                <TradeCard
                                    key={item.key}
                                    service={item}
                                    wide
                                    onRemove={setDoomed}
                                />
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            <Confirm
                open={Boolean(doomed)}
                title="Remove from saved?"
                badge={doomed?.display || doomed?.label}
                body={(doomed?.display || doomed?.label || "This trade")
                    + " comes off your list. You can save it again from its page at any time."}
                confirmLabel="Yes, remove"
                onConfirm={() => { remove(doomed.key); setDoomed(null); }}
                onCancel={() => setDoomed(null)}
            />
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    chips: { marginHorizontal: -space.lg, marginBottom: space.lg, flexGrow: 0 },
    chip: {
        height: 36,
        justifyContent: "center",
        paddingHorizontal: space.lg,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
    chipText: { fontSize: 13, fontFamily: font.medium, color: colors.inkSoft },
    chipTextOn: { color: colors.canvas, fontFamily: font.semibold },
});
