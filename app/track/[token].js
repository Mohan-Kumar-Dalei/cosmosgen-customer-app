import { useCallback, useEffect, useRef, useState } from "react";
import { Easing, InteractionManager, Linking, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { AnimatedRegion, Circle, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorFrom } from "../../src/api";
import { Carrier } from "../../src/Carrier";
import { MapWait } from "../../src/MapWait";
import { RiderMarker } from "../../src/RiderMarker";
import { Waiting } from "../../src/Waiting";
import { arcBetween, bearing, decodePolyline, distanceLabel, journeyLeft, lengthOf, pathCovered, pointFrom, resample, snapToRoute } from "../../src/route";
import { createTrackSocket, onResume } from "../../src/socket";
import { font, radius, space, useColors, useScheme, useThemedStyles } from "../../src/theme";
import { Art, Body, Button, Display, GradientFill, Notice, Small, Title } from "../../src/ui";
import { Icon } from "../../src/Icon";

/**
 * Watching somebody come, the way anybody expects to watch somebody come.
 *
 * The map fills the screen and the job sits on a card over it, because the
 * moving dot is the thing being looked at - a status list with a small map
 * under it is the version people close and ring the office instead.
 *
 * The dot moves because the engineer's phone said so, not because a timer went
 * off: the only interval on this screen re-renders the countdown so "12 min"
 * becomes "11 min" while nothing else is happening.
 */
/**
 * How close the map sits.
 *
 * Mohan chose this against real tiles on the tracking demo, working up from
 * the framing the screen used to have. 18 is the level individual buildings
 * and lane names are drawn at.
 */
const MAP_ZOOM = 18;

/** How long the map leaves the customer alone after they drag it themselves. */
const HANDS_OFF_MS = 10000;

/** How long the bike stands at the door before it is taken off the map. */
const RIDER_LINGER_MS = 30000;

/** Close enough to the door to count as standing at it rather than riding. */
const AT_DOOR_METRES = 25;

/** The index of "arrived" in STAGES, which is the stage that wait belongs to. */
const ARRIVED = 2;

/** How long the bike takes to slide to a new fix. Fixes come about every 5 s. */
const GLIDE_MS = 4200;

/**
 * Unless the last one was late, in which case it takes about as long as it
 * really took.
 *
 * Five seconds is what the phone aims for and not what it manages. In a pocket
 * it misses one altogether now and then, so the next position is ten or
 * fifteen seconds of riding away - and gliding that in four seconds made the
 * bike sprint, arrive, and then sit still for the rest of the gap. Twice the
 * speed, then nothing, then twice the speed again.
 *
 * Measuring the gap and taking a shade less than it keeps the bike moving at
 * something like the speed it is really going, whatever the phone is doing.
 * The bounds are there because a gap of half a second is a duplicate fix and a
 * gap of two minutes is a phone that was switched off, and neither should set
 * the pace.
 */
const GLIDE_MIN_MS = 1500;
const GLIDE_MAX_MS = 14000;

/**
 * How long each step of the walk is, in metres.
 *
 * It decides two things at once: how smoothly the bike moves, and how close
 * the head of the drawn line stays to it - the line is cut at the step he is
 * riding. Each step is one re-render of this screen, and at city speed five
 * metres is about two a second, which is nothing.
 */
const STEP_METRES = 5;

/**
 * How far back up the road he has to go before it counts as going back.
 *
 * A fix is good to twenty-odd metres from a phone in a pocket, so the snapped
 * point slides a little either way between two of them even on a bike that
 * never stopped. Reacting to that would throw the walk away several times a
 * journey for movement nobody can see. A cricket pitch further back is a fix
 * that has genuinely landed behind the last one.
 */
const BACKWARDS_METRES = 20;

/**
 * How far off the line he has to be for the screen to stop believing it.
 *
 * Lower than the server's seventy, and deliberately: the server is deciding
 * whether to buy a route, and the screen is deciding whether to keep showing
 * one. Coming back is a shorter distance than leaving, which is what stops the
 * two markers trading places on a wobbly fix.
 */
const LOST_ROAD_METRES = 45;
const BACK_ON_ROAD_METRES = 30;

/**
 * And how long the bike waits, stopped, before he takes over.
 *
 * Mohan asked for the pause by name: the bike stops where it is, the line it
 * was following fades, and a moment later the bike is gone and somebody is
 * flying instead. Read quickly it is one movement - "he has left the road" -
 * and told all at once it is just two markers swapping.
 */
const PAUSE_BEFORE_FLIGHT_MS = 900;

const STAGES = [
    { key: "assigned", label: "Finding somebody", line: "We are lining somebody up for this job." },
    { key: "on_the_way", label: "On the way", line: "They have set off towards you." },
    { key: "arrived", label: "Arrived", line: "They are at your address." },
    { key: "working", label: "Working", line: "The job is under way." },
    { key: "done", label: "Done", line: "The work is finished." },
];

export default function Track() {
    const { token } = useLocalSearchParams();
    const router = useRouter();
    const colors = useColors();
    const scheme = useScheme();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const [data, setData] = useState(null);

    // The engineer's photo, opened full width.
    const [showingFace, setShowingFace] = useState(false);

    /*
     * Whether Google has finished drawing the map underneath.
     *
     * A MapView does not appear with the screen. It mounts, asks Google for
     * tiles, and until those land it is a flat grey rectangle with a rider
     * marker floating on nothing - which for a second or two looks exactly
     * like a map that has failed. The card of job details sits on top and is
     * readable the whole time, so what is needed is a cover over the map area
     * alone, not a screen in front of everything.
     */
    const [mapReady, setMapReady] = useState(false);

    /*
     * The screen first, the map after.
     *
     * A MapView is a native view with an engine behind it, and building one
     * costs enough to be felt: it was being built in the same frames as the
     * push animation, so the screen crawled in from the right and the back
     * button did not answer for a moment. Mohan asked for exactly this - the
     * page immediately, the map when it is ready - and it is what every
     * delivery app does: the card of details is readable while the map is
     * still arriving.
     *
     * runAfterInteractions waits for the navigation animation to finish, so
     * the cost lands on a screen that is already still.
     */
    const [mapMounted, setMapMounted] = useState(false);
    const [error, setError] = useState("");
    const [, setTick] = useState(0);

    const map = useRef(null);

    /** Whether the camera has been put where it belongs at least once. */
    const aimed = useRef(false);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => setMapMounted(true));
        return () => task.cancel();
    }, []);

    const load = useCallback(async () => {
        try {
            const res = await api.get("/track/" + token);
            setData(res.data.data);
            setError("");
        } catch (err) {
            setError(errorFrom(err, "This tracking link is not valid any more."));
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const socket = createTrackSocket(String(token));

        /*
         * The position is merged into what is already on screen rather than
         * replacing it. The event carries only what moved, so a whole-object
         * assignment would blank the technician's name and the address every
         * time the bike moved a few metres.
         */
        const onUpdate = (p) => {
            /*
             * Except when the job changes hands.
             *
             * An update that says "assigned" means somebody new has it, or
             * nobody has it - the office moved it, or the vendor handed it
             * back. Whatever was worked out for the last rider belongs to the
             * last rider, so the route, the estimate and the locality go with
             * him rather than being carried over onto the next one.
             */
            const handedOver = p.stage === "assigned";
            const keep = (now, before) => (now ?? null) || (handedOver ? null : before);

            setData((prev) => (prev ? {
                ...prev,
                stage: p.stage || prev.stage,
                technicianAt: keep(p.technicianAt, prev.technicianAt),
                ride: {
                    ...prev.ride,
                    etaSeconds: handedOver ? null : (p.etaSeconds ?? prev.ride?.etaSeconds),
                    etaAt: keep(p.etaAt, prev.ride?.etaAt),
                    distanceMeters: handedOver ? null : (p.distanceMeters ?? prev.ride?.distanceMeters),
                    encodedPolyline: keep(p.encodedPolyline, prev.ride?.encodedPolyline),
                    nearPlace: keep(p.nearPlace, prev.ride?.nearPlace),

                    // Whether the drawn road still describes him. Sent on
                    // every position, so it is taken as given rather than
                    // remembered - a stale "yes" would keep the line hidden
                    // after he was back on it.
                    offRoute: handedOver ? false : Boolean(p.offRoute),
                },

                // Named the moment he accepts, and nobody again if the job
                // goes back to the office.
                technician: handedOver
                    ? { name: null, phone: null, rating: null, photo: null }
                    : (p.technician || prev.technician),
            } : prev));
        };

        /*
         * A change of stage goes and fetches the rest.
         *
         * The event carries only what the server had to hand at that moment.
         * Accepting is the clearest case: the stage turns to "on the way" and
         * the route is worked out in the same breath, but if that fetch has
         * not landed the screen would show the bike with the dashed arc still
         * under it until the next position ping - which is exactly what Mohan
         * saw, and why leaving the screen and coming back "fixed" it.
         */
        const onStage = (p) => {
            setData((prev) => {
                if (p.stage && prev && p.stage !== prev.stage) load();
                return prev;
            });
        };

        socket.on("track:update", onStage);
        socket.on("track:update", onUpdate);
        const stopResume = onResume(socket, load);
        socket.connect();

        // Only the countdown. Half a minute is often enough for a figure that
        // is measured in minutes.
        const clock = setInterval(() => setTick((n) => n + 1), 30000);

        return () => {
            clearInterval(clock);
            stopResume();
            socket.off("track:update", onStage);
            socket.off("track:update", onUpdate);
            socket.disconnect();
        };
    }, [token, load]);

    const here = data?.technicianAt;
    const there = data?.destination;
    const line = decodePolyline(data?.ride?.encodedPolyline);

    /*
     * The bike put on the road, the road behind him taken away.
     *
     * Both come from one measurement - see snapToRoute - and both are worked
     * out here rather than asked of the server, so they happen on every fix
     * the socket delivers instead of only when a fresh route is computed.
     * That is the whole of "the line only cut when I reloaded".
     */
    /*
     * How far he is from the road on screen, and whether that still counts as
     * being on it.
     *
     * The server's own figure is seventy metres, and it has to be: it is
     * deciding whether to spend money on a new route. The screen is deciding
     * something cheaper and more urgent - whether the line under the bike is
     * still describing him - and waiting for seventy metres of drift at cycle
     * speed is twenty seconds of watching a bike beside a road it is not on.
     * Mohan asked for it sooner, so the screen answers sooner.
     *
     * Two figures rather than one, because a single one flickers: he is called
     * off the road at forty-five metres and back on it at thirty. Between the
     * two, whatever was decided last stands.
     */
    const at0 = here ? { latitude: here.lat, longitude: here.lon } : null;

    /* Snapped with no cut-off, so the distance itself can be measured. */
    const snapped = snapToRoute(line, at0, Infinity);

    const drift = (snapped.point && at0) ? lengthOf([at0, snapped.point]) : Infinity;

    const onHisRoad = line.length > 1
        && drift < (flying ? BACK_ON_ROAD_METRES : LOST_ROAD_METRES);

    /*
     * And off the road, the road has nothing left to say about him.
     *
     * An empty remainder rather than the whole line: handing back the line from
     * its own beginning is what drew it as a fold, running back past the bike
     * and forward again - the V Mohan photographed three times.
     */
    const ride = onHisRoad
        ? snapped
        : { point: at0, remaining: [], heading: snapped.heading };

    /*
     * He has left the road we drew, and a new one is being worked out.
     *
     * Three things were tried here. Leaving the old road up made the bike ride
     * away from its own line. Replacing it with the bow was honest and looked
     * like the bike flying across open ground to change route, and worse, it
     * came and went every time the fixes wandered. What Mohan asked for is the
     * quiet one: change nothing, and stop.
     *
     * So for the ten or fifteen seconds it takes the server to buy a fresh
     * route, the map holds exactly what it had - the last road, the bike where
     * it reached on it - and simply does not move. The moment the new line
     * lands, the bike is placed on it where he really is and the ride carries
     * on. Nothing appears, nothing vanishes, and nothing flickers.
     */
    const strayed = Boolean(data?.ride?.offRoute);
    const onRoute = line.length > 0;

    /*
     * Riding, rather than merely assigned.
     *
     * The bike belongs to a journey that has started. Until the vendor accepts
     * and sets off there is no route, no heading and nothing moving, so the
     * waiting mark is what goes on the map.
     *
     * Declared here, beside the other flag it is read with. It used to sit
     * three hundred lines further down, below the very line that reads it -
     * and a const read before it is built is undefined once this is compiled
     * for the phone. So onBike was false for the whole ride: the road drawn,
     * the bike replaced by the waiting mark on top of it. Exactly what Mohan
     * photographed.
     */
    const riding = data?.stage === "on_the_way" || data?.stage === "arrived";

    /*
     * Which way to point when there is no road to point along.
     *
     * snapToRoute gives a heading off the route, which is the steadier answer
     * and the right one while he is riding it. Before a route exists - and
     * after the ride has ended - there is none, and the marker was left facing
     * north like a sticker. The way he is actually travelling is the next best
     * thing, and it is what the blue dot in every map app falls back to.
     */
    const lastAt = useRef(null);
    const course = useRef(null);

    if (here) {
        const now = { latitude: here.lat, longitude: here.lon };
        const was = lastAt.current;

        if (was && Math.hypot(now.latitude - was.latitude, now.longitude - was.longitude) * 111320 > 8) {
            course.current = bearing(was, now);
            lastAt.current = now;
        } else if (!was) {
            lastAt.current = now;
        }
    }

    /**
     * Which way to draw the bike: the way he is going.
     *
     * The road's own direction is the steady answer and the right one while he
     * is riding the road we drew - it does not wobble with the fixes, and it
     * turns exactly at the corner. But it is the direction of the nearest bit
     * of *that* line, and a rider who has taken his own lane can be alongside
     * a stretch of it that runs the other way. Then the road says north and
     * the man is going south, and the bike is drawn riding backwards down a
     * street, which is what Mohan photographed.
     *
     * A motorcycle does not travel backwards. So when the two disagree by more
     * than a right angle, the road is the one that is wrong about him and the
     * way he is actually moving wins. Under that, the road wins, and the bike
     * keeps its steadiness on the stretch where the road does describe him.
     */
    const facingNow = () => {
        /*
         * What his own phone says first, when it says anything.
         *
         * It is the only answer that is measured rather than inferred: the
         * handset has a compass and knows its own speed, so it can tell a bike
         * standing at a junction pointing left from one pointing right, which
         * nothing here can. Everything below is what we fall back to when the
         * phone has not told us - an older build of the vendor app, a handset
         * with no compass, a fix that arrived without one.
         */
        const said = Number(here?.heading);
        if (Number.isFinite(said) && said >= 0) return said;

        const road = ride.heading;
        const going = course.current;

        if (going == null) return road ?? 0;
        if (road == null) return going;

        const apart = Math.abs((((road - going) % 360) + 540) % 360 - 180);
        return apart > 90 ? going : road;
    };

    /*
     * The angle the bike is drawn at, which is not always the angle of the
     * road it has been snapped to - see the walk below.
     */
    const [facing, setFacing] = useState(0);

    /*
     * The bow, drawn from the bike rather than from the last fix.
     *
     * The marker is always a little behind the fix - it is gliding towards it,
     * which is the whole point of the glide - and at speed that gap is the
     * hundred metres a bike covers between two reports. Starting the bow at
     * the fix left it hanging in the air with the bike nowhere near it.
     *
     * Only before anybody has set off, now. A road being redrawn is not a
     * reason to draw anything new - see above.
     */
    const bike = step?.head || (here ? { latitude: here.lat, longitude: here.lon } : null);

    /*
     * He has set off, so he is on the bike - road or no road.
     *
     * This used to want a drawn road under him as well, on the reasoning that
     * riding with no line is the moment a route is being redrawn and lasts a
     * second or two. It is not only that any more: where the lanes he rides
     * are not in the map at all, there is no road to draw for the whole of
     * that stretch, and the customer watched a helmet - the mark for somebody
     * who has not left yet - glide down a dashed curve.
     *
     * The stage is what says whether he is riding. The line is only what says
     * whether we know the road he is riding down.
     */
    /*
     * Flying rather than riding, because there is no road under him.
     *
     * Declared here, above the line that reads it. It sat three hundred lines
     * further down - below onBike - and a const read before it is built is
     * undefined once this is compiled for the phone, so `!flying` was always
     * true and the bike stayed on the map beside him. Exactly what Mohan
     * photographed, and exactly the fault `riding` had in this same file.
     */
    const [flying, setFlying] = useState(false);

    /*
     * The beat before that: the line is no longer believed, and the bike is
     * standing still on it. See PAUSE_BEFORE_FLIGHT_MS.
     */
    const [lostRoad, setLostRoad] = useState(false);

    /** The timer that turns the pause into a flight. */
    const liftOff = useRef(null);

    const onBike = riding && !flying;

    /*
     * The bow, and only before he sets off.
     *
     * It used to stand in for the road whenever we had none, and on a real
     * journey that is most of the time a vendor spends in his own lanes. Mohan
     * looked for it in the field and could barely find it: a thin dashed curve
     * across half a screen of streets says nothing, and what it does say -
     * "straight there" - is not true of any city.
     *
     * So the bow keeps the one job it was good at. Between a vendor being
     * given the job and setting off there is no route to draw and nothing
     * moving, and a curve from him to the door is the honest picture of that.
     * Once he is riding, a road we cannot draw is shown by flying him over it
     * - see the walk below - not by drawing a line nobody can follow.
     */
    const arc = (!onRoute && !riding && bike && there?.lat != null)
        ? arcBetween(bike, { latitude: there.lat, longitude: there.lon })
        : [];

    /*
     * The bike slides between fixes instead of jumping to them.
     *
     * The vendor's phone reports every fifteen metres or five seconds, so the
     * marker was being handed a position that far ahead of the last one and
     * moved there in a single frame - a hop, then a wait, then another hop.
     * Nothing about the data was wrong; it simply arrives less often than the
     * eye wants to see movement.
     *
     * An AnimatedRegion is driven by the map itself rather than by React, so
     * the glide costs no re-renders of this screen - which matters on a screen
     * somebody leaves open for twenty minutes.
     *
     * A shade longer than the gap between fixes would leave the bike always
     * behind; a shade shorter leaves a still moment before the next one. Just
     * under is right.
     */
    const rider = useRef(new AnimatedRegion({
        latitude: 0, longitude: 0, latitudeDelta: 0, longitudeDelta: 0,
    })).current;

    /*
     * And one for him, for the stretches with no road - see the walk below.
     */
    const flier = useRef(new AnimatedRegion({
        latitude: 0, longitude: 0, latitudeDelta: 0, longitudeDelta: 0,
    })).current;

    /** Where the marker was last sent, which is not where the last fix was. */
    const shownAt = useRef(null);

    const placed = useRef(false);
    const at = ride.point || (here ? { latitude: here.lat, longitude: here.lon } : null);

    /*
     * And it slides along the road rather than straight at the next fix.
     *
     * Two fixes five seconds apart can have a corner between them. A single
     * glide from one to the other cuts across it, and the bike is turned to
     * the new road the moment the fix lands - so it turns early, on the
     * straight, and then drives diagonally over the corner it should have
     * gone round. What it should do is what it actually did: carry on to the
     * junction facing the way it came, turn there, and go on.
     *
     * pathCovered gives the route's own vertices between the two fixes. Each
     * one is a leg with its own heading and its own share of the five seconds,
     * and the walk is stopped if a newer fix arrives mid-way.
     */
    const covered = useRef(null);
    const drawnFrom = useRef(null);

    /*
     * When the last position landed, so the glide can be as long as the gap
     * really was rather than as long as it was supposed to be. See GLIDE_MIN_MS.
     */
    const fixAt = useRef(0);

    /** And how long the bike was given to cover it, so the camera keeps step. */
    const glideFor = useRef(GLIDE_MS);

    /*
     * Where the bike has actually got to, as against where the last fix says.
     *
     * The line used to be cut from the fix the moment it landed, while the
     * bike took four seconds to glide there - so the road ahead of him
     * vanished first and he rode up to meet a line that had already been
     * shortened. Mohan's words: the line cuts, then the bike comes. On the
     * road they are the same thing, so on the screen they should move
     * together.
     *
     * The walk below reports each leg as it starts, and the line is drawn from
     * there rather than from the fix, so the bike sits on the head of the line
     * the whole way down the road.
     */
    const [step, setStep] = useState(null);

    /* Nothing is left ticking when the screen closes mid-pause. */
    useEffect(() => () => clearTimeout(liftOff.current), []);

    /*
     * No road under him, so the bike is not on the map at all.
     *
     * The scene used to be a piece of theatre: somebody flew in, took hold of
     * the bike, carried it and set it down again. Every part of that was a
     * thing that could go wrong in front of a customer, and most of them did -
     * he landed beside the bike, he stood in a field while it rode off, the
     * hand-off hung half way. Mohan called it: stop carrying anything.
     *
     * What is left says the same thing with nothing to break. While the road
     * is unknown the bike is taken off the map and he flies at the vendor's own
     * position - one marker, real coordinates, no choreography. The moment a
     * road lands and the vendor is on it, he goes and the bike is back on it.
     */
    const glideTo = useCallback((region, to, ms) => region.timing({
        latitude: to.latitude,
        longitude: to.longitude,
        duration: ms,
        easing: Easing.linear,
        useNativeDriver: false,
    }).start(), []);


    useEffect(() => {
        if (!at) return undefined;

        /*
         * How long this position really took to arrive.
         *
         * A shade under the gap, so the bike is always still moving when the
         * next one lands rather than parked waiting for it. See GLIDE_MIN_MS.
         */
        const landed = Date.now();
        const waited = fixAt.current ? landed - fixAt.current : GLIDE_MS;
        fixAt.current = landed;

        const glide = Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, waited * 0.85));
        glideFor.current = glide;

        const road = data?.ride?.encodedPolyline || null;
        const sameRoute = drawnFrom.current === road;

        /*
         * No road on the ticket at all, so nothing drawn belongs to one.
         *
         * The walk keeps the last line it built, which is right while a road
         * is being replaced and wrong once there is no road to replace it
         * with - the old one simply stayed on screen under a bike that was
         * nowhere near it.
         */
        /*
         * No road on the ticket at all.
         *
         * Whatever is drawn belongs to a road that is no longer there - but
         * while he is riding it is also the only thing anybody knows about his
         * way, so it is kept and faded rather than wiped. Off a ride it goes:
         * a finished job has no road and should show none.
         */
        if (!road) {
            drawnFrom.current = null;
            if (!riding) setStep(null);
        }

        /*
         * Whether there is a road under him at all.
         *
         * Two ways there is not: the line we have is one he has left, or there
         * is no line because the map had no road to give. The screen treats
         * them the same, because to the customer they are the same - nobody
         * can say which street he is on.
         */
        // Either there is no road, or there is one and he is not on it.
        const roadless = riding && placed.current && (strayed || !onRoute || !onHisRoad);

        /*
         * Flying instead of riding, while there is no road.
         *
         * He is put at the vendor's own position and moved to each new one, so
         * what the customer follows is the truth: a man travelling, and no
         * claim about which street he is on. The bike is not drawn at all - see
         * the markers below - because a bike is a thing on a road.
         *
         * The bike's own marker is kept in step underneath, unseen, so that
         * when the road comes back it is already where he is rather than
         * flying in from wherever it was left.
         */
        if (roadless) {
            covered.current = ride.remaining;
            drawnFrom.current = road;

            /*
             * First the doubt, then the flight.
             *
             * The line fades and the bike stops on it, which is the honest
             * picture of the moment: that road was his and now we are not sure.
             * A beat later he has gone from it altogether and somebody is
             * flying at his position instead.
             */
            if (!lostRoad) {
                setLostRoad(true);

                /*
                 * And the line it was following stays where it is.
                 *
                 * Clearing it here was the fault Mohan saw: he asked for the
                 * road to fade, and instead it vanished with the bike, leaving
                 * an empty map with a card on it. A road we no longer believe is
                 * still the last thing we knew, and faint is exactly how to say
                 * that. It is replaced when a real one lands.
                 */
                /*
                 * He is put where the bike stopped, now, before anybody can
                 * see him.
                 *
                 * His marker's region had never been given a position until the
                 * first one arrived after take-off - and an AnimatedRegion that
                 * has not been told anything sits at nought degrees by nought
                 * degrees, in the sea off Africa. So he appeared there and flew
                 * in, which on screen was a man arriving late and from nowhere,
                 * some way past the turning. Mohan saw it twice and described it
                 * exactly: he does not show up where the road changed.
                 *
                 * Set here rather than on take-off, because the next position
                 * may be five seconds away and this is the place the scene is
                 * about: the spot where the vendor left the road.
                 */
                flier.setValue({
                    latitude: at.latitude, longitude: at.longitude,
                    latitudeDelta: 0, longitudeDelta: 0,
                });

                clearTimeout(liftOff.current);
                liftOff.current = setTimeout(() => setFlying(true), PAUSE_BEFORE_FLIGHT_MS);

                return undefined;
            }

            // Still waiting to take off: the bike holds where it stopped.
            if (!flying) return undefined;

            setFacing(facingNow());
            glideTo(flier, at, glide);

            // The bike is not drawn, but its marker is kept where he is so the
            // road, when it comes back, finds it already in the right place.
            rider.setValue({ latitude: at.latitude, longitude: at.longitude, latitudeDelta: 0, longitudeDelta: 0 });

            shownAt.current = at;

            return undefined;
        }

        // A road, and he is on it: he goes, the bike comes back.
        clearTimeout(liftOff.current);
        if (flying) setFlying(false);
        if (lostRoad) setLostRoad(false);

        const was = covered.current;
        covered.current = ride.remaining;
        drawnFrom.current = road;

        // The first one is where he is, not somewhere to travel from - gliding
        // in from nowhere would send the bike across the city on arrival.
        if (!placed.current) {
            placed.current = true;
            shownAt.current = at;
            setFacing(facingNow());
            rider.setValue({ latitude: at.latitude, longitude: at.longitude, latitudeDelta: 0, longitudeDelta: 0 });
            return undefined;
        }

        /*
         * A new road, and the ride picks up on it.
         *
         * Placed rather than glided: he is already somewhere else on a
         * different street, and sliding the marker across the blocks in
         * between would draw a journey he never made. The pause above is what
         * makes this read as tracking resuming rather than as a jump.
         */
        if (!sameRoute) {
            setStep(null);
            setFacing(facingNow());
            shownAt.current = at;
            rider.setValue({ latitude: at.latitude, longitude: at.longitude, latitudeDelta: 0, longitudeDelta: 0 });
            return undefined;
        }

        /*
         * He has gone backwards along the road being drawn.
         *
         * A fix can land behind the last one - the phone loses the sky for a
         * while and picks it up in the street before, a rider doubles back for
         * a turning he missed, or the position simply moves while the route
         * stays put. The walk below has no route geometry to use for that
         * (there are no corners between two fixes that went the wrong way), so
         * it walked the straight line between them - and drew the line from
         * the bike back down that stretch, then on from there to the door.
         *
         * That is the two routes Mohan photographed. It is not two lines and
         * nothing is stale: it is one line with a fold in it, running back the
         * way he came and then forward again, which reads as the map offering
         * a choice of roads. No delivery map does that. Swiggy's line only
         * ever runs the way the rider is going.
         *
         * So the fold is not drawn. The marker still glides to where he now
         * is, because the position is honest and a jump would be jarring, but
         * the line is only ever what is left of the journey from there.
         */
        if (was && was.length > 1 && lengthOf(ride.remaining) > lengthOf(was) + BACKWARDS_METRES) {
            setStep(null);
            setFacing(facingNow());

            rider.timing({
                latitude: at.latitude,
                longitude: at.longitude,
                duration: glide,
                easing: Easing.linear,
                useNativeDriver: false,
            }).start();

            return undefined;
        }

        const corners = pathCovered(was, ride.remaining);

        /*
         * With no corner between two fixes there is no route geometry to walk,
         * so the straight line between them is walked instead.
         */
        const rounding = corners.length >= 3;
        const straight = [(was && was[0]) || at, at];


        /*
         * Either way, in steps of a few metres.
         *
         * The line is cut at the step the bike is on, so a step is how far the
         * head of the line can be from the bike - and a road's own vertices
         * can be fifty metres apart on a straight stretch. See resample.
         */
        const path = resample(rounding ? corners : straight, STEP_METRES);
        const total = lengthOf(path) || 1;

        /*
         * The road past the end of this walk, taken now and kept.
         *
         * Held rather than read at draw time, because the two halves have to
         * be of the same moment. A fix arriving mid-walk changes what is left
         * of the route before the walk is rebuilt, and for one frame the line
         * was drawn as the old walk plus the new tail - which joins a point
         * the bike has already passed to a point beyond the one it is heading
         * for. On a straight nobody notices; at a corner the line cuts the
         * bend for a frame and snaps back, which is the flicker Mohan saw.
         */
        const tail = ride.remaining.slice(1);

        // A straight has no corner in it, so the road's own heading is the
        // honest one; a walked path takes each leg's bearing as it goes.
        const straightFacing = facingNow();

        let cancelled = false;

        const walk = (i) => {
            if (cancelled || i >= path.length) return;

            const from = path[i - 1];
            const to = path[i];

            setFacing(rounding ? bearing(from, to) : straightFacing);

            /*
             * What is left of the journey, from where he is to the end of the
             * road, as one line of one moment.
             *
             * From `i`, not from `i - 1`: the bike is riding into path[i], and
             * starting the line at the step behind it left the road he had
             * already covered drawn as a stub hanging off his back wheel. A
             * step is a few metres, so the head now sits under him.
             */
            shownAt.current = to;
            setStep({ line: [...path.slice(i), ...tail], head: to });

            rider.timing({
                latitude: to.latitude,
                longitude: to.longitude,
                duration: Math.max(80, (lengthOf([from, to]) / total) * glide),

                // Linear, or every leg would ease in and out of itself and the
                // bike would pulse its way down a straight road.
                easing: Easing.linear,
                useNativeDriver: false,
            }).start(({ finished }) => { if (finished) walk(i + 1); });
        };

        walk(1);

        return () => { cancelled = true; };
        // The coordinates are the dependency, not the object holding them.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [at?.latitude, at?.longitude, strayed]);

    /*
     * The line, cut where the bike is rather than where the fix is - see the
     * note on the walk above. Nothing is assembled here; the walk already
     * settled it, which is what keeps it whole at a corner.
     */
    const drawn = step?.line?.length ? step.line : ride.remaining;
    /*
     * Both numbers, measured from where he is now.
     *
     * The server's distance and estimate are worked out when the route is and
     * again every five minutes, so watching the last kilometre used to mean
     * watching "12 min - 3.4 km" sit still while the bike plainly came closer.
     * The line on screen already knows: what is left of it is what is left of
     * the journey. See journeyLeft.
     */
    const left = journeyLeft({
        // Off the road we drew, its length is not his journey any more: the
        // straight line to the door with a little added for bends is the
        // honest answer until the new route lands. See journeyLeft.
        remaining: strayed ? null : ride.remaining,
        from: here ? { latitude: here.lat, longitude: here.lon } : null,
        to: data?.destination?.lat != null
            ? { latitude: data.destination.lat, longitude: data.destination.lon }
            : null,
        etaSeconds: data?.ride?.etaSeconds,
        distanceMeters: data?.ride?.distanceMeters,
    });

    const eta = left.minutes;
    const stageIndex = Math.max(0, STAGES.findIndex((x) => x.key === data?.stage));

    /*
     * The bike stands at the door a moment before it goes.
     *
     * It used to stay on the map for the whole job, so a technician who was
     * already inside looking at the fridge was still drawn out on the road.
     * Taking it off the instant he arrives is worse, though: the marker
     * vanishes at the exact second the customer looks up to see where he got
     * to, which reads as the tracking breaking rather than the job starting.
     * So it waits half a minute, as Mohan asked, and then goes.
     *
     * Anything past "arrived" means that wait is long over, so the bike has
     * gone already - otherwise moving on to "working" would start a fresh
     * timer and bring it back.
     */
    const [lingered, setLingered] = useState(false);

    /*
     * The wait starts at the door, not at the edge of the circle.
     *
     * "Arrived" is declared a hundred metres out, which is the honest distance
     * to tell somebody their technician is here - but it is not where he
     * stops. Starting the half minute there took the bike off the map while it
     * was still riding up the street, which is the one stretch the customer is
     * really watching. So it waits until he is beside the door, and goes half
     * a minute after that.
     */
    const toDoor = (here && there?.lat != null)
        ? lengthOf([
            { latitude: here.lat, longitude: here.lon },
            { latitude: there.lat, longitude: there.lon },
        ])
        : null;

    const atDoor = toDoor != null && toDoor <= AT_DOOR_METRES;

    useEffect(() => {
        if (stageIndex !== ARRIVED || !atDoor) return undefined;

        const id = setTimeout(() => setLingered(true), RIDER_LINGER_MS);

        // Cleared on the way out as well, so a job put back to "on the way"
        // gets its full wait again rather than none.
        return () => { clearTimeout(id); setLingered(false); };
    }, [stageIndex, atDoor]);

    const riderGone = stageIndex > ARRIVED || (stageIndex === ARRIVED && lingered);

    /*
     * The map keeps the engineer under the middle of the screen.
     *
     * It used to frame both ends once, on the first fix, and then never move
     * again. That is why Mohan's screenshot of an arrival was still showing
     * three kilometres of city: the framing was decided while the engineer was
     * three kilometres away, and by the time he reached the door the view had
     * not changed. You could see that somebody had arrived; you could not see
     * where.
     *
     * So it follows, at the zoom he picked off the demo - close enough to read
     * the lane, which is the question this screen exists to answer.
     */
    const [following, setFollowing] = useState(true);
    const resume = useRef(null);

    /*
     * Except when the customer is looking at something themselves.
     *
     * Dragging the map hands control over; ten quiet seconds hands it back.
     * Taking it permanently would strand somebody who nudged the map once at
     * the start of a twenty minute ride, and taking it back instantly would
     * make the map impossible to read at all.
     */
    const nudge = useCallback(() => {
        setFollowing(false);
        clearTimeout(resume.current);
        resume.current = setTimeout(() => setFollowing(true), HANDS_OFF_MS);
    }, []);

    useEffect(() => () => clearTimeout(resume.current), []);

    /*
     * Where the camera is looking, which is whatever is actually on the map.
     *
     * Null means stay where you are, and that is what the pause needs: the bike
     * has stopped on the faded line and is the only thing to see, while the
     * positions still arriving belong to a vendor who is already somewhere
     * else. A camera that followed them slid off to an empty stretch of street
     * and left the bike behind - so for that second the screen showed nothing
     * at all, and he only reappeared once somebody flew into frame. Mohan
     * described it exactly: he does not show up where the road changed, he
     * shows up later, when the camera gets to him.
     *
     * Riding or flying, the thing on screen is at the position coming in, so
     * the camera follows it as before.
     */
    const lookAt = (lostRoad && !flying)
        ? null
        : (ride.point || (here ? { latitude: here.lat, longitude: here.lon } : null));

    useEffect(() => {
        if (!following || riderGone || !map.current || !lookAt) return;

        /*
         * The first look is not a move, it is where the screen opens.
         *
         * Animating it meant the customer tapped Track and then watched the
         * map travel to the bike - which is the wrong thing to spend their
         * first four seconds on. Put there, and afterwards moved: every later
         * one takes the same time as the bike's own glide, so the map and the
         * marker travel together rather than the view arriving first.
         */
        if (!aimed.current) {
            aimed.current = true;
            map.current.setCamera({ center: lookAt, zoom: MAP_ZOOM });
            return;
        }

        map.current.animateCamera({ center: lookAt, zoom: MAP_ZOOM }, { duration: glideFor.current });
        // The coordinates are the dependency, not the object holding them -
        // that is rebuilt on every render whether or not anybody has moved.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [following, riderGone, lookAt?.latitude, lookAt?.longitude]);

    /*
     * No full-page wait here.
     *
     * This screen used to hand the whole window to the app's Loading mark
     * while the first request was in flight - logo, plate and all - so tapping
     * "Track on the map" gave a blank page with a spinner on it, and the map
     * was not even being built yet. Mohan asked for the opposite and he is
     * right: the page arrives at once, and the two things that genuinely take
     * time say so where they sit. The card below reads "Reading the job" until
     * the job lands; the map's own panel says "Loading" until Google has drawn
     * it.
     */
    if (error) {
        return (
            <View style={[s.blocked, { paddingTop: insets.top + space.xxl }]}>
                <Display>Not tracking any more</Display>
                <Notice>{error}</Notice>
                <Button onPress={() => router.back()}>Back to the job</Button>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            {mapMounted && (here || there?.lat != null) ? (
            <MapView
                ref={map}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                style={StyleSheet.absoluteFill}
                /*
                 * Open at the zoom it is going to settle at.
                 *
                 * It used to open on a region about eight streets wide and
                 * then fly in to MAP_ZOOM over four seconds. Every customer
                 * therefore began the screen looking at a bike drawn far too
                 * large for the streets under it, and then watched the ground
                 * rush up. Mohan asked for it to be there on arrival, and he
                 * is right: the first frame is what people judge, and there is
                 * nothing to see in the four seconds before it.
                 */
                initialCamera={{
                    center: {
                        latitude: here?.lat ?? there?.lat ?? 20.2961,
                        longitude: here?.lon ?? there?.lon ?? 85.8245,
                    },
                    zoom: MAP_ZOOM,
                    pitch: 0,
                    heading: 0,
                    altitude: 0,
                }}
                /*
                 * Drawn, not merely mounted.
                 *
                 * onMapReady fires when the map object exists, which is well
                 * before Google has fetched a single tile - so the cover came
                 * off while the map was still blank and the customer watched a
                 * blue line and a bike floating on grey. onMapLoaded is the
                 * one that means the tiles are on screen.
                 *
                 * It is Android only, so onMapReady stays as the fallback:
                 * anywhere it does not fire, this behaves as it did before.
                 */
                onMapReady={() => { if (Platform.OS !== "android") setMapReady(true); }}
                onMapLoaded={() => setMapReady(true)}
                showsUserLocation={false}
                toolbarEnabled={false}

                /*
                 * The customer does not get to zoom.
                 *
                 * This screen has one job - where is he, how long - and a map
                 * somebody has pinched down to street level answers neither.
                 * Dragging stays on, so a rider who moves off the edge can
                 * still be followed.
                 */
                zoomEnabled={false}

                /* Dragging the map is the customer saying "leave it there". */
                onPanDrag={nudge}
                pitchEnabled={false}
                rotateEnabled={false}
                userInterfaceStyle={scheme}
            >
                {onRoute ? (
                    /*
                     * The road, solid.
                     *
                     * `key` matters here, and the dash pattern being stated
                     * matters more. React sees one Polyline in this slot and
                     * reuses the same native view when the bow is replaced by
                     * the road - and on Android a dash pattern set on that
                     * view is not cleared by the new props simply leaving it
                     * out. The road came out dotted, following the street
                     * exactly, which is how Mohan photographed it: the arc's
                     * dashes wearing the route's coordinates. Two keys mean
                     * two views, and the null says solid out loud.
                     */
                    <Polyline
                        key="route"
                        coordinates={drawn}
                        strokeWidth={4}

                        /*
                         * Faded while he is off it.
                         *
                         * The line stops moving then - it is the one thing on
                         * screen we are no longer sure of - and a line that
                         * has stopped but looks exactly as confident as it did
                         * a moment ago is a quiet lie. Dropping it to a third
                         * says "this was the road" without taking it away, and
                         * it comes back the instant the new one lands.
                         */
                        strokeColor={colors.accent + (lostRoad ? "55" : "")}
                        lineDashPattern={null}
                    />
                ) : (
                    /*
                     * Before anybody has set off, the bow.
                     *
                     * A job has a technician on it long before he presses
                     * Directions, and between those two moments the screen used
                     * to show two pins and nothing joining them - which reads as
                     * a map that has not finished loading. The curve says "this
                     * person, to that door" without claiming a route that has
                     * not been worked out. It is replaced by the real road line
                     * the instant there is one.
                     */
                    <Polyline
                        key="arc"
                        coordinates={arc}
                        strokeWidth={3}

                        /* The company's blue, dashed. It used to be grey,
                           which read as something switched off - the line is
                           live, it is only the road that is not known yet. */
                        strokeColor={colors.accent}
                        lineDashPattern={[6, 8]}
                    />
                )}

                {/*
                  * The ring that makes "arrived" mean something.
                  *
                  * The server declares arrival when the technician crosses
                  * this exact distance, and the radius comes from the server
                  * for that reason - so the customer is not asked to take the
                  * word for it, they watch the bike cross a line they can see.
                  */}
                {there?.lat != null ? (
                    <Circle
                        center={{ latitude: there.lat, longitude: there.lon }}
                        radius={data?.arrivalRadius || 100}
                        strokeColor={colors.brand + "55"}
                        fillColor={colors.brand + "14"}
                        strokeWidth={1.5}
                    />
                ) : null}

                {there?.lat != null ? (
                    <Marker coordinate={{ latitude: there.lat, longitude: there.lon }} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={[s.pin, { backgroundColor: colors.brand }]}>
                            <Icon name="home" size={14} color="#ffffff" />
                        </View>
                    </Marker>
                ) : null}

                {here && !riderGone && !onBike && !flying ? (
                    /*
                     * The bike is drawn only when there is a road under it.
                     *
                     * Two moments have no road: before he sets off, and while
                     * the one we drew no longer describes him and a new one is
                     * being worked out. Both used to be told differently - a
                     * standing man in the first, a bike crossing open ground
                     * on a bow in the second - and the second read, in Mohan's
                     * words, as the bike flying through the air to change
                     * route. It is the same truth in both: somebody is over
                     * there, and the way he is coming is not settled. So it is
                     * the same mark, pulsing on the spot, until the new road
                     * arrives a few seconds later and the bike returns to it.
                     *
                     * One of those two moments has since been taken from it. A
                     * ride with no road under it is now shown by flying him -
                     * see the walk above - and this pulsing disc turning up
                     * beside him was the one thing still on the map that had no
                     * business being there. It is for before he sets off, and
                     * for nothing else.
                     */
                    <Waiting coordinate={bike} pulsing />
                ) : null}

                {here && !riderGone && onBike ? (
                    /*
                     * The one that moves is the company's own rider.
                     *
                     * It was a blue disc with an arrow in it, which told the
                     * customer a direction and nothing else. This is the
                     * artwork they have already seen while booking - the
                     * engineer on the bike, helmet on, bag behind him - so
                     * the thing crossing the map is recognisably the person
                     * coming to their door. The same picture is on the web
                     * tracking page, so a customer who opens the link from
                     * WhatsApp and the app sees one company either way.
                     *
                     * Anchored where the wheels are, not at the centre, or the
                     * bike floats half its own height above the road. React
                     * Native's own Image rather than expo-image: a marker
                     * child has to report a size before the map lays it out,
                     * and a plain Image with fixed dimensions always does.
                     */
                    <RiderMarker coordinate={rider} heading={facing} animated />
                ) : null}

                {/*
                  * And him instead of it, while there is no road to ride on.
                  * One or the other, never both - see the walk above.
                  */}
                {flying ? <Carrier coordinate={flier} heading={facing} /> : null}
            </MapView>
            ) : null}

            {/*
              * ---- the map, while it is still arriving ----
              *
              * Over the map and under everything else, so the back button and
              * the job card stay usable while Google is still fetching tiles.
              * It goes the moment the first frame is drawn.
              */}
            {!mapReady ? <MapWait /> : null}

            {/* ---- back, floating over the map ---- */}
            <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                style={[s.back, { top: insets.top + space.md }]}
            >
                <Icon name="arrow-left" size={20} color={colors.ink} />
            </Pressable>

            {/* ---- the job, on a card over the map ---- */}
            <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
                <View style={s.grabber} />

                <View style={s.etaRow}>
                    <View style={{ flex: 1 }}>
                        <Small style={s.eyebrow}>{(data?.ticketNumber || "").toUpperCase()}</Small>
                        <Display style={{ fontSize: 26, marginTop: 2 }}>
                            {!data
                                ? "Reading the job"
                                : data.stage === "on_the_way" && eta
                                    ? eta + " min away"
                                    : STAGES[stageIndex]?.label || "Tracking"}
                        </Display>
                        {/*
                          * Where he is, in words, when there is a word for it.
                          *
                          * A moving dot answers "is he coming"; only a name
                          * answers "where has he got to", which is the question
                          * somebody actually asks out loud. Falls back to the
                          * stage's own line when the ride has not started or
                          * the place is not known yet.
                          */}
                        <Small style={{ marginTop: 2 }}>
                            {!data
                                ? "One moment - we are fetching where it has got to."
                                /*
                                 * And when the road on screen is not his road,
                                 * it says so.
                                 *
                                 * The line fades at the same moment - see the
                                 * Polyline - and between the two the customer
                                 * is told the thing they would otherwise have
                                 * to guess: nothing is broken, he simply knows
                                 * a way we did not draw. The locality goes for
                                 * those few seconds because this matters more.
                                 */
                                : lostRoad && riding
                                    ? "Coming a different way - finding his road"
                                    : data.stage === "on_the_way" && data.ride?.nearPlace
                                        ? "Near " + data.ride.nearPlace
                                        : STAGES[stageIndex]?.line}
                        </Small>
                    </View>

                    {left.metres != null && data?.stage === "on_the_way" ? (
                        <View style={s.distance}>
                            <Body style={s.distanceNumber}>
                                {(distanceLabel(left.metres) || "").split(" ")[0]}
                            </Body>
                            <Small style={{ fontSize: 11 }}>
                                {(distanceLabel(left.metres) || "").split(" ")[1]}
                            </Small>
                        </View>
                    ) : null}
                </View>

                {/* ---- the five stages, as a rail ---- */}
                <View style={[s.rail, !data ? { opacity: 0.35 } : null]}>
                    {STAGES.map((stage, i) => (
                        <View key={stage.key} style={s.railStep}>
                            <View
                                style={[
                                    s.railDot,
                                    i <= stageIndex
                                        ? { backgroundColor: colors.field }
                                        : { backgroundColor: colors.hairline },
                                ]}
                            />
                            {i < STAGES.length - 1 ? (
                                <View
                                    style={[
                                        s.railLine,
                                        { backgroundColor: i < stageIndex ? colors.field : colors.hairline },
                                    ]}
                                />
                            ) : null}
                        </View>
                    ))}
                </View>

                {/* ---- who is coming, and the one button that matters ---- */}
                {data?.technician?.name ? (
                    <View style={s.person}>
                        {/* His face, and bigger when it is tapped - the
                            person about to be let through a front door is
                            worth recognising before he is standing at it. */}
                        <Pressable
                            onPress={() => data.technician.photo && setShowingFace(true)}
                            disabled={!data.technician.photo}
                            hitSlop={6}
                        >
                            <Art
                                src={data.technician.photo}
                                icon="user"
                                iconSize={18}
                                tr="w-160"
                                radius={22}
                                style={s.avatar}
                            />
                        </Pressable>

                        <View style={{ flex: 1 }}>
                            <Title style={{ fontSize: 16 }}>{data.technician.name}</Title>
                            <Small>
                                {data.serviceLabel}
                                {data.technician.rating ? " · " + data.technician.rating + " ★" : ""}
                            </Small>

                            {data.technician.phone ? (
                                <Small style={{ color: colors.ink, fontFamily: font.semibold }}>
                                    {data.technician.phone}
                                </Small>
                            ) : null}
                        </View>

                        {data.technician.phone ? (
                            <Pressable
                                onPress={() => Linking.openURL("tel:" + data.technician.phone)}
                                style={s.call}
                                android_ripple={null}
                            >
                                <GradientFill color={colors.brand} />
                                <Icon name="phone" size={18} color="#ffffff" />
                            </Pressable>
                        ) : null}
                    </View>
                ) : null}
            </View>

            {/* Mounted only while open - an Android Modal left in the tree
                with visible={false} is a second native window sitting over
                the map. */}
            {showingFace && data?.technician?.photo ? (
                <Modal
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setShowingFace(false)}
                >
                    <Pressable style={s.lightbox} onPress={() => setShowingFace(false)}>
                        <Image
                            source={{ uri: data.technician.photo }}
                            style={s.face}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            transition={160}
                        />

                        <Small style={s.lightboxHint}>
                            {data.technician.name} · tap anywhere to close
                        </Small>
                    </Pressable>
                </Modal>
            ) : null}
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    blocked: { flex: 1, backgroundColor: colors.canvas, padding: space.lg, gap: space.lg },

    // The page colour rather than a scrim: this is standing in for the map,
    // not dimming it, and a grey wash over grey tiles reads as a fault.
    back: {
        position: "absolute",
        left: space.lg,
        width: 42, height: 42, borderRadius: 21,
        alignItems: "center", justifyContent: "center",
        backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.hairline,
        elevation: 4,
    },

    pin: {
        width: 32, height: 32, borderRadius: 16,
        alignItems: "center", justifyContent: "center",
        borderWidth: 2.5,
        borderColor: "#ffffff",
        elevation: 4,
    },


    sheet: {
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingHorizontal: space.lg,
        paddingTop: space.sm,
        borderTopWidth: 1,
        borderColor: colors.hairline,
        elevation: 12,
    },
    grabber: {
        alignSelf: "center",
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: colors.hairlineStrong,
        marginBottom: space.lg,
    },

    etaRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
    eyebrow: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.4, color: colors.inkFaint },
    distance: {
        alignItems: "center",
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.md,
        backgroundColor: colors.accentTint,
    },
    distanceNumber: { fontFamily: font.bold, fontSize: 19, color: colors.accent },

    rail: { flexDirection: "row", alignItems: "center", marginTop: space.lg },
    railStep: { flexDirection: "row", alignItems: "center", flex: 1 },
    railDot: { width: 10, height: 10, borderRadius: 5 },
    railLine: { flex: 1, height: 3, borderRadius: 2, marginHorizontal: 4 },

    person: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        marginTop: space.lg,
        paddingTop: space.lg,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
    },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },

    /*
     * Dark whichever theme the phone is in: a photograph shown on its own
     * wants nothing around it competing with the face being looked at.
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
    call: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: colors.brand,
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
    },
});
