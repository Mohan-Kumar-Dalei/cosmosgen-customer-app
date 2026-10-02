import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SERVICE_ICON } from "./brand";
import { LiveDot } from "./LiveDot";
import { font, radius, space, useColors, useThemedStyles } from "./theme";
import { Art, Badge, Body, Row, Small } from "./ui";
import { Icon } from "./Icon";

/**
 * The five words a customer thinks in, which are not the five the office runs
 * its queue with.
 *
 * "Assigned" and "In-Progress" answer a dispatcher; neither tells the person
 * at home whether anybody has set off yet. This is the same map the website's
 * account page uses, so a job reads the same on both.
 */
/**
 * And the one case the status alone gets wrong.
 *
 * "Assigned" means the office has picked somebody. It does not mean that
 * somebody has agreed to come, and until they have, telling the customer their
 * technician is on the way is a promise nobody has made. The server sends a
 * `stage` worked out from the acceptance and the ride; where it is there, it
 * wins.
 */
export const stageOf = (ticket) => {
    if (ticket?.stage === "on_the_way") return { label: "On the way", tone: "info" };
    if (ticket?.stage === "arrived") return { label: "At your door", tone: "brand" };

    return STAGE[ticket?.status] || { label: ticket?.status, tone: "quiet" };
};

export const STAGE = {
    Pending: { label: "Finding somebody", tone: "warn" },
    Queued: { label: "Booked in", tone: "info" },
    Assigned: { label: "Finding somebody", tone: "warn" },
    "In-Progress": { label: "Work in progress", tone: "info" },
    "Payment-Pending": { label: "Awaiting payment", tone: "warn" },
    Closed: { label: "Finished", tone: "brand" },
    Cancelled: { label: "Cancelled", tone: "quiet" },
};

export const day = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "";

/**
 * One job, as a row that opens it.
 *
 * Everything on it is what somebody would want to know at a glance and
 * nothing more: what the job is, where it has got to, who is coming, and -
 * once there is one - what it came to.
 */
const JobCardRow = ({ ticket }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const router = useRouter();

    const stage = stageOf(ticket);
    const icon = SERVICE_ICON[ticket.serviceKey] || "tool";

    return (
        <Row onPress={() => router.push("/job/" + ticket.id)}>
            <View style={s.card}>
                <View style={s.head}>
                    <View style={[s.icon, ticket.status === "Closed" ? s.iconDone : null]}>
                        <Icon
                            name={icon}
                            size={18}
                            color={ticket.status === "Closed" ? colors.inkSoft : colors.accent}
                        />
                    </View>

                    {/*
                      * The name gets the width; the badge gets what is left.
                      *
                      * They shared the row evenly before, so a longer label -
                      * "Finding somebody" rather than "On the way" - squeezed
                      * "AC & Appliance Repair" into three broken lines. A
                      * service name is the thing being read; the badge is a
                      * glance, and a glance can wait for the next line.
                      */}
                    <View style={{ flex: 1 }}>
                        <Body style={s.service} numberOfLines={2}>{ticket.serviceLabel}</Body>
                        <Small>{ticket.ticketNumber} · {day(ticket.createdAt)}</Small>
                    </View>

                    {/*
                      * The badge is back on the name's row, on the far side.
                      *
                      * It was moved to a line of its own when a long label
                      * squeezed the service name into three broken lines -
                      * which it did because both were sharing the width
                      * evenly. The name takes the width now and the badge
                      * takes what is left, so the two can sit together again
                      * and the card is a line shorter.
                      */}
                    <Badge tone={stage.tone}>{stage.label}</Badge>
                </View>

                {ticket.problemDescription ? (
                    <Small numberOfLines={2} style={{ marginTop: space.md }}>
                        {ticket.problemDescription}
                    </Small>
                ) : null}

                {/* Who is coming, once there is somebody to name. Before that
                    the row is left out rather than filled with "not assigned",
                    which is a line that says nothing twice. */}
                {ticket.technician ? (
                    <View style={s.foot}>
                        <Art
                            src={ticket.technician.photo}
                            icon="user"
                            iconSize={12}
                            tr="w-96"
                            radius={13}
                            style={s.face}
                        />
                        <Small style={{ color: colors.ink, fontFamily: font.medium }}>
                            {ticket.technician.name}
                        </Small>

                        {ticket.trackingToken && ["Assigned", "In-Progress"].includes(ticket.status) ? (
                            <View style={s.live}>
                                <LiveDot style={s.pulse} />
                                <Small style={s.liveText}>Live</Small>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* Why it was called off, on the card itself.
                    A cancelled job in a list that only says "Cancelled" is the
                    card somebody taps to find out why - so it says why. */}
                {ticket.status === "Cancelled" && ticket.cancelReason ? (
                    <View style={s.foot}>
                        <Icon name="x-circle" size={14} color={colors.danger} />
                        <Small numberOfLines={2} style={{ flex: 1, color: colors.danger }}>
                            {ticket.cancelReason}
                        </Small>
                    </View>
                ) : null}

                {ticket.bill ? (
                    <View style={s.foot}>
                        <Icon name="file-text" size={14} color={colors.inkFaint} />
                        <Small>{ticket.bill.invoiceNumber}</Small>
                        <Body style={s.total}>₹{ticket.bill.totalDisplay}</Body>
                    </View>
                ) : null}

                {/*
                  * What they said about it, or the nudge to say something.
                  *
                  * Only on a finished job. A row that asks rather than a
                  * screen that interrupts: somebody who has just had their
                  * fridge fixed is not owed a modal, and the ones who want to
                  * answer will open the job.
                  */}
                {ticket.status === "Closed" ? (
                    <View style={s.foot}>
                        {ticket.rating ? (
                            <>
                                <View style={s.stars}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <Icon
                                            key={n}
                                            name="star"
                                            size={12}
                                            color={n <= ticket.rating.stars
                                                ? colors.star
                                                : colors.hairlineStrong}
                                        />
                                    ))}
                                </View>
                                <Small>You rated this job</Small>
                            </>
                        ) : (
                            <>
                                <Icon name="star" size={14} color={colors.accent} />
                                <Small style={s.askRate}>How did it go? Tap to rate</Small>
                            </>
                        )}
                    </View>
                ) : null}
            </View>
        </Row>
    );
};

/**
 * Memoised, because a job card is what a list is made of.
 *
 * The tickets arrive as a new array every time the office says anything, and
 * without this every card in the list is rebuilt for a change to one of them.
 * The ticket object itself is the identity here: same object, same card.
 */
export const JobCard = memo(JobCardRow);

const makeStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: space.lg,
    },
    head: { flexDirection: "row", alignItems: "center", gap: space.md },

    // A rounded square rather than a disc: a disc is a face or an avatar
    // everywhere else in this app, and this is a category.
    icon: {
        width: 42, height: 42,
        borderRadius: radius.sm,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    iconDone: { backgroundColor: colors.sunken },
    service: { fontFamily: font.semibold, fontSize: 15.5 },

    face: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: colors.sunken,
    },

    foot: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginTop: space.md,
        paddingTop: space.md,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
    },
    total: { marginLeft: "auto", fontFamily: font.bold, fontSize: 15 },

    stars: { flexDirection: "row", gap: 2 },
    askRate: { color: colors.accent, fontFamily: font.semibold },

    live: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginLeft: "auto",
        height: 24,
        paddingHorizontal: space.sm + 2,
        borderRadius: radius.pill,
        backgroundColor: colors.brandTint,
    },
    liveText: { color: colors.brandDeep, fontFamily: font.semibold, fontSize: 12 },
    pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },
});
