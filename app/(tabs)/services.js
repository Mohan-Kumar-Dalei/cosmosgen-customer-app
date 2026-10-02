import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useArea } from "../../src/area";
import {
    APPLIANCE_ICON, artFor, estimateRange, fitFor, SERVICE_GROUP, SERVICE_GROUPS, SERVICE_ICON,
    tintFor,
} from "../../src/brand";
import { useFilters } from "../../src/filters";
import { useJobs } from "../../src/jobs";
import { Bones, ServiceRowBone } from "../../src/Skeleton";
import { Screen } from "../../src/screen";
import { PageHeader } from "../../src/PageHeader";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Body, Display, Empty, IconArt, Lede, PriceRange, Row, Small, Title } from "../../src/ui";
import { Icon } from "../../src/Icon";

/**
 * The catalogue, as a shelf rather than a list of departments.
 *
 * This screen was four rows: a thumbnail the size of a stamp on the left, a
 * name, a line of grey text, a chevron. Which is a settings screen - every
 * item the same shape, the same weight, nothing to look at, and no way to tell
 * from it what any of it costs or whether it is even something we do near you.
 * That is the screen Mohan kept calling a government app, and he was right
 * about the reason: it was a directory, and nobody browses a directory.
 *
 * A card now leads with what the trade does, says the money out loud, and ends
 * on a photograph big enough to be a photograph. The order matters - by the
 * time the eye reaches the picture it already knows what it is looking at and
 * what it costs, so the picture is doing the one job pictures are good at,
 * which is making somebody want the thing.
 */
export default function Services() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const { services, loading } = useJobs();
    const { apply, active } = useFilters();
    const { place, known, total, cover, radiusKm } = useArea();

    const [term, setTerm] = useState("");
    const [group, setGroup] = useState(SERVICE_GROUPS[0]);

    /*
     * Opened from the home screen's search box, which is a button rather than
     * a field - see the comment on it there. It carries `focus=1` so the
     * keyboard comes up here, on the screen that actually does the filtering,
     * instead of two boxes on two screens having to agree about a word.
     */
    const { focus } = useLocalSearchParams();
    const box = useRef(null);

    const query = term.trim().toLowerCase();

    /*
     * Searched and grouped here rather than on the server.
     *
     * The whole catalogue is seven rows and it is already on the phone - a
     * request per keystroke would be a round trip to find something sitting in
     * memory, and would stop working the moment the signal did.
     */
    // The filter screen's choices, applied before anything on this page
    // narrows further. One place does the narrowing so the count it promised
    // and the rows drawn here cannot disagree.
    const filtered = useMemo(
        () => apply(services, known ? cover : null),
        [apply, services, known, cover]
    );

    /*
     * Every card the catalogue has, machines included.
     *
     * This screen used to be seven cards, one per trade, and a washing machine
     * was something you could only reach by opening AC & Appliance Repair and
     * knowing to look inside. Search already returns machines in their own
     * right - Mohan fixed that himself by typing "washing machine" and getting
     * the parent trade back - and he asked for the same cards here, which is
     * the same point made about browsing rather than searching: the thing a
     * customer has in their head is the machine, not the trade it is filed
     * under.
     *
     * So a trade with machines contributes its own card and one per machine,
     * the trade card first because it is still the way in for somebody whose
     * problem does not name a box. A trade without machines is one card as
     * before.
     */
    const shown = useMemo(() => {
        const hay = (parts) => parts.filter(Boolean).join(" ").toLowerCase();

        return filtered.flatMap((service) => {
            const inGroup = group === SERVICE_GROUPS[0]
                || SERVICE_GROUP[service.key] === group;

            if (!inGroup) return [];

            const machines = service.appliances || [];

            const tradeHay = hay([
                service.display, service.label, service.blurb,
                ...(service.issues || []).map((i) => i.display || i.label || i),

                // A trade still answers to the names of the machines under it,
                // so searching "fridge" keeps the way in as well as the box.
                ...machines.map((a) => a.display || a.label || a),
            ]);

            const cards = [];

            if (!query || tradeHay.includes(query)) {
                cards.push({ key: service.key, service, machine: null });
            }

            machines.forEach((a) => {
                const machineHay = hay([
                    a.display, a.label,
                    ...(a.issues || []).map((i) => i.display || i.label || i),
                ]);

                if (!query || machineHay.includes(query)) {
                    cards.push({ key: service.key + ":" + a.key, service, machine: a });
                }
            });

            return cards;
        });
    }, [filtered, group, query]);

    return (
        <Screen bar={<PageHeader title="What we do" />} bleed>
            <View style={s.headRow}>
                <Display style={{ flex: 1 }}>Our services</Display>

                {/*
                  * A claim the app can actually stand behind.
                  *
                  * The design this came from had a badge here reading "Twin
                  * City Pros", and two cards down, "1,200+ fixes in Patia".
                  * Neither is a number this company has told me, and a figure
                  * invented for a mockup becomes a figure a customer repeats
                  * back to the office. This says how many engineers are near
                  * this particular customer, which the server already works
                  * out and which is true by the time it is drawn.
                  */}
                {known && total > 0 ? (
                    <View style={s.nearby}>
                        <View style={s.dot} />
                        <Small style={s.nearbyText}>
                            {total} near you
                        </Small>
                    </View>
                ) : null}
            </View>

            <Lede style={{ marginTop: space.sm }}>
                Our own approved team, at a price agreed before the work begins.
                Pick the closest trade and say what is wrong - the office works out who to send.
            </Lede>

            {/* ---- finding one trade among seven ---- */}
            {/*
              * The filter beside the box it narrows, not up in the header.
              *
              * It was in the top bar and Mohan asked for it down here - which
              * is right: searching and filtering are the same errand, and a
              * control that belongs to a field should be within a thumb's
              * reach of it rather than at the other end of the screen.
              */}
            <View style={s.searchRow}>
            <View style={s.search}>
                <Icon name="search" size={17} color={colors.inkFaint} />
                <TextInput
                    ref={box}
                    autoFocus={focus === "1"}
                    value={term}
                    onChangeText={setTerm}
                    placeholder="Search AC repair, switchboard, tap leak…"
                    placeholderTextColor={colors.inkFaint}
                    style={s.searchInput}
                    returnKeyType="search"
                    autoCorrect={false}
                />
                {term ? (
                    <Pressable onPress={() => setTerm("")} hitSlop={10} style={s.clear}>
                        <Icon name="x" size={14} color={colors.inkSoft} />
                    </Pressable>
                ) : null}
            </View>

            <Pressable
                onPress={() => router.push("/filter")}
                android_ripple={null}
                style={s.filterBtn}
                accessibilityLabel="Filter"
            >
                <Icon name="sliders" size={18} color={colors.fieldInk} />
                {active ? <View style={s.filterPip} /> : null}
            </Pressable>
            </View>

            {/* ---- and narrowing it by the kind of work ---- */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                /*
                 * The gutter belongs to the content, not to the scroller.
                 *
                 * It was `paddingHorizontal` on `style`, which on a horizontal
                 * ScrollView shrinks the window the content moves behind
                 * rather than insetting the content itself. So the row ran to
                 * both screen edges as intended and then cut its chips off
                 * sixteen points early at each end - a chip would slide into an
                 * empty strip and vanish before it reached the edge. Moving it
                 * here inset the first and last chip instead, which is what
                 * the negative margin on `style` was always for.
                 */
                contentContainerStyle={{
                    gap: space.sm,
                    paddingHorizontal: space.lg,
                    alignItems: "center",
                }}
                style={s.groups}
            >
                {SERVICE_GROUPS.map((name) => {
                    const on = group === name;

                    return (
                        <Pressable
                            key={name}
                            onPress={() => setGroup(name)}
                            android_ripple={null}
                            style={[s.group, on ? s.groupOn : null]}
                        >
                            <Body style={[s.groupText, on ? s.groupTextOn : null]}>{name}</Body>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {loading ? (
                <Bones of={ServiceRowBone} count={3} />
            ) : !services.length ? (
                <Empty
                    icon="wifi-off"
                    title="The list is not loading"
                    hint="Pull down to try again, or message us on WhatsApp and we will tell you whether it is something we cover."
                />
            ) : !shown.length ? (
                <Empty
                    icon="search"
                    title="Nothing here matches that"
                    hint="Try the name of the machine, or what it is doing - a leak, a trip, a smell."
                />
            ) : (
                <View style={{ gap: space.lg }}>
                    {shown.map((card, i) => (
                        <ServiceCard
                            key={card.key}
                            service={card.service}
                            machine={card.machine}
                            tint={tintFor(i)}
                            near={known ? cover(card.service.key) : null}
                            radiusKm={radiusKm}
                            onPress={() => router.push(
                                "/service/" + card.service.key
                                + (card.machine ? "?appliance=" + card.machine.key : "")
                            )}
                        />
                    ))}
                </View>
            )}

            {/*
              * What the company actually promises, at the foot of the shelf.
              *
              * Every line here is something already built into the product and
              * visible elsewhere in the app - the two door codes, the itemised
              * bill, the named engineer. Nothing about warranties or arrival
              * times, because those are commitments only Mohan can make.
              */}
            <View style={s.promise}>
                <View style={s.promiseIcon}>
                    <Icon name="shield" size={17} color={colors.ok} />
                </View>
                <View style={{ flex: 1 }}>
                    <Body style={{ fontFamily: font.semibold }}>How every job is protected</Body>
                    <Small style={{ marginTop: 2 }}>
                        Nobody starts or closes without a code you read out. The bill is
                        itemised in front of you, and the engineer is named before he sets off.
                    </Small>
                </View>
            </View>
        </Screen>
    );
}

/*
 * What a trade nobody has rated yet shows.
 *
 * The server sends `rating` on every service now, counted from the ratings
 * customers leave when a job closes, and it sends this same figure for a trade
 * with nothing behind it yet - see rating.service.js. This is only read when
 * the catalogue arrives from an older server, or has not arrived at all.
 */
const FALLBACK_RATING = 4.6;


/**
 * One trade, as a card somebody might actually want to open.
 *
 * Text first and picture last, which is the opposite of the way a shop puts a
 * photograph at the top of a tile. A photograph at the top has to carry the
 * question "what is this" on its own, and a cutout drawing of a man with a
 * spanner cannot. Underneath the name and the price it is not answering
 * anything - it is the thing that makes the card feel like a place that sends
 * real people.
 */
const ServiceCard = ({ service, machine, tint, near, radiusKm, onPress }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const range = estimateRange(service);

    /*
     * A machine's card says the machine and then says where it is filed.
     *
     * Without that second line a customer reading "Refrigerator" on a shelf
     * has no idea it is the appliance engineer who comes, which is the thing
     * the trade card above it exists to tell them.
     */
    const covers = machine
        ? (machine.issues?.length || 0) + " common faults"
        : service.appliances?.length
            ? service.appliances.length + " appliances covered"
            : (service.issues?.length || 0) + " common faults";

    /*
     * The star on the photograph, and it is now a measurement.
     *
     * This used to be the constant 4.8 on every card - a placeholder Mohan
     * asked for while the ratings were being collected but not counted. They
     * are counted now: the server averages what customers said about jobs of
     * this trade and sends it as `rating`, with `ratingCount` beside it.
     *
     * The count is shown once enough people are behind the figure. A number on
     * its own invites the reader to assume thousands; "4.7 (31)" is a smaller
     * claim and a truer one. Below that threshold the star stands alone rather
     * than advertising how few have answered.
     */
    const score = Number(service.rating || FALLBACK_RATING).toFixed(1);
    const corner = {
        icon: "star",
        text: service.ratingCount >= 10 ? score + " (" + service.ratingCount + ")" : score,
    };

    // And where we come to, which is real, moves under the price instead.
    const coverage = !near ? null
        : near.available
            ? (near.nearestKm != null ? near.nearestKm + " km away" : "Within " + radiusKm + " km")
            : "Not here yet";

    return (
        <Row onPress={onPress}>
            <View style={s.card}>
                {/*
                  * Two pills: what the trade covers, and whether we reach
                  * this street. The second is the only fact on the card the
                  * customer's own address decides, so it sits beside the
                  * first rather than being buried under the price.
                  */}
                <View style={s.tagRow}>
                    <View style={s.tag}>
                        <Icon
                            name={machine
                                ? (APPLIANCE_ICON[machine.key] || SERVICE_ICON[service.key] || "tool")
                                : (SERVICE_ICON[service.key] || "tool")}
                            size={11}
                            color={colors.accentDeep}
                        />
                        <Small style={s.tagText}>{covers}</Small>
                    </View>

                    {coverage ? (
                        <View style={[s.tag, near.available ? s.tagOk : s.tagOff]}>
                            <Icon
                                name={near.available ? "map-pin" : "slash"}
                                size={11}
                                color={near.available ? colors.ok : colors.warn}
                            />
                            <Small style={[
                                s.tagText,
                                { color: near.available ? colors.ok : colors.warn },
                            ]}>
                                {coverage}
                            </Small>
                        </View>
                    ) : null}
                </View>

                <Title style={s.name}>
                    {machine ? (machine.display || machine.label) : (service.display || service.label)}
                </Title>

                {machine ? (
                    <Small style={{ marginTop: 4 }}>
                        Part of {service.display || service.label}
                    </Small>
                ) : service.blurb ? (
                    <Small numberOfLines={2} style={{ marginTop: 4 }}>{service.blurb}</Small>
                ) : null}

                {/* ---- what it is likely to come to ---- */}
                <View style={s.priceBlock}>
                    <View style={{ flex: 1 }}>
                        <Small style={s.priceLabel}>{range.label.toUpperCase()}</Small>
                        <PriceRange range={range} />

                        {/*
                          * A guess, marked as a guess.
                          *
                          * The office's price list is not filled in yet, so
                          * these figures are the app's own until it is. A
                          * number a customer reads as the company's word and
                          * then hears a different one for at the door is worse
                          * than no number - so it says, quietly, who settles
                          * it and when.
                          */}
                        <Small style={s.estimate}>
                            {range.estimated
                                ? "Indicative · the engineer confirms on the visit"
                                : "From the company price list · parts extra"}
                        </Small>
                    </View>

                    <View style={s.go}>
                        <Icon name="arrow-right" size={19} color={colors.accentDeep} />
                    </View>
                </View>

                {/*
                  * `artFor`, not `service.image`.
                  *
                  * This screen was the one place still drawing whatever the
                  * server had on the service - the old cutout on a transparent
                  * ground - while the home tiles and the search results had
                  * moved to the card artwork. Since those pictures carry their
                  * own background the app fills the frame with them, and
                  * filling a frame with a cutout is what took the top off the
                  * electrician's head in the shot Mohan sent.
                  */}
                <IconArt
                    src={artFor(service, machine)}
                    fit={fitFor(service, machine)}
                    icon={machine
                        ? (APPLIANCE_ICON[machine.key] || SERVICE_ICON[service.key] || "tool")
                        : (SERVICE_ICON[service.key] || "tool")}
                    tint={tint}
                    tr="w-700"
                    height={192}
                    style={{ marginTop: space.lg }}
                    corner={corner ? (
                        <View style={[s.chip, corner.warn ? s.chipOff : null]}>
                            <Icon
                                name={corner.icon}
                                size={11}
                                color={corner.warn ? colors.warn : colors.onPanel}
                            />
                            <Small style={[s.chipText, corner.warn ? { color: colors.warn } : null]}>
                                {corner.text}
                            </Small>
                        </View>
                    ) : null}
                />
            </View>
        </Row>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    searchRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xl },

    filterBtn: {
        width: 52, height: 52,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.field,
        alignItems: "center", justifyContent: "center",
    },

    // A dot on the filter button when something is set. A list that has been
    // narrowed and does not say so is a list that looks broken.
    filterPip: {
        position: "absolute",
        top: 8, right: 9,
        width: 8, height: 8,
        borderRadius: 4,
        backgroundColor: colors.warn,
        borderWidth: 1.5,
        borderColor: colors.field,
    },

    headRow: { flexDirection: "row", alignItems: "center", gap: space.md },

    nearby: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: space.md,
        height: 28,
        borderRadius: radius.pill,
        backgroundColor: colors.brandTint,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand },
    nearbyText: { fontFamily: font.semibold, fontSize: 12, color: colors.brandDeep },

    search: {
        // The row it now sits in is a flex row, so without this the box
        // shrinks to its content and ends up a circle beside the filter.
        flex: 1,

        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        height: 52,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.sunken,
    },
    searchInput: {
        flex: 1,
        height: 52,
        fontFamily: font.body,
        fontSize: 14.5,
        color: colors.ink,
    },
    clear: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: colors.hairlineStrong,
        alignItems: "center", justifyContent: "center",
    },

    // Negative margins so the row can run to both edges of the screen while
    // the page keeps its gutter.
    groups: {
        marginHorizontal: -space.lg,
        marginTop: space.lg,
        marginBottom: space.xl,
        flexGrow: 0,
    },
    group: {
        height: 38,
        justifyContent: "center",
        paddingHorizontal: space.lg,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.sunken,

        // A chip is a word, not a row of a list. Without this the pill grows
        // to whatever the tallest thing in the scroller is.
        flexGrow: 0,
        flexShrink: 0,
    },
    groupOn: { backgroundColor: colors.ink },

    // `Body` carries a 22 point line box for paragraphs, which inside a 38
    // point pill pushes the word off centre. Overriding the size without the
    // line height was what left these looking as though they were sitting low.
    groupText: {
        fontSize: 13.5,
        lineHeight: 18,
        fontFamily: font.semibold,
        color: colors.inkSoft,
    },
    groupTextOn: { color: colors.canvas },

    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: space.xl - 4,
    },

    tag: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 26,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: colors.accentTint,
    },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.md },
    tagOk: { backgroundColor: colors.okTint },
    tagOff: { backgroundColor: colors.warnTint },
    tagText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.accentDeep },

    name: { fontSize: 21, letterSpacing: -0.5 },

    priceBlock: { flexDirection: "row", alignItems: "flex-end", gap: space.md, marginTop: space.lg },
    priceLabel: {
        fontFamily: font.bold,
        fontSize: 10,
        letterSpacing: 0.9,
        color: colors.inkFaint,
        marginBottom: 3,
    },
    estimate: { marginTop: 5, fontSize: 11.5, color: colors.inkFaint },

    /*
     * The chip surface with a blue mark on it, not a filled disc.
     *
     * There is already a blue figure on this card and the whole card is the
     * tap target - a solid blue circle beside the price makes two things
     * compete to be the thing you press, and neither of them is what you
     * actually press.
     */
    go: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.sunken,
        alignItems: "center", justifyContent: "center",
    },

    /*
     * Dark, not white.
     *
     * The export sets this chip in the inverse surface at eighty per cent -
     * a near-black lozenge with paper-coloured text - and it is the right
     * call: a white chip on a photograph competes with whatever pale part of
     * the picture it lands on, and these drawings are pale everywhere.
     */
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 26,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: colors.inverse,
    },
    chipOff: { backgroundColor: colors.warnTint },
    chipText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.onInverse },

    promise: {
        flexDirection: "row",
        gap: space.md,
        marginTop: space.xl,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.sunkenSoft,
    },
    promiseIcon: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: colors.surface,
        alignItems: "center", justifyContent: "center",
    },
});
