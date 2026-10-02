import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SERVICE_GROUP } from "../src/brand";
import { useJobs } from "../src/jobs";
import { PageHeader } from "../src/PageHeader";
import { TradeCard } from "../src/TradeCard";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { Empty, Small, Title } from "../src/ui";
import { vaultGet, vaultSet } from "../src/vault";
import { Icon } from "../src/Icon";

/**
 * Finding one trade among seven, and remembering the last few.
 *
 * Two lists and which one you see depends on whether there is anything in the
 * box. Empty, it shows what was searched before and what was looked at before;
 * typing, it shows what matches. That is the reference kit's arrangement and it
 * is the right one - a search screen that is blank until you type wastes the
 * most useful thing it knows, which is what you did last time.
 *
 * Both lists live on the phone rather than on the account. They are a
 * convenience for this handset and nothing the office has any use for, and a
 * server round trip to find out what somebody typed yesterday is a round trip
 * spent on nothing.
 */
const RECENT_TERMS = "cosmosgen.search.terms";
const RECENT_SEEN = "cosmosgen.search.seen";
const KEEP = 6;

/** Remembered from the service page, so "Recent view" has something in it. */
export const rememberViewed = async (key) => {
    try {
        const raw = await vaultGet(RECENT_SEEN);
        const list = raw ? JSON.parse(raw) : [];
        const next = [key, ...list.filter((k) => k !== key)].slice(0, KEEP);
        await vaultSet(RECENT_SEEN, JSON.stringify(next));
    } catch {
        // A history that did not save is a history that is shorter. Never
        // worth failing the screen somebody was actually opening.
    }
};

/**
 * Is `b` reachable from `a` by adding, dropping or changing one letter?
 *
 * A single-edit check rather than a full Levenshtein distance: it answers the
 * only question worth asking here - did they fat-finger one key - and it stops
 * at the first second difference instead of building a matrix per word.
 *
 * Prefixes count, so "wash" still finds "washing" while it is being typed.
 */
const within1 = (a, b) => {
    if (a.startsWith(b)) return true;
    if (Math.abs(a.length - b.length) > 1) return false;

    let i = 0;
    let j = 0;
    let slips = 0;

    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { i += 1; j += 1; continue; }

        slips += 1;
        if (slips > 1) return false;

        if (a.length > b.length) i += 1;
        else if (a.length < b.length) j += 1;
        else { i += 1; j += 1; }
    }

    return slips + (a.length - i) + (b.length - j) <= 1;
};

export default function Search() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { services } = useJobs();

    const [term, setTerm] = useState("");
    const [terms, setTerms] = useState([]);
    const [seen, setSeen] = useState([]);

    const read = useCallback(async () => {
        try {
            const [a, b] = await Promise.all([vaultGet(RECENT_TERMS), vaultGet(RECENT_SEEN)]);
            setTerms(a ? JSON.parse(a) : []);
            setSeen(b ? JSON.parse(b) : []);
        } catch {
            setTerms([]);
            setSeen([]);
        }
    }, []);

    useEffect(() => { read(); }, [read]);

    const keep = async (word) => {
        const next = [word, ...terms.filter((t) => t !== word)].slice(0, KEEP);
        setTerms(next);
        try { await vaultSet(RECENT_TERMS, JSON.stringify(next)); } catch { /* shorter history */ }
    };

    const forget = async (word) => {
        const next = terms.filter((t) => t !== word);
        setTerms(next);
        try { await vaultSet(RECENT_TERMS, JSON.stringify(next)); } catch { /* it stays */ }
    };

    const query = term.trim().toLowerCase();

    /*
     * Searched here rather than on the server.
     *
     * The whole catalogue is seven rows and it is already on the phone - a
     * request per keystroke would be a round trip to find something sitting in
     * memory, and it would stop working the moment the signal did.
     */
    const hits = useMemo(() => {
        if (!query) return [];

        const haystackOf = (service) => [
            service.display, service.label, service.blurb, SERVICE_GROUP[service.key],
            ...(service.appliances || []).map((a) => a.display || a.label),
            ...(service.appliances || []).flatMap((a) => (a.issues || []).map((i) => i.display || i.label)),
            ...(service.issues || []).map((i) => i.display || i.label),
        ].join(" ").toLowerCase();

        /*
         * Machines first, then trades.
         *
         * "Washing machine" is a machine, not a trade, and returning the trade
         * it lives inside is the search answering a different question - Mohan
         * typed it and got AC & Appliance Repair. So every appliance is
         * checked on its own name and its own faults, and a hit gives back a
         * card for that machine.
         *
         * A trade only appears when the words match the trade itself rather
         * than something under it, which stops "washing machine" returning
         * both the machine and its parent.
         */
        const machineHits = services.flatMap((s2) => (s2.appliances || [])
            .filter((a) => [
                a.display, a.label,
                ...(a.issues || []).map((i) => i.display || i.label),
            ].join(" ").toLowerCase().includes(query))
            .map((a) => ({ service: s2, machine: a })));

        const tradeHits = services
            .filter((s2) => [
                s2.display, s2.label, s2.blurb, SERVICE_GROUP[s2.key],
                ...(s2.issues || []).map((i) => i.display || i.label),
            ].join(" ").toLowerCase().includes(query))
            .map((s2) => ({ service: s2, machine: null }));

        const exact = [...machineHits, ...tradeHits];
        if (exact.length) return exact;

        /*
         * Nothing matched, so try again forgiving one slip.
         *
         * Mohan typed "Wasing" and got an empty screen, which is the worst
         * answer a search can give somebody who is right about what they want.
         * A single missing, extra or wrong letter is the overwhelming majority
         * of typing mistakes on a phone keyboard, and checking for it costs a
         * pass over seven rows.
         *
         * Deliberately only when nothing matched exactly. A fuzzy match that
         * runs first turns a precise search into a vague one.
         */
        const loose = (text) => text.toLowerCase()
            .split(/[^a-z0-9]+/)
            .some((word) => word.length > 2 && within1(word, query));

        const machineNear = services.flatMap((s2) => (s2.appliances || [])
            .filter((a) => loose([a.display, a.label].join(" ")))
            .map((a) => ({ service: s2, machine: a })));

        if (machineNear.length) return machineNear;

        return services
            .filter((s2) => loose(haystackOf(s2)))
            .map((s2) => ({ service: s2, machine: null }));
    }, [services, query]);

    const viewed = useMemo(
        () => seen.map((key) => services.find((x) => x.key === key)).filter(Boolean),
        [seen, services]
    );

    const open = (hit) => {
        if (query) keep(term.trim());

        router.push(
            "/service/" + hit.service.key
            + (hit.machine ? "?appliance=" + hit.machine.key : "")
        );
    };

    return (
        <View style={s.page}>
            <PageHeader
                bare
                right={(
                    <View style={s.box}>
                        <Icon name="search" size={17} color={colors.inkFaint} />
                        <TextInput
                            value={term}
                            onChangeText={setTerm}
                            placeholder="Search a trade, a machine, a fault"
                            placeholderTextColor={colors.inkFaint}
                            style={s.input}
                            returnKeyType="search"
                            autoFocus
                            autoCorrect={false}
                            onSubmitEditing={() => term.trim() && keep(term.trim())}
                        />
                        {term ? (
                            <Pressable onPress={() => setTerm("")} hitSlop={10}>
                                <Icon name="x-circle" size={16} color={colors.inkFaint} />
                            </Pressable>
                        ) : null}
                    </View>
                )}
            />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + space.xxl,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {query ? (
                    !hits.length ? (
                        <View style={{ marginTop: space.xxl }}>
                            <Empty
                                icon="search"
                                title="Nothing matches that"
                                hint="Try the name of the machine, or what it is doing - a leak, a trip, a smell."
                            />
                        </View>
                    ) : (
                        <>
                            {/*
                              * How many, before the list.
                              *
                              * The reference prints a count over its results
                              * and it earns the line: it tells somebody whether
                              * to scroll or to try different words before they
                              * have read a single card.
                              */}
                            <Small style={s.count}>
                                {hits.length} {hits.length === 1 ? "result" : "results"} found
                            </Small>

                            <View style={{ gap: space.md }}>
                                {hits.map((hit) => (
                                    <TradeCard
                                        key={hit.service.key + (hit.machine ? ":" + hit.machine.key : "")}
                                        service={hit.service}
                                        machine={hit.machine}
                                        wide
                                        onPress={() => open(hit)}
                                    />
                                ))}
                            </View>
                        </>
                    )
                ) : (
                    <>
                        {terms.length ? (
                            <>
                                <Title style={s.heading}>Recent searches</Title>

                                <View style={s.recents}>
                                    {terms.map((word) => (
                                        <Pressable
                                            key={word}
                                            onPress={() => setTerm(word)}
                                            android_ripple={null}
                                            style={s.recent}
                                        >
                                            <Icon name="clock" size={15} color={colors.inkFaint} />
                                            <Small style={s.recentText} numberOfLines={1}>{word}</Small>

                                            <Pressable onPress={() => forget(word)} hitSlop={10}>
                                                <Icon name="x" size={15} color={colors.inkFaint} />
                                            </Pressable>
                                        </Pressable>
                                    ))}
                                </View>
                            </>
                        ) : null}

                        {viewed.length ? (
                            <>
                                <Title style={s.heading}>Recently viewed</Title>

                                <View style={{ gap: space.md }}>
                                    {viewed.map((service) => (
                                        <TradeCard key={service.key} service={service} wide />
                                    ))}
                                </View>
                            </>
                        ) : null}

                        {!terms.length && !viewed.length ? (
                            <View style={{ marginTop: space.xxl }}>
                                <Empty
                                    icon="search"
                                    title="What has stopped working?"
                                    hint="Search a trade, a machine or the fault itself - a leaking tap, a tripping board, an AC that will not cool."
                                />
                            </View>
                        ) : null}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    // The field lives in the header's right-hand slot and takes the rest of
    // the row, which is how the reference puts a search beside a back arrow.
    box: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        height: 44,
        marginLeft: -space.sm,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    input: {
        flex: 1,
        fontFamily: font.body,
        fontSize: 13.5,
        color: colors.ink,
        paddingVertical: 0,
    },

    heading: { fontSize: 17, marginTop: space.xl, marginBottom: space.md },

    count: {
        fontFamily: font.semibold,
        fontSize: 13.5,
        color: colors.inkSoft,
        marginTop: space.lg,
        marginBottom: space.md,
    },

    recents: {
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },
    recent: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    recentText: { flex: 1, fontSize: 13.5, color: colors.ink },
});
