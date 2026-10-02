import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "./api";
import { LiveDot } from "./LiveDot";
import { decodePolyline, distanceLabel, journeyLeft, snapToRoute } from "./route";
import { createTrackSocket, onResume } from "./socket";
import { font, space, useThemedStyles } from "./theme";
import { Button, Card, Small, Title } from "./ui";

/**
 * Where the engineer is, live, as numbers.
 *
 * Split out of the card it was written inside because there are now two cards
 * that want it - this one on the job screen and the full one on the home
 * screen - and two copies of a socket subscription is two sockets, two reads
 * of /track, and eventually two answers that disagree.
 *
 * Everything below the fetch is arithmetic on what the socket sent, so it
 * costs nothing to run in either place.
 */
export const useRide = ({ token, destination, onStage }) => {
    const [live, setLive] = useState(null);

    /*
     * Read once, then fed by the socket.
     *
     * The socket only carries what changes, so a screen opened while the
     * vendor's phone is idle would say nothing at all until he moved.
     */
    useEffect(() => {
        if (!token) return undefined;

        let gone = false;

        api.get("/track/" + token)
            .then((res) => {
                const d = res?.data?.data;
                if (gone || !d) return;

                setLive((prev) => ({
                    stage: d.stage,
                    technicianAt: d.technicianAt || null,
                    encodedPolyline: d.ride?.encodedPolyline || null,
                    etaSeconds: d.ride?.etaSeconds ?? null,
                    distanceMeters: d.ride?.distanceMeters ?? null,
                    nearPlace: d.ride?.nearPlace || null,
                    offRoute: Boolean(d.ride?.offRoute),

                    // Anything the socket got in first wins - it is newer.
                    ...(prev || {}),
                }));
            })
            .catch(() => {
                // A distance is a courtesy; the screen around it says
                // everything that matters without it.
            });

        return () => { gone = true; };
    }, [token]);

    useEffect(() => {
        if (!token) return undefined;

        const socket = createTrackSocket(token);

        const onUpdate = (p) => setLive((prev) => {
            /*
             * "assigned" means the job changed hands - a different vendor has
             * it, or nobody does. What was worked out for the last one goes
             * with him rather than being counted down for the next.
             */
            const handedOver = p.stage === "assigned";
            const keep = (now, before) => (now ?? null) || (handedOver ? null : before);

            return {
                ...prev,
                stage: p.stage || prev?.stage,
                technicianAt: keep(p.technicianAt, prev?.technicianAt),
                encodedPolyline: keep(p.encodedPolyline, prev?.encodedPolyline),
                etaSeconds: handedOver ? null : (p.etaSeconds ?? prev?.etaSeconds),
                distanceMeters: handedOver ? null : (p.distanceMeters ?? prev?.distanceMeters),
                nearPlace: keep(p.nearPlace, prev?.nearPlace),
                offRoute: handedOver ? false : Boolean(p.offRoute),
            };
        });

        socket.on("track:update", onUpdate);
        const stopResume = onResume(socket, () => {});
        socket.connect();

        return () => {
            stopResume();
            socket.off("track:update", onUpdate);
            socket.disconnect();
        };
    }, [token]);

    /*
     * And the screen around it is told when he moves on.
     *
     * This card hears every stage the moment it happens, down its own socket.
     * The screen it sits on does not: it reads the job once and then watches
     * the customer's job list, which is only reloaded when a message is sent.
     * So the card said "At your door" above a badge still reading "On the way",
     * and Mohan had to pull the screen down to make the two agree.
     *
     * A stage changes perhaps four times in a job, so re-reading the ticket on
     * each is nothing, and it brings the whole screen with it - the badge, the
     * codes, the buttons that only appear once he is working.
     */
    const stageSeen = useRef(null);

    useEffect(() => {
        const now = live?.stage || null;
        if (!now) return;

        if (stageSeen.current && stageSeen.current !== now) onStage?.(now);
        stageSeen.current = now;
    }, [live?.stage, onStage]);

    const here = live?.technicianAt;

    // Only while he is actually riding is a distance or a time worth saying.
    const riding = live?.stage === "on_the_way";

    /*
     * The road he has left to ride, measured exactly as the map measures it.
     *
     * This used to take the straight line to the door and add a little for
     * bends, on the reasoning that a card is not a map and does not need the
     * route. That was wrong for one plain reason: both screens were on at once
     * and they disagreed. The card said four hundred metres and three minutes,
     * the map said six hundred and thirty and four - and around Mohan's own
     * house the road is more than twice the straight line, so the gap was not
     * a rounding.
     *
     * Two numbers for one journey is worse than either number. The route is
     * already here - the socket carries it for this very card - so it is
     * measured, and the figure is the same figure the map is showing.
     */
    const road = decodePolyline(live?.encodedPolyline);
    const onRoad = snapToRoute(road, here ? { latitude: here.lat, longitude: here.lon } : null);

    const left = journeyLeft({
        // Off the road we drew, its length is not his journey any more - the
        // same rule the map follows, so the two still agree.
        remaining: live?.offRoute ? null : onRoad.remaining,
        from: here ? { latitude: here.lat, longitude: here.lon } : null,
        to: destination ? { latitude: destination.lat, longitude: destination.lon } : null,

        /*
         * The route's own pace, unless he has left the route.
         *
         * Distance over duration is how long a metre of this journey takes,
         * and it is Google's answer rather than a guess - but it describes the
         * road he was on. Once he is off it, the plain city pace is the
         * honest one until the new route arrives.
         */
        etaSeconds: live?.offRoute ? null : live?.etaSeconds,
        distanceMeters: live?.offRoute ? null : live?.distanceMeters,
    });

    /*
     * What the card says, stage by stage.
     *
     * It used to answer only one question - how far away is he - and kept
     * answering it after he had arrived: "1 min away, 10 m" with the badge
     * above it reading "At your door". A distance is the right thing to say
     * while somebody is riding and the wrong thing to say once he is standing
     * at the door, and wronger still once he is inside working.
     */
    const said = {
        arrived: {
            title: "At your door",
            line: "They have reached your address.",
        },
        working: {
            title: "Work under way",
            line: "They are on the job now.",
        },
        done: {
            title: "All finished",
            line: "The work on this job is done.",
        },
    }[live?.stage];

    const headline = said
        ? said.title
        : !here
            ? "Lining somebody up"
            : riding && left.minutes
                ? left.minutes + " min away"
                : distanceLabel(left.metres) + " away";

    const under = said
        ? said.line
        : !here
            ? "We will show you how far away they are as soon as somebody is on it."
            : riding
                ? (live?.nearPlace ? "Near " + live.nearPlace : distanceLabel(left.metres) + " to go")
                : "Somebody is on their way to accepting this job.";

    /*
     * How much of the journey is behind him, as a fraction.
     *
     * There is no "total distance" on the wire - every update says how far is
     * left, and nothing says how far it was to begin with. The furthest figure
     * seen on this ride is that beginning: it is recorded the first time the
     * socket speaks and only ever grows, so a vendor who sets off, doubles
     * back for a part and starts again does not send the bar backwards.
     *
     * Kept in a ref rather than state because nothing should re-render when it
     * changes - it only ever changes at the same moment the distance does.
     */
    const startMetres = useRef(null);

    if (typeof left.metres === "number") {
        if (startMetres.current == null || left.metres > startMetres.current) {
            startMetres.current = left.metres;
        }
    }

    /*
     * Full once he is there, and it stays full.
     *
     * This was only ever computed while he was riding, so the moment the
     * stage turned to "arrived" the bar emptied itself - the customer
     * watched the journey fill up and then, at the exact moment it should
     * have been complete, go back to nothing. The job had not gone
     * backwards; the only thing that had changed was that there was no
     * distance left to divide by.
     *
     * Arrived, working and done are all "the journey is over", so they are
     * all one.
     */
    const done = ["arrived", "working", "done"].includes(live?.stage);

    const progress = done
        ? 1
        : (riding && startMetres.current)
            ? Math.max(0, Math.min(1, 1 - (left.metres / startMetres.current)))
            : 0;

    return { live, here, riding, left, headline, under, progress };
};

/**
 * How far away they are, and a way in to the map.
 *
 * There used to be a live map on this screen - the door, the arc, the bike,
 * all of it, in a card. It was the right idea and the wrong place. A MapView
 * is a native view with an engine behind it, so the job screen stuttered every
 * time it opened; the card had to draw its own tiles, its own loading state
 * and its own route, and each of those was a second chance to show something
 * half-finished. Mohan watched a dashed line sit there after the vendor had
 * accepted, on a map the size of a postcard, and asked for the postcard to go.
 *
 * So the numbers stay and the picture goes. The distance is the answer to the
 * question somebody opens this screen to ask, it costs nothing to draw, and it
 * is live. The map itself is one tap away, full screen, where it is worth the
 * wait.
 */
export const JobTrack = ({ token, destination, onOpen, onStage }) => {
    const s = useThemedStyles(makeStyles);
    const { riding, left, headline, under } = useRide({ token, destination, onStage });

    return (
        <Card style={{ marginTop: space.xl }}>
            <View style={s.head}>
                <LiveDot style={s.dot} />
                <Small style={s.eyebrow}>LIVE</Small>

                {riding && left.metres != null ? (
                    <Small style={s.far}>{distanceLabel(left.metres)}</Small>
                ) : null}
            </View>

            <Title style={{ fontSize: 20, marginTop: space.xs }}>{headline}</Title>
            <Small style={{ marginTop: 2 }}>{under}</Small>

            <Button
                icon="map"
                tone="field"
                style={{ marginTop: space.lg }}
                onPress={onOpen}
            >
                Track on the map
            </Button>
        </Card>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    head: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },
    eyebrow: {
        fontFamily: font.bold,
        fontSize: 10.5,
        letterSpacing: 1.4,
        color: colors.brandDeep,
    },

    // Pushed to the far edge, where a figure belongs on a row of labels.
    far: { marginLeft: "auto", fontFamily: font.semibold, color: colors.ink },
});
