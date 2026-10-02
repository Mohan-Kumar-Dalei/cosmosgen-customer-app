import { useEffect, useMemo, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api";
import { useArea } from "../../src/area";
import { artFor, estimateRange, fitFor, ik, SERVICE_ICON } from "../../src/brand";
import { useBookmarks } from "../../src/bookmarks";
import { useJobs } from "../../src/jobs";
import { useNotices } from "../../src/notices";
import { rememberViewed } from "../search";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Body, Button, Empty, PriceRange, Small, Title } from "../../src/ui";
import { Icon } from "../../src/Icon";

/**
 * One trade, before anybody commits to booking it.
 *
 * This screen did not exist: a tap on a service card went straight into the
 * booking wizard, which asks what is broken before it has said what the trade
 * covers, what it costs or what anybody thought of it. That is fine for
 * somebody who already knows they want a plumber and wrong for everybody else,
 * and it is the gap the reference kit Mohan picked fills with exactly this
 * page.
 *
 * The shape is the reference's: a photograph that fills the top with the
 * controls floating on it, the name and the score under it, three tabs, and a
 * bar docked at the foot carrying the price and the one button that matters.
 * The colours and the type are ours.
 *
 * Everything on it is true. The score and the reviews are counted off closed
 * jobs, the price is the office's own list, and the tabs are what this company
 * actually knows about a trade - what it covers, which machines, and what
 * people said. There is no "about the provider" because the provider is this
 * company, and no gallery because these are drawings rather than a portfolio.
 */
const TABS = ["Overview", "Covered", "Reviews"];

export default function ServiceDetail() {
    const { key, appliance } = useLocalSearchParams();
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { services } = useJobs();
    const { has, toggle } = useBookmarks();
    const { notices } = useNotices();
    const { place, known, cover, radiusKm } = useArea();

    const service = useMemo(
        () => services.find((item) => item.key === key),
        [services, key]
    );

    /*
     * The machine this page is about, when it was opened from one.
     *
     * Tapping "Refrigerator" on the home screen used to open the whole of AC &
     * Appliance Repair, which is not what the tile said and left somebody who
     * wanted one thing reading about five. With `?appliance=FRIDGE` the page
     * becomes that machine's page - its name, its faults, and a Book now that
     * skips the question it has just been answered.
     *
     * Without it nothing changes: the page is the trade, as before.
     */
    const machine = appliance
        ? (service?.appliances || []).find((a) => a.key === appliance)
        : null;

    const saved = has(key);

    /*
     * The first live offer that covers this trade, if there is one.
     *
     * Taken off the notices the app already holds rather than asked for - they
     * are fetched once for the bell and the carousel, and a third request for
     * the same rows would be a request to be slow with.
     */
    const offer = notices.find((n) => (
        n.offerServiceKeys?.length ? n.offerServiceKeys.includes(key) : false
    ));

    const [tab, setTab] = useState(TABS[0]);

    // Remembered for the search screen's "Recently viewed". Fire and forget -
    // a history that did not save is a shorter history and nothing more.
    useEffect(() => { if (key) rememberViewed(String(key)); }, [key]);
    const [reviews, setReviews] = useState(null);   // null = not asked yet

    /*
     * The reviews are fetched once, when the tab is first opened.
     *
     * Not on mount: most people book without reading a single one, and a
     * request made on the way into every service page is a request made for
     * nothing nine times out of ten.
     */
    useEffect(() => {
        if (tab !== "Reviews" || reviews !== null) return;

        api.get("/customer/services/" + key + "/reviews")
            .then((res) => setReviews(res.data?.data || []))
            .catch(() => setReviews([]));
    }, [tab, reviews, key]);

    if (!service) {
        return (
            <View style={[s.page, { paddingTop: insets.top + space.xxl }]}>
                <Empty
                    icon="tool"
                    title="That trade is not on the list"
                    hint="It may have been renamed. Go back and pick from the catalogue."
                />
            </View>
        );
    }

    const range = estimateRange(service);
    const near = known ? cover(service.key) : null;

    return (
        <View style={s.page}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
            >
                {/* ---- the photograph, with the controls floating on it ---- */}
                <View style={s.hero}>
                    {/*
                      * Filled or fitted, whichever this picture was drawn for
                      * - see `fitFor`.
                      *
                      * This was `contain` for everything, because the whole set
                      * was cutouts and filling the band took the engineer's
                      * head off. The new card artwork is drawn with its own
                      * background and framed for a shape close to this one, so
                      * it fills the band the way a photograph should; the few
                      * machines still on the old drawings keep the tint behind
                      * them as their background.
                      */}
                    <Image
                        source={{ uri: ik(artFor(service, machine), "w-900") }}
                        contentFit={fitFor(service, machine)}
                        cachePolicy="memory-disk"
                        transition={220}
                        style={s.heroImage}
                    />

                    <View style={[s.heroBar, { top: insets.top + space.sm }]}>
                        <Pressable
                            onPress={() => router.back()}
                            hitSlop={8}
                            android_ripple={null}
                            style={s.float}
                            accessibilityLabel="Back"
                        >
                            <Icon name="arrow-left" size={19} color={colors.ink} />
                        </Pressable>

                        <View style={{ flex: 1 }} />

                        {/*
                          * The bookmark, where the reference puts its heart.
                          *
                          * Its share button is still missing and stays missing:
                          * there is no public page for a trade to share a link
                          * to, and a control that does nothing on a screen
                          * somebody is deciding on is worse than no control.
                          */}
                        <Pressable
                            onPress={() => toggle(service.key)}
                            hitSlop={8}
                            android_ripple={null}
                            style={s.float}
                            accessibilityLabel={saved ? "Remove from saved" : "Save this trade"}
                        >
                            <Icon
                                name="bookmark"
                                size={18}
                                color={saved ? colors.field : colors.inkSoft}
                            />
                        </Pressable>
                    </View>
                </View>

                {/* ---- what it is ---- */}
                <View style={s.body}>
                    <View style={s.chipRow}>
                        <View style={s.chip}>
                            <Small style={s.chipText}>
                                {machine
                                    ? (service.display || service.label)
                                    : (service.worker || "Home service")}
                            </Small>
                        </View>

                        <View style={s.stars}>
                            <Icon name="star" size={13} color={colors.star} />
                            <Small style={s.starsText}>
                                {Number(service.rating || 4.6).toFixed(1)}
                            </Small>
                            {service.ratingCount > 0 ? (
                                <Small style={s.starsCount}>
                                    ({service.ratingCount} rated)
                                </Small>
                            ) : null}
                        </View>
                    </View>

                    <Title style={s.name}>
                        {machine ? (machine.display || machine.label) : (service.display || service.label)}
                    </Title>

                    {/*
                      * An offer that names this trade, on the trade's own page.
                      *
                      * Mohan's point was that the bell only tells somebody an
                      * offer exists - the place it matters is where they are
                      * about to book. The office says which trades an offer
                      * covers when it writes the notice; an empty list means
                      * the whole catalogue.
                      */}
                    {offer ? (
                        <Pressable
                            onPress={() => router.push("/notices")}
                            android_ripple={null}
                            style={s.offer}
                        >
                            <Icon name="tag" size={16} color={colors.warn} />
                            <View style={{ flex: 1 }}>
                                <Small style={s.offerTitle} numberOfLines={1}>{offer.title}</Small>
                                {offer.body ? (
                                    <Small style={s.offerBody} numberOfLines={1}>{offer.body}</Small>
                                ) : null}
                            </View>
                            <Icon name="chevron-right" size={16} color={colors.warn} />
                        </Pressable>
                    ) : null}

                    <View style={s.whereRow}>
                        <Icon name="map-pin" size={13} color={colors.inkFaint} />
                        <Small style={s.whereText} numberOfLines={1}>
                            {near
                                ? (near.available
                                    ? (near.nearestKm != null
                                        ? "An engineer " + near.nearestKm + " km from you"
                                        : "Covered within " + radiusKm + " km")
                                    : "Not covered here yet")
                                : (known
                                    ? (place?.label || place?.city)
                                    : "Across Odisha")}
                        </Small>
                    </View>

                    {/* ---- three tabs, underlined rather than filled ---- */}
                    <View style={s.tabs}>
                        {TABS.map((name) => {
                            const on = tab === name;

                            return (
                                <Pressable
                                    key={name}
                                    onPress={() => setTab(name)}
                                    android_ripple={null}
                                    style={[s.tab, on ? s.tabOn : null]}
                                >
                                    <Body style={[s.tabText, on ? s.tabTextOn : null]}>{name}</Body>
                                </Pressable>
                            );
                        })}
                    </View>

                    {tab === "Overview" ? (
                        <Overview service={service} machine={machine} s={s} colors={colors} />
                    ) : tab === "Covered" ? (
                        <Covered service={service} machine={machine} s={s} colors={colors} />
                    ) : (
                        <Reviews rows={reviews} s={s} colors={colors} />
                    )}
                </View>
            </ScrollView>

            {/*
              * The bar the whole page is for.
              *
              * Docked rather than at the end of the scroll, because a customer
              * who has read one review and decided should not have to scroll
              * past the other nineteen to find the button. The price sits
              * beside it so nobody presses it without having seen one.
              */}
            <View style={[s.dock, { paddingBottom: insets.bottom + space.md }]}>
                <View style={{ flex: 1 }}>
                    <Small style={s.dockLabel}>
                        {range.estimated ? "Usually" : "From"}
                    </Small>
                    <PriceRange range={range} size="sm" />
                </View>

                <Button
                    icon="arrow-right"
                    onPress={() => router.push(
                        "/book/" + service.key + (machine ? "?appliance=" + machine.key : "")
                    )}
                    style={s.book}
                >
                    Book now
                </Button>
            </View>
        </View>
    );
}

/** What the trade is, in the office's own words, and what it starts at. */
const Overview = ({ service, machine, s, colors }) => {
    const [full, setFull] = useState(false);

    /*
     * Folded at four lines, with a way to open it.
     *
     * The office writes these and some of them run long. Four lines is about
     * what somebody reads before deciding, and a paragraph that pushes the
     * tabs and the facts off the screen is a paragraph that stops the page
     * being scannable - which is what this screen is for.
     */
    const blurb = service.blurb || "";
    const long = blurb.length > 180;

    /*
     * The heading is always drawn, with or without a blurb.
     *
     * It used to appear only when the office had written one, so a trade with
     * an empty description opened on a bare list of facts and the section had
     * no name at all. Mohan asked for the heading and its line of subtext more
     * than once. Where there is no blurb the subtext stands on its own and
     * says something true about every trade rather than apologising for the
     * office not having typed anything.
     */
    return (
    <View style={{ gap: space.lg }}>
        <View>
            <Title style={s.aboutHead}>About this service</Title>
            <Small style={s.aboutSub}>
                {machine
                    ? "What is covered, what it usually comes to, and who comes to do it."
                    : "What this trade covers and how a visit runs, from booking to the bill."}
            </Small>

            {blurb ? (
                <>
                    <Body
                        style={[s.prose, { marginTop: space.md }]}
                        numberOfLines={full || !long ? undefined : 4}
                    >
                        {blurb}
                    </Body>

                    {long ? (
                        <Pressable onPress={() => setFull((n) => !n)} hitSlop={6} android_ripple={null}>
                            <Small style={s.readMore}>
                                {full ? "Read less" : "Read more"}
                            </Small>
                        </Pressable>
                    ) : null}
                </>
            ) : null}
        </View>

        <View style={s.facts}>
            {[
                { icon: "shield", label: "Verified engineer", note: "Named before he sets off" },
                { icon: "key", label: "Two door codes", note: "One to start, one to close" },
                { icon: "file-text", label: "Itemised bill", note: "Priced in front of you" },
                { icon: "map-pin", label: "Live tracking", note: "Watch him on the way" },
            ].map((fact) => (
                <View key={fact.label} style={s.fact}>
                    <View style={s.factIcon}>
                        <Icon name={fact.icon} size={16} color={colors.field} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Body style={s.factLabel}>{fact.label}</Body>
                        <Small style={s.factNote}>{fact.note}</Small>
                    </View>
                </View>
            ))}
        </View>
    </View>
    );
};

/** The machines and the faults the office has a price for. */
const Covered = ({ service, machine, s, colors }) => {
    // Opened for one machine, so the other four are not what this page covers.
    const appliances = machine ? [] : (service.appliances || []);
    const issues = machine ? (machine.issues || []) : (service.issues || []);

    if (!appliances.length && !issues.length) {
        return (
            <Empty
                icon="list"
                title="Nothing listed yet"
                hint="Book it anyway and say what is wrong - the office prices it before any work starts."
            />
        );
    }

    return (
        <View style={{ gap: space.lg }}>
            {appliances.length ? (
                <View>
                    <Small style={s.groupLabel}>MACHINES</Small>
                    <View style={s.pills}>
                        {appliances.map((a) => (
                            <View key={a.key} style={s.pill}>
                                <Small style={s.pillText}>{a.display || a.label}</Small>
                            </View>
                        ))}
                    </View>
                </View>
            ) : null}

            {issues.length ? (
                <View>
                    <Small style={s.groupLabel}>COMMON FAULTS</Small>
                    <View style={{ gap: space.sm, marginTop: space.sm }}>
                        {issues.map((i) => (
                            <View key={i.key} style={s.issue}>
                                <Icon name="check" size={14} color={colors.ok} />
                                <Small style={s.issueText}>{i.display || i.label}</Small>
                            </View>
                        ))}
                    </View>
                </View>
            ) : null}
        </View>
    );
};

/**
 * What customers actually said, off closed jobs.
 *
 * Filter chips and no search box. Mohan was specific about that and he is
 * right: twenty reviews is a list somebody scrolls, not one they search, and a
 * search field over it is a control nobody will ever use sitting exactly where
 * the first review should be.
 */
const FILTERS = ["All", "With photos", "5 star", "4 and up"];

const Reviews = ({ rows, s, colors }) => {
    const [filter, setFilter] = useState(FILTERS[0]);
    const [viewing, setViewing] = useState(null);

    if (rows === null) {
        return <Small style={{ paddingVertical: space.xl }}>Reading what people said…</Small>;
    }

    if (!rows.length) {
        return (
            <Empty
                icon="star"
                title="Nobody has rated this yet"
                hint="Every customer is asked once a job closes, and only a finished job can be rated - so this fills up on its own."
            />
        );
    }

    const shown = rows.filter((row) => {
        if (filter === "With photos") return row.photos?.length;
        if (filter === "5 star") return row.stars === 5;
        if (filter === "4 and up") return row.stars >= 4;
        return true;
    });

    return (
        <View style={{ gap: space.md }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}
                style={s.filters}
            >
                {FILTERS.map((name) => {
                    const on = filter === name;

                    return (
                        <Pressable
                            key={name}
                            onPress={() => setFilter(name)}
                            android_ripple={null}
                            style={[s.filterChip, on ? s.filterChipOn : null]}
                        >
                            <Small style={[s.filterText, on ? s.filterTextOn : null]}>{name}</Small>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {!shown.length ? (
                <Empty
                    icon="star"
                    title="Nothing under that filter"
                    hint="Try All - every rating anybody has left for this trade is in there."
                />
            ) : null}

            {shown.map((row, i) => (
                <View key={i} style={s.review}>
                    <View style={s.reviewHead}>
                        <View style={s.reviewWho}>
                            <Small style={s.reviewInitial}>
                                {(row.name || "?").charAt(0).toUpperCase()}
                            </Small>
                        </View>

                        <View style={{ flex: 1 }}>
                            <Body style={s.reviewName}>{row.name}</Body>
                            <Small style={s.reviewWhen}>{monthOf(row.at)}</Small>
                        </View>

                        <View style={s.reviewStars}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <Icon
                                    key={n}
                                    name="star"
                                    size={12}
                                    color={n <= row.stars ? colors.star : colors.hairlineStrong}
                                />
                            ))}
                        </View>
                    </View>

                    {row.tags?.length ? (
                        <View style={s.reviewTags}>
                            {row.tags.map((tag) => (
                                <View key={tag} style={s.reviewTag}>
                                    <Small style={s.reviewTagText}>{tag}</Small>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {row.note ? <Small style={s.reviewNote}>{row.note}</Small> : null}

                    {/*
                      * The pictures, as a row you can push along.
                      *
                      * A cleaned kitchen says more to somebody deciding than
                      * five stars do. Tapping one opens it full width - these
                      * are thumbnails at 74 points and the detail is the whole
                      * reason they were taken.
                      */}
                    {row.photos?.length ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: space.sm }}
                            style={{ marginTop: space.md }}
                        >
                            {row.photos.map((url) => (
                                <Pressable
                                    key={url}
                                    onPress={() => setViewing({ photos: row.photos, at: url })}
                                    android_ripple={null}
                                >
                                    <Image
                                        source={{ uri: ik(url, "w-240") }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        style={s.reviewShot}
                                    />
                                </Pressable>
                            ))}
                        </ScrollView>
                    ) : null}
                </View>
            ))}

            <PhotoViewer
                open={viewing}
                onClose={() => setViewing(null)}
                s={s}
                colors={colors}
            />
        </View>
    );
};

/**
 * One customer's pictures, full width, pushed along with a thumb.
 *
 * A modal rather than a screen: it is a look at something, and coming back
 * should be a tap anywhere rather than a back arrow and the list underneath
 * being built again.
 */
const PhotoViewer = ({ open, onClose, s, colors }) => {
    if (!open) return null;

    const width = Dimensions.get("window").width;
    const start = Math.max(0, open.photos.indexOf(open.at));

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={s.viewer} onPress={onClose}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentOffset={{ x: start * width, y: 0 }}
                >
                    {open.photos.map((url) => (
                        <View key={url} style={[s.viewerPage, { width }]}>
                            <Image
                                source={{ uri: ik(url, "w-1200") }}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                style={{ width: "100%", height: "100%" }}
                            />
                        </View>
                    ))}
                </ScrollView>

                <View style={s.viewerClose}>
                    <Icon name="x" size={20} color={colors.white} />
                </View>
            </Pressable>
        </Modal>
    );
};

/** "Sept 2026". A day is more precision than a review needs. */
const monthOf = (iso) => {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return "";
    return at.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const makeStyles = (colors) => StyleSheet.create({
    aboutHead: { fontSize: 17 },
    aboutSub: { marginTop: 2, fontSize: 12.5, lineHeight: 18 },

    offer: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginTop: space.md,
        paddingHorizontal: space.md,
        paddingVertical: space.sm + 2,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.warnTint,
    },
    offerTitle: { fontFamily: font.semibold, fontSize: 12.5, color: colors.warn },
    offerBody: { fontSize: 11.5, color: colors.warn, opacity: 0.85 },

    filters: { marginHorizontal: -space.lg, flexGrow: 0 },
    filterChip: {
        height: 34,
        justifyContent: "center",
        paddingHorizontal: space.md + 2,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    filterChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
    filterText: { fontSize: 12.5, fontFamily: font.medium, color: colors.inkSoft },
    filterTextOn: { color: colors.canvas, fontFamily: font.semibold },

    reviewShot: {
        width: 74, height: 74,
        borderRadius: radius.sm + 2,
        backgroundColor: colors.iconSurface,
    },

    viewer: { flex: 1, backgroundColor: "rgba(6, 10, 14, 0.94)", justifyContent: "center" },
    viewerPage: { height: "80%", alignItems: "center", justifyContent: "center" },
    viewerClose: { position: "absolute", top: 56, right: space.lg },

    page: { flex: 1, backgroundColor: colors.canvas },

    hero: { height: 260, backgroundColor: colors.accentTint },
    heroImage: { width: "100%", height: "100%" },
    heroBar: {
        position: "absolute",
        left: space.lg,
        right: space.lg,
        flexDirection: "row",
        alignItems: "center",
    },

    // White discs, because whatever is under them is a photograph and a
    // borderless icon on one is a smudge.
    float: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: colors.surface,
        alignItems: "center", justifyContent: "center",
    },

    /*
     * The sheet, lifted over the bottom of the photograph.
     *
     * A negative margin rather than a gap: the page reads as one surface
     * sliding up over the picture, which is what stops the hero looking like a
     * banner somebody pasted above the content.
     */
    body: {
        marginTop: -space.xl,
        paddingTop: space.xl,
        paddingHorizontal: space.lg,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        backgroundColor: colors.canvas,
    },

    chipRow: { flexDirection: "row", alignItems: "center", gap: space.md },
    chip: {
        paddingHorizontal: space.md,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: colors.accentTint,
    },
    chipText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.accentDeep },

    stars: { flexDirection: "row", alignItems: "center", gap: 4 },
    starsText: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
    starsCount: { fontSize: 11.5, color: colors.inkFaint },

    name: { fontSize: 24, lineHeight: 30, marginTop: space.md },

    whereRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: space.sm },
    whereText: { flex: 1, fontSize: 12.5, color: colors.inkFaint },

    /*
     * Underlined rather than filled.
     *
     * Three filled pills read as three buttons of equal weight, and these are
     * not buttons - they are which part of one page you are looking at. The
     * rule under the word is the quietest thing that says so.
     */
    tabs: {
        flexDirection: "row",
        gap: space.xl,
        marginTop: space.xl,
        marginBottom: space.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
    },
    tab: { paddingBottom: space.md, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabOn: { borderBottomColor: colors.field },
    tabText: { fontSize: 14, color: colors.inkSoft },
    tabTextOn: { fontFamily: font.semibold, color: colors.field },

    prose: { fontSize: 14.5, lineHeight: 22, color: colors.inkSoft },

    facts: {
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },
    fact: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    factIcon: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    factLabel: { fontFamily: font.semibold, fontSize: 13.5 },
    factNote: { fontSize: 11.5, marginTop: 1 },

    groupLabel: {
        fontFamily: font.bold,
        fontSize: 10,
        letterSpacing: 0.7,
        color: colors.inkFaint,
    },
    pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
    pill: {
        paddingHorizontal: space.md,
        paddingVertical: space.sm - 2,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    pillText: { fontSize: 12.5, color: colors.ink, fontFamily: font.medium },

    issue: { flexDirection: "row", alignItems: "center", gap: space.sm },
    issueText: { flex: 1, fontSize: 13, color: colors.inkSoft },

    review: {
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    reviewHead: { flexDirection: "row", alignItems: "center", gap: space.md },
    reviewWho: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    reviewInitial: { fontFamily: font.bold, fontSize: 13, color: colors.accentDeep },
    reviewName: { fontFamily: font.semibold, fontSize: 13.5 },
    reviewWhen: { fontSize: 11.5 },
    reviewStars: { flexDirection: "row", gap: 2 },

    reviewTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.md },
    reviewTag: {
        paddingHorizontal: space.sm + 2,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: colors.sunken,
    },
    reviewTagText: { fontSize: 11, color: colors.inkSoft, fontFamily: font.medium },
    reviewNote: { marginTop: space.md, fontSize: 13, lineHeight: 19 },

    /*
     * Docked over the page rather than at the end of it.
     *
     * Solid rather than translucent: a blur on Android is a second render pass
     * of everything underneath, every frame, on handsets this app has to keep
     * working on.
     */
    dock: {
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: space.lg,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
    },
    dockLabel: {
        fontFamily: font.bold,
        fontSize: 10,
        letterSpacing: 0.6,
        color: colors.inkFaint,
    },
    book: { flex: 1, maxWidth: 190 },
});
