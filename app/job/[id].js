import { useCallback, useEffect, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorFrom } from "../../src/api";
import { SERVICE_ICON, WHATSAPP_LINK } from "../../src/brand";
import { JobTrack } from "../../src/JobTrack";
import { RateJob } from "../../src/RateJob";
import { WhatsAppMark } from "../../src/Marks";
import { day, stageOf } from "../../src/JobCard";
import { useJobs } from "../../src/jobs";
import { Loading } from "../../src/Loading";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Icon } from "../../src/Icon";
import {
    Art, Badge, Body, Button, Card, Display, Eyebrow, GradientFill, Notice, Rule, Small, Title,
} from "../../src/ui";

/**
 * One job, from the moment it is asked for to the invoice at the end.
 *
 * Read again from the server rather than taken from the list, because this is
 * the screen somebody sits on while a job is happening: the list has what a
 * card needs and this needs the codes, the bill and whoever is coming.
 */
export default function Job() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();
    const { open, closed } = useJobs();

    /*
     * Drawn from the list first, and only then read again.
     *
     * The jobs tab already holds every field this screen shows - the list and
     * the detail are the same shape from the same server - so waiting on a
     * fresh request before drawing anything was a spinner in front of data the
     * phone was already holding. That was the delay on opening a job.
     *
     * The request still goes out underneath: the list can be a minute old, and
     * the codes are the one thing on this screen somebody is standing at a door
     * reading out.
     */
    const seed = [...open, ...closed].find((t) => t.id === String(id)) || null;

    const [ticket, setTicket] = useState(seed);
    const [loading, setLoading] = useState(!seed);
    const [error, setError] = useState("");

    // The engineer's photo, opened full width. See the row below for why.
    const [showingFace, setShowingFace] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/customer/tickets/" + id);
            setTicket(res.data.data);
            setError("");
        } catch (err) {
            setError(errorFrom(err, "We could not find that job on your account."));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    /*
     * The list is what hears the office.
     *
     * Every message sent to this customer already reloads their jobs, so this
     * screen watches that list rather than opening a second socket of its own:
     * when its own job changes in there, it reads itself again.
     *
     * Both lists, not only the open one.
     *
     * A cancelled job leaves `open` and appears in `closed`, so a screen that
     * looked only at `open` lost sight of its own ticket at the exact moment
     * it had something to say. That is why the office cancelling a job showed
     * up in My Jobs straight away and did nothing at all to the job somebody
     * had open in front of them - they had to back out and go in again to be
     * told.
     */
    const mirror = [...open, ...closed].find((t) => t.id === String(id));

    /*
     * And it watches the whole ticket, not the status.
     *
     * The status is only one of the things the office can change. Accepting
     * does not move it - "Assigned" before the technician says yes and
     * "Assigned" after - and neither does rescheduling, which changes the date
     * and nothing else. `updatedAt` moves whenever any of it does, so one
     * comparison catches the lot.
     */
    const mirrorAt = mirror
        ? String(mirror.updatedAt || "") + "/" + mirror.status + "/" + (mirror.stage || "")
        : null;

    const mineAt = ticket
        ? String(ticket.updatedAt || "") + "/" + ticket.status + "/" + (ticket.stage || "")
        : null;

    useEffect(() => {
        if (mirrorAt && mineAt && mirrorAt !== mineAt) load();
    }, [mirrorAt, mineAt, load]);

    if (loading) return <Loading label="Reading the job" />;

    if (!ticket) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.canvas, padding: space.lg, paddingTop: insets.top + space.xxl }}>
                <Display>Not on your account</Display>
                <Notice>{error}</Notice>
                <Button onPress={() => router.replace("/(tabs)/jobs")}>Back to your jobs</Button>
            </View>
        );
    }

    const stage = stageOf(ticket);
    /*
     * The map is there from the moment it is booked, not from the moment
     * somebody is assigned.
     *
     * It used to wait for a technician, so the customer who had just booked
     * saw a job with no picture of where it was going - and every app that
     * sends a person to your door shows you that straight away. Before there
     * is anybody it is the door and a quiet map; after, it is the bow; after
     * that, the road.
     */
    const live = Boolean(ticket.trackingToken)
        && ticket.destination
        && !["Closed", "Cancelled"].includes(ticket.status);

    return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingTop: insets.top + space.md,
                    paddingBottom: insets.bottom + space.xxl * 2,
                }}
                showsVerticalScrollIndicator={false}
            >
                <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
                    <Icon name="arrow-left" size={20} color={colors.ink} />
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg }}>
                    <View style={s.icon}>
                        <Icon name={SERVICE_ICON[ticket.serviceKey] || "tool"} size={20} color={colors.accent} />
                    </View>
                    <Badge tone={stage.tone}>{stage.label}</Badge>
                </View>

                <Display style={{ marginTop: space.md }}>{ticket.serviceLabel}</Display>
                <Small style={{ marginTop: space.xs }}>
                    {ticket.ticketNumber} · booked {day(ticket.createdAt)}
                </Small>

                {/*
                  * ---- why it was called off ----
                  *
                  * First on the page, above everything else, because for a
                  * cancelled job it is the only thing the customer opened the
                  * screen to find out. Without it the job simply stops, which
                  * reads as the company having lost it - and they ring to ask
                  * something the screen could have told them.
                  *
                  * Only the office can cancel a ticket, so the reason shown is
                  * the one the office recorded. A technician handing a job back
                  * is a different thing, settled inside the office, and is
                  * never put in front of the customer.
                  */}
                {ticket.status === "Cancelled" ? (
                    <Card tone={colors.dangerTint} style={{ marginTop: space.xl }}>
                        <Eyebrow tone={colors.danger}>This job was cancelled</Eyebrow>

                        {/*
                          * The office's own words, read back.
                          *
                          * A reason is required before a ticket can be
                          * cancelled at all, so there is nearly always one.
                          * The line underneath is for the handful of older
                          * tickets cancelled before that rule existed - and it
                          * promises nothing it cannot keep, because there is
                          * nobody on the other end of a "we will tell you".
                          */}
                        <Body style={{ marginTop: space.sm }}>
                            {ticket.cancelReason
                                || "No reason was recorded for this one. You can book it again below."}
                        </Body>

                        <Button
                            tone="quiet"
                            icon="rotate-ccw"
                            style={{ marginTop: space.md }}
                            onPress={() => router.push("/(tabs)/services")}
                        >
                            Book it again
                        </Button>
                    </Card>
                ) : null}

                {/* ---- watching them come ---- */}
                {live ? (
                    <JobTrack
                        token={ticket.trackingToken}
                        destination={ticket.destination}

                        /* The card hears the ride live; this is how the rest
                           of the screen hears it too - see JobTrack. */
                        onStage={load}
                        onOpen={() => router.push("/track/" + ticket.trackingToken)}
                    />
                ) : null}

                {/* ---- the codes at the door ---- */}
                {ticket.codes?.start || ticket.codes?.close ? (
                    <Card style={{ marginTop: space.xl }}>
                        <Eyebrow>At the door</Eyebrow>
                        <Title style={{ fontSize: 18, marginTop: space.xs }}>
                            Your codes
                        </Title>
                        <Small style={{ marginTop: space.xs }}>
                            Read the first one out when they arrive, and the second only once the
                            work is finished and you are happy with it. Nothing can be started or
                            closed without them.
                        </Small>

                        <View style={s.codes}>
                            {ticket.codes.start ? (
                                <View style={s.code}>
                                    <Small style={s.codeLabel}>To start</Small>
                                    <Body style={s.codeDigits}>{ticket.codes.start}</Body>
                                </View>
                            ) : null}

                            {ticket.codes.close ? (
                                <View style={s.code}>
                                    <Small style={s.codeLabel}>To close</Small>
                                    <Body style={s.codeDigits}>{ticket.codes.close}</Body>
                                </View>
                            ) : null}
                        </View>
                    </Card>
                ) : null}

                {/* ---- who is coming ---- */}
                {ticket.technician ? (
                    <Card style={{ marginTop: space.lg }}>
                        <Eyebrow>Who is coming</Eyebrow>

                        <View style={s.person}>
                            {/*
                              * His own face, not a drawing of a person.
                              *
                              * Somebody is about to open their front door to
                              * this man, and the one thing that makes that
                              * easy is having already seen him. The picture is
                              * on the ticket the moment the office assigns him
                              * - it was simply never drawn here.
                              *
                              * Tappable, because 44 points is enough to tell
                              * two people apart and not enough to recognise
                              * one at the door.
                              */}
                            <Pressable
                                onPress={() => ticket.technician.photo && setShowingFace(true)}
                                disabled={!ticket.technician.photo}
                                hitSlop={6}
                            >
                                <Art
                                    src={ticket.technician.photo}
                                    icon="user"
                                    iconSize={22}
                                    tr="w-160"
                                    radius={28}
                                    style={s.avatar}
                                />
                            </Pressable>

                            <View style={{ flex: 1 }}>
                                <Title style={{ fontSize: 16 }}>{ticket.technician.name}</Title>

                                <Small>
                                    {ticket.technician.rating
                                        ? Number(ticket.technician.rating).toFixed(1) + " ★"
                                        : "Cosmosgen engineer"}
                                </Small>

                                {/* The number in full, beside the button that
                                    dials it. A customer standing outside with
                                    a dead app still has to be able to read it
                                    out, and a button alone cannot be read. */}
                                {ticket.technician.phone ? (
                                    <Small style={{ color: colors.ink, fontFamily: font.semibold }}>
                                        {ticket.technician.phone}
                                    </Small>
                                ) : null}
                            </View>

                            {ticket.technician.phone ? (
                                <Pressable
                                    onPress={() => Linking.openURL("tel:" + ticket.technician.phone)}
                                    style={s.call}
                                    android_ripple={null}
                                >
                                    <GradientFill color={colors.brand} />
                                    <Icon name="phone" size={17} color="#ffffff" />
                                </Pressable>
                            ) : null}
                        </View>
                    </Card>
                ) : null}

                {/* ---- what was asked for ---- */}
                <Card style={{ marginTop: space.lg }}>
                    <Eyebrow>What you asked for</Eyebrow>
                    <Body style={{ marginTop: space.sm }}>{ticket.problemDescription}</Body>

                    {ticket.selectedIssues?.length ? (
                        <>
                            <Rule style={{ marginVertical: space.md }} />
                            <Small>{ticket.selectedIssues.join(" · ")}</Small>
                        </>
                    ) : null}
                </Card>

                {/*
                  * ---- what the customer thought ----
                  *
                  * Only on a finished job, and above the bill rather than
                  * below it: somebody who has just scrolled past a total is
                  * answering a different question from somebody who has just
                  * read what was done. The assistant will ask the same thing
                  * by telephone once the client's Exotel line is in place;
                  * this is the half that needs nobody to pick up.
                  */}
                {ticket.status === "Closed" ? (
                    <RateJob ticket={ticket} onRated={load} />
                ) : null}

                {/*
                  * The way out of a booking, while there is still a booking to
                  * get out of.
                  *
                  * Only on a job that is actually running. A closed or already
                  * cancelled one has nothing to call off, and a button that
                  * exists to explain why it cannot be used is worse than no
                  * button. What happens next - ended outright, or a request to
                  * the office - depends on whether anybody has accepted it, and
                  * the screen behind this says which before anything is sent.
                  */}
                {!["Closed", "Cancelled"].includes(ticket.status) ? (
                    <Button
                        tone="plain"
                        icon="x-circle"
                        style={{ marginTop: space.lg }}
                        onPress={() => router.push("/cancel/" + ticket.id)}
                    >
                        Cancel this booking
                    </Button>
                ) : null}

                {/* ---- the bill, once there is one ---- */}
                {ticket.bill ? (
                    <Card style={{ marginTop: space.lg }}>
                        <Eyebrow>The bill</Eyebrow>

                        <View style={s.billHead}>
                            <View style={{ flex: 1 }}>
                                <Title style={{ fontSize: 16 }}>{ticket.bill.invoiceNumber}</Title>
                                <Small>
                                    {ticket.bill.paid ? "Paid" : "Not paid yet"}
                                    {ticket.bill.method ? " · " + ticket.bill.method : ""}
                                </Small>
                            </View>
                            <Display style={{ fontSize: 28 }}>₹{ticket.bill.totalDisplay}</Display>
                        </View>

                        {ticket.bill.workDone ? (
                            <>
                                <Rule style={{ marginVertical: space.md }} />
                                <Small>{ticket.bill.workDone}</Small>
                            </>
                        ) : null}

                        {/*
                          * The invoice itself, once it has been made.
                          *
                          * It already goes out over WhatsApp, but a customer
                          * looking at the job a week later is here, not in a
                          * chat thread - and a bill somebody has to go hunting
                          * for is a bill they will ring the office about.
                          * Opened in the phone's own browser, which is what
                          * gives them Save and Share without us building
                          * either.
                          */}
                        {ticket.bill.pdfUrl ? (
                            <>
                                <Rule style={{ marginVertical: space.md }} />
                                <Button
                                    tone="plain"
                                    icon="download"
                                    onPress={() => Linking.openURL(ticket.bill.pdfUrl)}
                                >
                                    Download the invoice
                                </Button>
                            </>
                        ) : null}
                    </Card>
                ) : null}

                {/* Only the office can cancel a job, so this screen does not
                    pretend otherwise - it puts the customer in front of the
                    people who can. */}
                <Button
                    tone="plain"
                    mark={WhatsAppMark}
                    style={{ marginTop: space.xl }}
                    onPress={() => Linking.openURL(WHATSAPP_LINK)}
                >
                    Something wrong with this job?
                </Button>
            </ScrollView>

            {/*
              * Mounted only while it is open.
              *
              * An Android Modal is a second native window, and one left in the
              * tree with visible={false} is what put a black box over the
              * account tab. Rendering it conditionally is what stops that, and
              * it is also the honest thing: there is nothing to keep alive
              * between looks at a photograph.
              */}
            {showingFace && ticket?.technician?.photo ? (
                <Modal
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setShowingFace(false)}
                >
                    <Pressable style={s.lightbox} onPress={() => setShowingFace(false)}>
                        <Image
                            source={{ uri: ticket.technician.photo }}
                            style={s.face}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={160}
                        />

                        <Small style={s.lightboxHint}>
                            {ticket.technician.name} · tap anywhere to close
                        </Small>
                    </Pressable>
                </Modal>
            ) : null}
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    back: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
        backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.hairline,
    },
    icon: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },

    codes: { flexDirection: "row", gap: space.md, marginTop: space.lg },
    code: {
        flex: 1,
        backgroundColor: colors.sunken,
        borderRadius: radius.md,
        paddingVertical: space.md,
        alignItems: "center",
    },
    // Sentence case: it names the digits under it, and a name read out at
    // a front door is not a field on a form.
    codeLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkSoft },
    codeDigits: {
        fontFamily: font.displayBold,
        fontSize: 30,
        letterSpacing: 6,
        color: colors.ink,
        marginTop: 2,
    },

    person: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.md },

    /*
     * Bigger than the icons around it, deliberately.
     *
     * Somebody is about to open their front door to this man, and at 44 points
     * his photograph was the same size as the little tinted disc that marks a
     * section. It is the one thing on this screen worth recognising, so it is
     * the one thing allowed to be larger than a row's worth of chrome.
     */
    avatar: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    call: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: colors.brand,
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
    },

    billHead: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.md },

    /*
     * Near-black rather than the palette's own dark.
     *
     * This is the one surface in the app that is not a page: a photograph
     * shown on its own wants the room dark whichever theme the phone is in, so
     * nothing around it is competing with the face being looked at.
     */
    lightbox: {
        flex: 1,
        backgroundColor: "rgba(6,8,12,0.94)",
        alignItems: "center",
        justifyContent: "center",
        padding: space.lg,
    },
    face: { width: "100%", height: "72%", borderRadius: radius.lg },
    lightboxHint: { color: "rgba(255,255,255,0.65)", marginTop: space.lg },
});
