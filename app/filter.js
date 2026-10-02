import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useArea } from "../src/area";
import { estimateRange, SERVICE_GROUP, SERVICE_GROUPS } from "../src/brand";
import { BLANK, useFilters } from "../src/filters";
import { useJobs } from "../src/jobs";
import { PageHeader } from "../src/PageHeader";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { RangeSlider } from "../src/RangeSlider";
import { Body, Button, Small } from "../src/ui";
import { Icon } from "../src/Icon";

/**
 * Narrowing the catalogue, and saying what it would leave.
 *
 * The reference kit's filter has a price slider, a star radio and a date strip.
 * Three of those four survive here and one does not, for a reason worth
 * writing down: this company does not sell fixed-price products, so there is
 * nothing to slide between. What it has is an indicative range per trade, so
 * the price control is a budget - show me what starts under this - and it says
 * so.
 *
 * The date strip is gone entirely. A trade is not available on a day; an
 * engineer is, and which one is free is settled by the office after the
 * booking. A date picker here would be a promise the product cannot keep, and
 * the booking flow already asks for the day at the point it can be honoured.
 *
 * The count on the Apply button is the whole reason this screen is worth
 * having. A filter you cannot see the effect of until you close it is a filter
 * people set once and never trust again.
 */
const STARS = [0, 3.5, 4, 4.5];

/** The week ahead, which is as far as the booking flow will take anybody. */
const DAYS = Array.from({ length: 7 }, (_, i) => {
    const at = new Date();
    at.setDate(at.getDate() + i);

    return {
        iso: at.toISOString().slice(0, 10),
        name: i === 0 ? "Today" : at.toLocaleDateString("en-IN", { weekday: "short" }),
        num: at.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    };
});

export default function Filter() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { services } = useJobs();
    const { known, cover } = useArea();
    const { filters, setFilters } = useFilters();

    // Edited on a copy. Backing out of this screen should leave the list
    // exactly as it was, which it cannot do if every tap has already applied.
    const [draft, setDraft] = useState(filters);

    const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

    /*
     * The live count, worked out against the draft rather than against what is
     * applied - the number has to answer "if I press this now", not "what am I
     * looking at behind this screen".
     *
     * Deliberately the same rules as filters.js rather than a call into it:
     * `apply` narrows by what has been committed, and nothing has been
     * committed until the button is pressed.
     */
    const preview = services.filter((service) => {
        const { group, minStars, priceLow, priceHigh, nearbyOnly } = draft;

        if (group !== BLANK.group && SERVICE_GROUP[service.key] !== group) return false;
        if (minStars && Number(service.rating || 0) < minStars) return false;

        const range = estimateRange(service);
        const from = Number(range.from || 0);
        const to = Number(range.to || from);

        if (to < priceLow) return false;
        if (priceHigh < BLANK.priceHigh && from > priceHigh) return false;

        if (nearbyOnly && known) {
            const near = cover(service.key);
            if (near && !near.available) return false;
        }

        return true;
    }).length;

    return (
        <View style={s.page}>
            <PageHeader title="Filter" />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + 112,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* ---- the kind of work ---- */}
                <Body style={s.heading}>Category</Body>

                <View style={s.chips}>
                    {SERVICE_GROUPS.map((name) => {
                        const on = draft.group === name;

                        return (
                            <Pressable
                                key={name}
                                onPress={() => set({ group: name })}
                                android_ripple={null}
                                style={[s.chip, on ? s.chipOn : null]}
                            >
                                <Small style={[s.chipText, on ? s.chipTextOn : null]}>{name}</Small>
                            </Pressable>
                        );
                    })}
                </View>

                {/* ---- what they want to spend ---- */}
                <Body style={s.heading}>Price range</Body>
                <Small style={s.note}>
                    Matched against what a trade usually comes to. The real figure is agreed at
                    your door once the engineer has looked.
                </Small>

                <RangeSlider
                    min={0}
                    max={2000}
                    step={100}
                    low={draft.priceLow}
                    high={draft.priceHigh}
                    onChange={({ low, high }) => set({ priceLow: low, priceHigh: high })}
                />

                {/* ---- what other people said ---- */}
                <Body style={s.heading}>Rating</Body>

                <View style={s.radios}>
                    {STARS.map((value) => {
                        const on = draft.minStars === value;

                        return (
                            <Pressable
                                key={value}
                                onPress={() => set({ minStars: value })}
                                android_ripple={null}
                                style={s.radioRow}
                            >
                                <View style={s.stars}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <Icon
                                            key={n}
                                            name="star"
                                            size={13}
                                            color={value && n <= Math.round(value)
                                                ? colors.star
                                                : colors.hairlineStrong}
                                        />
                                    ))}
                                </View>

                                <Small style={s.radioLabel}>
                                    {value ? value.toFixed(1) + " and above" : "Any rating"}
                                </Small>

                                <View style={[s.radio, on ? s.radioOn : null]}>
                                    {on ? <View style={s.dot} /> : null}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                {/* ---- and when they want somebody ---- */}
                <Body style={s.heading}>When</Body>
                <Small style={s.note}>
                    Carried into the booking so you are not asked twice. Which engineer is free
                    that day is settled by the office after you book.
                </Small>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}
                    style={s.days}
                >
                    <Pressable
                        onPress={() => set({ onDay: null })}
                        android_ripple={null}
                        style={[s.day, !draft.onDay ? s.dayOn : null]}
                    >
                        <Small style={[s.dayName, !draft.onDay ? s.dayTextOn : null]}>Any</Small>
                        <Small style={[s.dayNum, !draft.onDay ? s.dayTextOn : null]}>day</Small>
                    </Pressable>

                    {DAYS.map((d) => {
                        const on = draft.onDay === d.iso;

                        return (
                            <Pressable
                                key={d.iso}
                                onPress={() => set({ onDay: d.iso })}
                                android_ripple={null}
                                style={[s.day, on ? s.dayOn : null]}
                            >
                                <Small style={[s.dayName, on ? s.dayTextOn : null]}>{d.name}</Small>
                                <Small style={[s.dayNum, on ? s.dayTextOn : null]}>{d.num}</Small>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* ---- and whether we come to them ---- */}
                {known ? (
                    <Pressable
                        onPress={() => set({ nearbyOnly: !draft.nearbyOnly })}
                        android_ripple={null}
                        style={s.toggleRow}
                    >
                        <View style={{ flex: 1 }}>
                            <Body style={s.toggleLabel}>Only what we cover near you</Body>
                            <Small style={{ marginTop: 1 }}>
                                Hides trades with no engineer working in your area yet.
                            </Small>
                        </View>

                        <View style={[s.check, draft.nearbyOnly ? s.checkOn : null]}>
                            {draft.nearbyOnly
                                ? <Icon name="check" size={14} color={colors.fieldInk} />
                                : null}
                        </View>
                    </Pressable>
                ) : null}
            </ScrollView>

            <View style={[s.dock, { paddingBottom: insets.bottom + space.md }]}>
                <Pressable
                    onPress={() => setDraft(BLANK)}
                    android_ripple={null}
                    style={s.reset}
                >
                    <Small style={s.resetText}>Reset</Small>
                </Pressable>

                <View style={{ flex: 1 }}>
                    <Button
                        icon="check"
                        onPress={() => { setFilters(draft); router.back(); }}
                    >
                        {preview === services.length
                            ? "Show everything"
                            : "Show " + preview + (preview === 1 ? " trade" : " trades")}
                    </Button>
                </View>
            </View>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    heading: { fontFamily: font.semibold, fontSize: 15, marginTop: space.xl },
    note: { fontSize: 12, lineHeight: 17, marginTop: 2 },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
    chip: {
        height: 38,
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

    days: { marginHorizontal: -space.lg, marginTop: space.md, flexGrow: 0 },
    day: {
        minWidth: 66,
        alignItems: "center",
        paddingVertical: space.sm + 2,
        paddingHorizontal: space.md,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    dayOn: { backgroundColor: colors.field, borderColor: colors.field },
    dayName: { fontFamily: font.semibold, fontSize: 12, color: colors.ink },
    dayNum: { fontSize: 11, color: colors.inkFaint },
    dayTextOn: { color: colors.fieldInk },

    radios: {
        marginTop: space.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    stars: { flexDirection: "row", gap: 2 },
    radioLabel: { flex: 1, fontSize: 13 },

    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.hairlineStrong,
        alignItems: "center", justifyContent: "center",
    },
    radioOn: { borderColor: colors.field },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.field },

    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        marginTop: space.xl,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    toggleLabel: { fontFamily: font.semibold, fontSize: 13.5 },
    check: {
        width: 24, height: 24, borderRadius: 7,
        borderWidth: 1.5,
        borderColor: colors.hairlineStrong,
        alignItems: "center", justifyContent: "center",
    },
    checkOn: { backgroundColor: colors.field, borderColor: colors.field },

    dock: {
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
    },
    reset: {
        height: 50,
        justifyContent: "center",
        paddingHorizontal: space.lg,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.sunken,
    },
    resetText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.inkSoft },
});
