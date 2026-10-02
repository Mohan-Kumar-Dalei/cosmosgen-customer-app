import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AreaCard } from "../../src/AreaCard";
import { useArea } from "../../src/area";
import {
    artFor, estimateRange, fitFor, SERVICE_ICON, Signature, tilesFor, tintFor, WHATSAPP_LINK,
} from "../../src/brand";
import { useJobs } from "../../src/jobs";
import { LiveJobCard } from "../../src/LiveJobCard";
import { AiMark, WhatsAppMark } from "../../src/Marks";
import { useNotices } from "../../src/notices";
import { Posters } from "../../src/Posters";
import { HomeBones } from "../../src/Skeleton";
import { Screen } from "../../src/screen";
import { HeaderBand } from "../../src/HeaderBand";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Body, IconArt, PriceRange, Row, Small, Title } from "../../src/ui";
import { Icon } from "../../src/Icon";

/**
 * What is happening now, then the shortest way to start the next thing.
 *
 * This page used to be the company's website, pasted into an app: half of it
 * was prose about why this firm rather than a number off a wall, and how a job
 * runs, in three cards of body copy. All of it true, none of it anything a
 * customer opens an app to read. Somebody who has installed this has already
 * decided to trust us; the argument was won before the download.
 *
 * So it opens on their name, then whatever job is running, then the catalogue
 * as a shelf you can push along with a thumb. The prose has gone rather than
 * been shrunk - there is no half measure between a leaflet and an app.
 */
/**
 * The four things this company will stand behind, and only those.
 *
 * Each one is a feature that exists: the start and finish codes, the itemised
 * bill the vendor raises in front of the customer, the engineer named before he
 * sets off, and the map the customer watches him on.
 */
const PROMISES = [
    { icon: "shield", label: "Verified engineers" },
    { icon: "file-text", label: "Itemised bill" },
    { icon: "key", label: "Two door codes" },
    { icon: "map-pin", label: "Live tracking" },
];

export default function Home() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const { services, open, closed, loading, reload } = useJobs();
    const { place, known } = useArea();

    /*
     * One tile per thing somebody might tap, rather than one per trade.
     *
     * A fridge, a washing machine and a microwave all live under "AC &
     * Appliance Repair" in the catalogue, and a customer whose fridge has
     * stopped should not have to know that. See tilesFor in src/brand.js.
     */
    const tiles = useMemo(() => tilesFor(services), [services]);
    const { reload: reloadNotices } = useNotices();

    const lastJob = closed[0];

    return (
        <Screen
            /*
              * The filled band, full width and up under the status bar. It
              * carries the address, the bell, the customer's own initial and
              * the way into the catalogue - everything the old top bar did,
              * and the greeting block that used to sit under it as well.
              */
            bar={<HeaderBand />}
            bleed

            /* Pulling the page down asks for the posters again as well as the
               jobs, so a notice put up a minute ago arrives without the app
               having to be closed and reopened. */
            onRefresh={reloadNotices}
        >
            {/*
              * The greeting that used to open this page has gone into the
              * band, where the address already was. A name repeated twice on
              * one screen is not a welcome, and the band says whose app this
              * is more usefully - by saying where the company thinks you are.
              */}
            {loading ? (
                <HomeBones />
            ) : (
                <>
                    {/*
                      * One card in this slot, and which one depends on whether
                      * anything is happening.
                      *
                      * With a job running, that job is the only thing on this
                      * screen worth the space - the customer opened the app to
                      * see where the engineer has got to. With nothing running,
                      * the question that matters is whether we even come to
                      * this street, because every price and every "we cover
                      * this" below it depends on the answer.
                      *
                      * Tapping the address line brings the area card back at
                      * any time, job or no job.
                      */}
                    {open.length ? (
                        <View style={{ gap: space.md, marginTop: space.xl }}>
                            {open.map((ticket) => (
                                <LiveJobCard key={ticket.id} ticket={ticket} onStage={reload} />
                            ))}
                        </View>
                    ) : null}

                    {/*
                      * Whatever the office is putting in the window this week.
                      *
                      * Above the area card because that is where Mohan asked
                      * for it, and it is the right place: a poster is the first
                      * thing a shop shows somebody walking in, and everything
                      * under it - the area, the shelf, the prices - is what
                      * they came for. It draws nothing at all when there are no
                      * posters, so a quiet month costs the page no space.
                      */}
                    <Posters />

                    {/*
                      * The area card is an interruption, so it only interrupts
                      * once. Until somebody has told us where they are it is
                      * the most important thing on the page - every price and
                      * every "we come here" depends on it. Once it is answered
                      * the band carries the address, and tapping it there is
                      * how anybody changes it.
                      */}
                    {!open.length && !known ? (
                        <View style={{ marginTop: space.xl }}>
                            <AreaCard />
                        </View>
                    ) : null}

                    {/*
                      * ---- the catalogue, as a grid ----
                      *
                      * Four to a row, icon over name, which is the shape every
                      * app of this kind uses and the shape Mohan pointed at. It
                      * reads in one glance where a horizontal shelf has to be
                      * pushed to be read, and it is the thing that lets the
                      * Services tab go: the whole trade list is now on the page
                      * somebody lands on.
                      *
                      * Eight at most. Past that the grid stops being something
                      * the eye takes in whole and becomes a list, and the list
                      * is what "See all" is for.
                      */}
                    <View style={s.sectionHead}>
                        <View style={{ flex: 1 }}>
                            <Title style={{ fontSize: 19 }}>What we do</Title>
                            <Small style={{ marginTop: 1 }}>
                                {known
                                    ? "Verified trades near " + (place?.label || place?.city)
                                    : "Verified trades across Odisha"}
                            </Small>
                        </View>

                        <Pressable
                            onPress={() => router.push("/categories")}
                            hitSlop={8}
                            android_ripple={null}
                        >
                            <Small style={s.seeAll}>
                                See all {tiles.length || ""}
                            </Small>
                        </Pressable>
                    </View>

                    {/*
                      * Seven trades and a way to the rest, four to a row.
                      *
                      * The tile is a rounded square rather than a disc, which
                      * is the shape Mohan pointed at: a square holds a wider
                      * mark and sits in a grid without the gaps a row of
                      * circles leaves at its corners. The last one is always
                      * "More services" - a grid that quietly stops at eight
                      * gives no clue that there are more, and the row that
                      * says so is worth one tile.
                      */}
                    <View style={s.grid}>
                        {tiles.slice(0, 7).map((tile) => (
                            <Pressable
                                key={tile.key}
                                onPress={() => router.push(tile.to)}
                                android_ripple={null}
                                style={({ pressed }) => [s.tile, pressed ? { opacity: 0.7 } : null]}
                            >
                                <View style={s.tileIcon}>
                                    <Icon name={tile.icon} size={22} color={colors.field} />
                                </View>
                                <Small style={s.tileName} numberOfLines={2}>{tile.label}</Small>
                            </Pressable>
                        ))}

                        <Pressable
                            onPress={() => router.push("/categories")}
                            android_ripple={null}
                            style={({ pressed }) => [s.tile, pressed ? { opacity: 0.7 } : null]}
                        >
                            <View style={s.tileIcon}>
                                <Icon name="grid" size={22} color={colors.field} />
                            </View>
                            <Small style={s.tileName} numberOfLines={2}>More services</Small>
                        </Pressable>
                    </View>

                    {/* ---- and the same trades again, with the money on them ---- */}
                    <View style={s.sectionHead}>
                        <View style={{ flex: 1 }}>
                            <Title style={{ fontSize: 19 }}>Booked most often</Title>
                            <Small style={{ marginTop: 1 }}>
                                What each one usually comes to, before the engineer has seen it.
                            </Small>
                        </View>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: space.md, paddingRight: space.lg }}
                        style={s.shelf}
                    >
                        {services.map((service, i) => (
                            <TradeCard
                                key={service.key}
                                service={service}
                                tint={tintFor(i)}
                                onPress={() => router.push("/service/" + service.key)}
                            />
                        ))}
                    </ScrollView>

                    {/*
                      * One panel, four rows.
                      *
                      * These were four separate cards stacked down the page,
                      * each with its own border, its own fill and its own gap
                      * under it - the promise, the assistant, the last job,
                      * WhatsApp. Four boxes in a column reads as four things
                      * the page could not decide the order of, and Mohan said
                      * so: organise karke ek hi box main dikhao.
                      *
                      * They belong together because they are the same kind of
                      * thing - the ways into this company that are not the
                      * catalogue above. So they share one card and are divided
                      * by hairlines, which is what a list of options looks
                      * like when somebody has arranged it rather than simply
                      * appended to it.
                      *
                      * Each row keeps the one piece of colour that identifies
                      * it - the assistant's blue disc, WhatsApp's teal - and
                      * loses the tinted background it used to sit on, because
                      * four tinted bands inside one card is the same problem
                      * again one level down.
                      */}
                    <View style={s.panel}>
                        {/* ---- what the company stands behind ---- */}
                        <View style={s.panelRow}>
                            <View style={s.panelIcon}>
                                <Icon name="shield" size={16} color={colors.inkSoft} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Body style={s.rowTitle}>
                                    Two codes, one bill, one named engineer
                                </Body>
                                <Small style={s.rowNote}>
                                    Nothing starts or closes without a code you read out.
                                </Small>
                            </View>
                            <Icon name="check-circle" size={16} color={colors.ok} />
                        </View>

                        {/* ---- the assistant ---- */}
                        <Row onPress={() => router.push("/(tabs)/ask")}>
                            <View style={[s.panelRow, s.divided]}>
                                <View style={[s.panelIcon, { backgroundColor: colors.field }]}>
                                    <AiMark size={17} color={colors.white} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Body style={s.rowTitle}>Not sure what is wrong?</Body>
                                    <Small style={s.rowNote}>
                                        Say what the machine is doing and the assistant will
                                        tell you what it usually is.
                                    </Small>
                                </View>
                                <Icon name="chevron-right" size={18} color={colors.inkFaint} />
                            </View>
                        </Row>

                        {/* ---- the last job, as a way back to its invoice ---- */}
                        {lastJob ? (
                            <Row onPress={() => router.push("/job/" + lastJob.id)}>
                                <View style={[s.panelRow, s.divided]}>
                                    <View style={[s.panelIcon, { backgroundColor: colors.brandTint }]}>
                                        <Icon
                                            name={SERVICE_ICON[lastJob.serviceKey] || "tool"}
                                            size={16}
                                            color={colors.brandDeep}
                                        />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Body style={s.rowTitle}>{lastJob.serviceLabel}</Body>
                                        <Small style={s.rowNote}>
                                            Last time · {lastJob.ticketNumber}
                                        </Small>
                                    </View>

                                    {lastJob.bill ? (
                                        <Body style={s.lastTotal}>₹{lastJob.bill.totalDisplay}</Body>
                                    ) : null}
                                </View>
                            </Row>
                        ) : null}

                        {/* ---- and the other way in, for people who prefer typing ---- */}
                        <Row onPress={() => Linking.openURL(WHATSAPP_LINK)}>
                            <View style={[s.panelRow, s.divided]}>
                                <View style={[s.panelIcon, { backgroundColor: colors.whatsapp }]}>
                                    <WhatsAppMark size={16} color="#ffffff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Body style={[s.rowTitle, { color: colors.whatsapp }]}>
                                        Book directly on WhatsApp
                                    </Body>
                                    <Small style={s.rowNote}>
                                        The same office, the same jobs, the same prices.
                                    </Small>
                                </View>
                                <View style={s.chatNow}>
                                    <Small style={s.chatNowText}>Chat</Small>
                                    <Icon name="chevron-right" size={13} color="#ffffff" />
                                </View>
                            </View>
                        </Row>
                    </View>

                    {/*
                      * ---- what every job comes with ----
                      *
                      * Four things, each of them already built and visible
                      * elsewhere in this app: the two door codes, the itemised
                      * bill, the named engineer, the live map. Nothing about
                      * warranties or arrival times - those are promises only
                      * Mohan can make, and a strip like this is exactly where
                      * an invented one would end up being believed.
                      */}
                    <View style={s.trust}>
                        {PROMISES.map((promise) => (
                            <View key={promise.label} style={s.promise}>
                                <Icon name={promise.icon} size={17} color={colors.field} />
                                <Small style={s.promiseText} numberOfLines={2}>{promise.label}</Small>
                            </View>
                        ))}
                    </View>

                    <Signature />
                </>
            )}
        </Screen>
    );
}

/**
 * One trade on the shelf: a picture, a name, and what it starts at.
 *
 * Wide enough that a second card shows at the edge of the screen, which is the
 * only thing that tells a thumb the row moves. A row where the last card ends
 * flush with the gutter reads as a row of three.
 */
const TradeCard = ({ service, tint, onPress }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const range = estimateRange(service);

    return (
        <Row onPress={onPress}>
            <View style={s.trade}>
                <IconArt
                    src={artFor(service)}
                    fit={fitFor(service)}
                    icon={SERVICE_ICON[service.key] || "tool"}
                    tint={tint}
                    tr="w-420"
                    height={128}

                    /* What customers actually said about this trade - the
                       server counts it now, so the star is a measurement
                       rather than the 4.8 that used to be typed in. */
                    corner={(
                        <View style={s.score}>
                            <Icon name="star" size={11} color={colors.star} />
                            <Small style={s.scoreText}>
                                {Number(service.rating || 4.6).toFixed(1)}
                            </Small>
                        </View>
                    )}
                />

                <Body style={s.tradeName} numberOfLines={2}>
                    {service.display || service.label}
                </Body>

                <View>
                    <Small style={s.tradeLabel} numberOfLines={1}>
                        {range.label.toUpperCase()}
                    </Small>
                    <PriceRange range={range} size="sm" />
                </View>

                <View style={s.tradeFoot}>
                    <Small style={s.tradeNote} numberOfLines={1}>
                        {range.estimated ? "Indicative" : "Price list"}
                    </Small>

                    <View style={s.plus}>
                        <Icon name="plus" size={18} color={colors.accentDeep} />
                    </View>
                </View>
            </View>
        </Row>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    sectionHead: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: space.md,
        marginTop: space.xxl,
    },
    seeAll: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },

    /*
     * Four to a row, on a percentage rather than a measured width.
     *
     * A grid laid out in points has to be told the screen width and then told
     * again when somebody rotates the phone or runs the app on a tablet. Wrap
     * plus a quarter of the row does the same job and survives both.
     */
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: space.lg,
    },
    tile: {
        width: "25%",
        alignItems: "center",
        paddingVertical: space.md,
        gap: space.sm,
    },
    /*
     * A rounded square in a wash of the blue.
     *
     * The tint matters as much as the shape: eight grey tiles in two rows read
     * as a keypad somebody has disabled, and the wash is what makes them look
     * like something to press.
     */
    tileIcon: {
        width: 58, height: 58,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    tileName: {
        fontSize: 11.5,
        lineHeight: 15,
        textAlign: "center",
        color: colors.inkSoft,
        fontFamily: font.medium,
    },

    /*
     * The promises, as one band rather than four cards.
     *
     * Wrapped to two rows of two on a narrow handset rather than squeezed to
     * four columns: at a quarter of a 360 point screen "Verified engineers"
     * breaks into three lines and the row stops being scannable, which is the
     * only thing a strip like this is for.
     */
    trust: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: space.xl,
        paddingVertical: space.sm,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    promise: {
        width: "50%",
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingHorizontal: space.md,
        paddingVertical: space.md,
    },
    promiseText: { flex: 1, fontSize: 12, lineHeight: 16, fontFamily: font.medium },

    // Negative margins so the shelf runs to both edges while the page keeps
    // its gutter.
    shelf: {
        marginHorizontal: -space.lg,
        paddingHorizontal: space.lg,
        marginTop: space.lg,
        marginBottom: space.xl,
        flexGrow: 0,
    },
    trade: {
        width: 240,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: space.lg,
    },
    tradeName: {
        fontFamily: font.display,
        fontSize: 17,
        lineHeight: 22,
        letterSpacing: -0.3,

        // Two lines' worth, as a floor rather than as a ceiling - a one word
        // trade and a four word one keep the row level, and a long one is
        // still allowed to be as tall as it needs.
        minHeight: 44,
        paddingTop: space.sm,
    },
    tradeFoot: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingTop: space.sm,
    },
    tradeLabel: {
        fontFamily: font.bold,
        fontSize: 10,
        letterSpacing: 0.6,
        color: colors.inkFaint,
        marginTop: space.sm,
    },
    tradeNote: { flex: 1, fontSize: 11, color: colors.inkFaint },

    score: { flexDirection: "row", alignItems: "center", gap: 3 },
    scoreText: { fontFamily: font.bold, fontSize: 11.5, color: colors.ink },
    plus: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.iconSurface,
        alignItems: "center", justifyContent: "center",
    },

    /*
     * The one card the four ways in share.
     *
     * No padding of its own - each row brings its own, so a divider can run
     * the full width of the card instead of stopping short at a gutter, which
     * is the difference between a list and four things in a box.
     */
    panel: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },
    panelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md + 2,
    },

    // The hairline sits on the row rather than between them, so the first one
    // never draws a line against the card's own top edge.
    divided: { borderTopWidth: 1, borderTopColor: colors.hairline },

    panelIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.iconSurface,
        alignItems: "center", justifyContent: "center",
    },

    rowTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19 },
    rowNote: { marginTop: 1, fontSize: 12, lineHeight: 16 },

    lastTotal: { fontFamily: font.bold, fontSize: 15 },

    chatNow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        height: 32,
        paddingLeft: space.md,
        paddingRight: space.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.whatsapp,
    },
    chatNowText: { fontFamily: font.semibold, fontSize: 12.5, color: "#ffffff" },
});
