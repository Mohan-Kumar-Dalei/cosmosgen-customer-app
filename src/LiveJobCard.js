import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { estimateRange } from "./brand";
import { useRide } from "./JobTrack";
import { useJobs } from "./jobs";
import { LiveDot } from "./LiveDot";
import { distanceLabel } from "./route";
import { font, radius, space, useColors, useThemedStyles } from "./theme";
import { Art, Body, GradientFill, PriceRange, Small, Title } from "./ui";
import { Icon } from "./Icon";

/**
 * The job that is happening, as the one thing worth looking at on the home
 * screen.
 *
 * A customer with an engineer on the way opens this app for exactly one
 * reason, and a row in a list is not an answer to it. This is the whole
 * situation on one card: who is coming, how far away they are, what they are
 * coming for, roughly what it will come to, and the two things worth doing
 * about it - ring him, or watch him come.
 *
 * Everything on it is a field the server already sends. Where the design this
 * came from had a figure the product does not keep - a job count beside the
 * rating, a delivery-style arrival promise - the slot is left out rather than
 * filled with something invented, because a number on this card is a number
 * the customer will repeat back to the office.
 */
export const LiveJobCard = ({ ticket, onStage }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const router = useRouter();
    const { serviceFor } = useJobs();

    const { live, riding, left, headline, under, progress } = useRide({
        token: ticket.trackingToken,
        destination: ticket.destination,
        onStage,
    });

    const tech = ticket.technician;
    const phone = tech?.phone;
    const canTrack = Boolean(ticket.trackingToken);
    const range = estimateRange(serviceFor(ticket.serviceKey) || { key: ticket.serviceKey });

    /*
     * The badge says a figure, or a stage, or it is not there.
     *
     * `headline` is a sentence when nothing is moving yet - "Lining somebody
     * up" - and a sentence does not go in a pill: it arrived on screen as
     * "Lining somebo…" with the name beside it broken over three lines. A
     * badge carries a glance, so it only appears when there is something
     * glanceable, and the line under the bar says the rest in full.
     */
    const badge = riding
        ? headline
        : ({ arrived: "At the door", working: "Working", done: "Finished" }[live?.stage] || null);

    return (
        <View style={s.card}>
            {/* ---- who is coming ---- */}
            <View style={s.who}>
                <View>
                    <Art
                        src={tech?.photo}
                        icon="user"
                        iconSize={20}
                        tr="w-160"
                        radius={26}
                        style={s.avatar}
                    />

                    {/*
                      * The tick is on the photograph, not beside the name.
                      *
                      * It means this is the person the office sent, and the
                      * thing it has to attach itself to is the face - that is
                      * what gets compared with whoever knocks.
                      */}
                    {tech ? (
                        <View style={s.verified}>
                            <Icon name="check" size={9} color={colors.fieldInk} />
                        </View>
                    ) : null}
                </View>

                <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                        <Title style={s.name} numberOfLines={1}>
                            {tech?.name || "Finding somebody"}
                        </Title>

                        {badge ? (
                            <View style={[s.eta, riding ? s.etaLive : null]}>
                                {riding ? <LiveDot style={s.etaDot} /> : null}
                                <Small style={s.etaText} numberOfLines={1}>{badge}</Small>
                            </View>
                        ) : null}
                    </View>

                    <View style={s.roleRow}>
                        <Body style={s.role} numberOfLines={1}>
                            {ticket.serviceLabel}
                        </Body>

                        {tech?.rating ? (
                            <>
                                <View style={s.dot} />
                                <Icon name="star" size={11} color={colors.star} />
                                <Small style={s.ratingText}>
                                    {Number(tech.rating).toFixed(1)}
                                </Small>
                            </>
                        ) : null}
                    </View>
                </View>
            </View>

            {/* ---- the road between him and the door ---- */}
            <View style={s.journey}>
                <View style={s.track}>
                    <View style={[s.trackDone, { width: (progress * 100) + "%" }]} />

                    {/*
                      * The bike rides the bar rather than sitting beside it.
                      *
                      * Mohan asked for one bar and one bike instead of the
                      * postcard map that used to be here - which is the right
                      * trade: a map the size of a stamp cannot show a road,
                      * but a bar can show the one thing the map was being
                      * asked for, which is how much of the way is left. The
                      * real map is one tap below.
                      *
                      * Its left edge is pulled back by half its own width so
                      * that the bike is centred on the point it marks, and it
                      * is kept off both ends so it never hangs outside the
                      * bar it is riding.
                      */}
                    <View
                        style={[
                            s.rider,
                            { left: (Math.max(0.04, Math.min(0.94, progress)) * 100) + "%" },
                        ]}
                    >
                        {/*
                          * A bike, because that is what is actually coming.
                          *
                          * It was a compass needle, which is the icon for
                          * "navigate" rather than for a person on their way -
                          * and on a bar that reads as a road, the thing
                          * travelling along it should look like the thing
                          * travelling along it. Feather has no bike, so this
                          * one comes from the Material set the same package
                          * already ships.
                          */}
                        <MaterialCommunityIcons
                            name="bike-fast"
                            size={15}
                            color={colors.fieldInk}
                        />
                    </View>

                    <View style={s.door}>
                        <Icon name="home" size={11} color={colors.ink} />
                    </View>
                </View>

                <View style={s.journeyFoot}>
                    <Small style={{ flex: 1 }} numberOfLines={2}>{under}</Small>

                    {riding && left.metres != null ? (
                        <Small style={s.far}>{distanceLabel(left.metres)}</Small>
                    ) : null}
                </View>
            </View>

            {/* ---- what for, and roughly what it comes to ---- */}
            <View style={s.facts}>
                <View style={{ flex: 1 }}>
                    <Small style={s.factLabel}>
                        {ticket.scheduledFor ? "Scheduled service" : "Service"}
                    </Small>
                    <Body style={s.factValue} numberOfLines={2}>
                        {ticket.serviceLabel}
                    </Body>
                    {ticket.slotWindow ? (
                        <Small style={{ marginTop: 1 }}>{ticket.slotWindow}</Small>
                    ) : null}
                </View>

                <View style={{ alignItems: "flex-end" }}>
                    <Small style={s.factLabel}>
                        {ticket.bill ? "Bill" : "Usually"}
                    </Small>

                    {/*
                      * The real bill the moment there is one, and the trade's
                      * own range until then.
                      *
                      * The engineer builds the bill in front of the customer
                      * at the end of the job, so a single figure here before
                      * that has happened would be a quote nobody gave. A range
                      * is the true shape of what is known right now.
                      */}
                    {ticket.bill ? (
                        <>
                            <Body style={s.factValue}>₹{ticket.bill.totalDisplay}</Body>
                            <Small style={s.payNote}>
                                {ticket.bill.paid ? "Paid" : "Due now"}
                            </Small>
                        </>
                    ) : (
                        <>
                            <PriceRange range={range} size="sm" align="right" />
                            <Small style={s.payNote}>Agreed at the door</Small>
                        </>
                    )}
                </View>
            </View>

            {/* ---- and the two things worth doing ---- */}
            <View style={s.actions}>
                {phone ? (
                    <Pressable
                        onPress={() => Linking.openURL("tel:" + phone)}
                        style={s.call}
                        android_ripple={null}
                        accessibilityLabel={"Call " + (tech?.name || "the engineer")}
                    >
                        <Icon name="phone" size={18} color={colors.ink} />
                    </Pressable>
                ) : null}

                <Pressable
                    onPress={() => router.push(
                        canTrack ? "/track/" + ticket.trackingToken : "/job/" + ticket.id,
                    )}
                    style={s.trackBtn}
                    android_ripple={null}
                >
                    <GradientFill color={colors.field} />
                    <Body style={s.trackText}>
                        {canTrack ? "Track live on map" : "Open this job"}
                    </Body>
                    <Icon name="arrow-right" size={17} color={colors.fieldInk} />
                </Pressable>
            </View>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: space.lg,
        gap: space.lg,
    },

    who: { flexDirection: "row", alignItems: "center", gap: space.md },
    nameRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
    name: { flex: 1, fontSize: 18 },
    roleRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.inkFaint },
    avatar: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: colors.accentTint,
    },
    verified: {
        position: "absolute",
        right: -2, bottom: -2,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: colors.field,
        borderWidth: 2,
        borderColor: colors.surface,
        alignItems: "center", justifyContent: "center",
    },

    /*
     * The trade under the name, in sentence case.
     *
     * It was set in tracked capitals, which is half again as wide as the same
     * words in mixed case - and beside a badge on a 360dp screen that is the
     * difference between "AC & Appliance Repair" and "AC & APPLIANCE RE…".
     * The line has to hold a real service name, so it is set at a width a real
     * service name fits in.
     */
    role: {
        flexShrink: 1,
        fontFamily: font.semibold,
        fontSize: 12.5,
        color: colors.accent,
    },
    ratingText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },

    eta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: space.md,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: colors.sunken,
    },
    etaLive: { backgroundColor: colors.accentTint },
    etaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
    etaText: { fontFamily: font.semibold, fontSize: 12, color: colors.accentDeep },

    journey: { gap: space.sm },
    track: {
        height: 28,
        borderRadius: radius.pill,
        backgroundColor: colors.sunken,
        justifyContent: "center",
    },
    trackDone: {
        position: "absolute",
        left: 0, top: 0, bottom: 0,
        borderRadius: radius.pill,
        backgroundColor: colors.accentTint,
    },
    rider: {
        position: "absolute",
        width: 26, height: 26, borderRadius: 13,
        marginLeft: -13,
        backgroundColor: colors.field,
        borderWidth: 2,
        borderColor: colors.surface,
        alignItems: "center", justifyContent: "center",
    },
    door: {
        position: "absolute",
        right: space.sm,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: colors.surface,
        alignItems: "center", justifyContent: "center",
    },
    journeyFoot: { flexDirection: "row", alignItems: "center", gap: space.sm },
    far: { fontFamily: font.semibold, color: colors.ink },

    facts: { flexDirection: "row", alignItems: "flex-start", gap: space.lg },
    factLabel: { fontSize: 12, color: colors.inkFaint },
    factValue: { fontFamily: font.semibold, fontSize: 15.5, marginTop: 2 },
    payNote: { fontFamily: font.semibold, fontSize: 12, color: colors.accent, marginTop: 1 },

    actions: { flexDirection: "row", alignItems: "center", gap: space.md },
    call: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: colors.sunken,
        alignItems: "center", justifyContent: "center",
    },
    trackBtn: {
        flex: 1,
        height: 48,
        borderRadius: radius.pill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space.sm,
        overflow: "hidden",
        backgroundColor: colors.field,
    },
    trackText: { fontFamily: font.semibold, fontSize: 15, color: colors.fieldInk },
});
