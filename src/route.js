/**
 * Google hands a route back as an encoded string, not as a list of points.
 *
 * The format packs each step as a difference from the one before, in base64
 * with five decimal places of precision - which is why a route across a city
 * is a few hundred characters rather than a few thousand numbers. This is the
 * published algorithm for unpacking it; there is no shorter honest version.
 *
 * Only the decoder lives here, unlike the vendor app which also asks Google
 * for a route. This app never does: the line it draws was already computed for
 * the engineer's own screen and travels with the tracking payload, so watching
 * a job costs nothing whatever - which matters, because a customer watching
 * somebody approach leaves this screen open for twenty minutes.
 */
export const decodePolyline = (encoded) => {
    if (!encoded) return [];

    const points = [];
    let index = 0;
    let lat = 0;
    let lon = 0;

    while (index < encoded.length) {
        let result = 0;
        let shift = 0;
        let byte;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lat += (result & 1) ? ~(result >> 1) : result >> 1;

        result = 0;
        shift = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        lon += (result & 1) ? ~(result >> 1) : result >> 1;

        points.push({ latitude: lat / 1e5, longitude: lon / 1e5 });
    }

    return points;
};

/**
 * A bowed line from whoever is coming to where they are going.
 *
 * Not the road route - that is the solid one, and it only exists once the
 * technician has set off and a route has been worked out. This is the other
 * thing Swiggy draws: a light curve that says "this person, to that door",
 * there from the moment a job has somebody on it and before anybody has moved.
 *
 * Curved on purpose. A straight line between two pins reads as a measurement;
 * a bowed one reads as a journey, and the bow keeps the line clear of the
 * marker at each end. It is a quadratic bezier sampled into points, because a
 * map polyline takes coordinates rather than a path.
 */
export const arcBetween = (from, to, bend = 0.16, steps = 48) => {
    if (!from || !to) return [];

    // The control point sits off to one side of the midpoint, at right angles
    // to the line - which is what makes a bow rather than a sag.
    const cLat = (from.latitude + to.latitude) / 2 - (to.longitude - from.longitude) * bend;
    const cLon = (from.longitude + to.longitude) / 2 + (to.latitude - from.latitude) * bend;

    const points = [];

    for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const u = 1 - t;

        points.push({
            latitude: u * u * from.latitude + 2 * u * t * cLat + t * t * to.latitude,
            longitude: u * u * from.longitude + 2 * u * t * cLon + t * t * to.longitude,
        });
    }

    return points;
};

/**
 * Where the rider is on the route, which way the road is pointing there, and
 * what is left of the journey.
 *
 * Three questions with one answer, because they all come from the same
 * measurement: the closest point on the drawn line to the last GPS fix.
 *
 * It replaces three separate wrongnesses the tracking screen had.
 *
 * The bike always pointed north. A drawing of a motorcycle seen from above
 * that faces up while the road runs east does not read as a vehicle at all -
 * it reads as a sticker. The road's own direction is the honest heading, and
 * it is steadier than the phone's compass, which swings while a bike waits at
 * a light.
 *
 * The blue line stayed whole. It was drawn once from the route the engineer's
 * phone worked out, and nothing shortened it as he rode, so the customer
 * watched a bike travel along a line that never got shorter - and a reload was
 * the only thing that ever cut it. What is behind him is not part of the
 * journey any more, so it is not drawn.
 *
 * And the bike sat beside the road rather than on it. A phone fix in a street
 * of buildings is routinely ten or twenty metres out, which at this zoom is
 * the width of a house. Moving it onto the road it is obviously travelling
 * along is not a lie about where he is; it is the same correction every
 * delivery map makes.
 *
 * `maxDrift` is the limit of that courtesy, in metres. Past it the fix is not
 * noise around the route - he has turned off it, or the route is stale - and
 * the honest thing is to leave him where the phone says and keep the whole
 * line until a fresh route arrives.
 */

const RAD = Math.PI / 180;

/** Metres per degree of latitude. Longitude shrinks by cos(lat). */
const DEG_M = 111320;

/**
 * Where the road is heading, as a compass bearing the marker can be turned to.
 *
 * Exported as well, because a marker sometimes has no road to take its heading
 * from - before anybody has set off, or once the ride has ended - and then the
 * honest answer is the way it is actually travelling. That is what the blue
 * dot in any map app does when it is off-route.
 */
export const bearing = (a, b) => {
    const lat1 = a.latitude * RAD;
    const lat2 = b.latitude * RAD;
    const dLon = (b.longitude - a.longitude) * RAD;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return (Math.atan2(y, x) / RAD + 360) % 360;
};

/**
 * The point this many metres away on that bearing - the opposite of the above.
 *
 * Used to put something on the map that is not a position anybody reported: a
 * place off the edge of the action to fly in from, and another to leave
 * towards. See Carrier.
 */
export const pointFrom = (at, degrees, metres) => {
    const r = degrees * RAD;
    const k = Math.cos(at.latitude * RAD) || 1;

    return {
        latitude: at.latitude + (metres * Math.cos(r)) / DEG_M,
        longitude: at.longitude + (metres * Math.sin(r)) / (DEG_M * k),
    };
};

export const snapToRoute = (points, at, maxDrift = 45) => {
    const idle = { point: at || null, remaining: points || [], heading: null };

    if (!at || !points || points.length < 2) return idle;

    /*
     * Flat maths, on purpose.
     *
     * Projecting a point onto a line segment is arithmetic that great-circle
     * formulae cannot do directly, and over the few kilometres a job covers
     * the error from treating the patch of earth as flat is centimetres.
     * Longitude is scaled by cos(latitude) so that a degree across and a
     * degree up are the same distance, which is what makes "closest" mean
     * closest rather than closest-if-you-are-on-the-equator.
     */
    const k = Math.cos(at.latitude * RAD);
    const px = at.longitude * k;
    const py = at.latitude;

    let best = null;

    for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];

        const ax = a.longitude * k;
        const ay = a.latitude;
        const dx = b.longitude * k - ax;
        const dy = b.latitude - ay;

        const len2 = dx * dx + dy * dy;

        // How far along this segment the foot of the perpendicular falls,
        // clamped to the segment so a point beyond either end lands on the end
        // rather than on the line's imaginary continuation.
        const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;

        const fx = ax + t * dx;
        const fy = ay + t * dy;
        const gap = (px - fx) * (px - fx) + (py - fy) * (py - fy);

        if (!best || gap < best.gap) {
            best = { gap, index: i, point: { latitude: fy, longitude: fx / k } };
        }
    }

    const head = bearing(points[best.index], points[best.index + 1]);

    /*
     * Too far from the line to be noise around it - so there is nothing of it
     * left to draw.
     *
     * It used to hand back the whole route in this case, which is how the line
     * came to be drawn from its own beginning rather than from the bike: a
     * stretch running back past him and another running forward, meeting in a
     * point. That is the V Mohan photographed three times, and it was never a
     * second route - it was this one line, drawn from the wrong end.
     *
     * Empty is the honest answer. He is not on this road, so this road has
     * nothing to say about how far he has left, and the screen has its own way
     * of showing somebody who is not on a road: see takeHold.
     */
    if (Math.sqrt(best.gap) * DEG_M > maxDrift) {
        return { ...idle, remaining: [], heading: head };
    }

    return {
        point: best.point,
        remaining: [best.point, ...points.slice(best.index + 1)],
        heading: head,
    };
};

/**
 * The stretch of road he has just covered, as a path to be ridden along.
 *
 * A fix arrives every few seconds, and in that time a bike can go round a
 * corner. Sliding the marker straight from the old fix to the new one cuts
 * that corner - it crosses the bend diagonally, and because the heading comes
 * from the segment it has already been snapped to, it turns while it is still
 * on the approach. On screen the bike turns before the corner and then drives
 * through the pavement, which is exactly what Mohan photographed.
 *
 * So instead of one hop, the marker is walked through the route's own vertices
 * between the two fixes, turning at each. It reaches the corner facing the way
 * it came and leaves it facing the new road, because that is what it did.
 *
 * Both arguments are `remaining` lists from snapToRoute, taken one fix apart.
 * The newer one is a tail of the older one, so the difference in their lengths
 * is the number of corners passed in between. Nothing is returned when that
 * does not hold - a freshly computed route shares no vertices with the last
 * one, and there is nothing honest to say about the path between them.
 */
export const pathCovered = (before, after) => {
    if (!before || !after || before.length < 1 || after.length < 1) return [];

    const passed = before.length - after.length;
    if (passed < 0 || passed > before.length - 1) return [];

    const path = [before[0], ...before.slice(1, passed + 1), after[0]];

    // Route vertices can sit a metre apart on a curve. Legs that short are not
    // turns, they are noise, and each one costs an animation step.
    const trimmed = [path[0]];
    for (let i = 1; i < path.length; i += 1) {
        if (gapBetween(trimmed[trimmed.length - 1], path[i]) > 4) trimmed.push(path[i]);
    }

    // The last point is where he is; it is never dropped for being close.
    const end = path[path.length - 1];
    if (trimmed[trimmed.length - 1] !== end) trimmed.push(end);

    return trimmed.length > 2 ? trimmed : [];
};

/**
 * The same path, in short even steps.
 *
 * The walk between two fixes is reported a leg at a time, and the line is cut
 * at the leg the bike is on - so the length of a leg is how far the head of
 * the line can be from the bike. A route's own vertices are whatever the road
 * needed: a straight kilometre is one leg, and for five seconds of that the
 * line would be cut in the wrong place by fifty metres, which is the stub
 * Mohan photographed hanging off the back of the bike.
 *
 * Cutting every leg to a few metres fixes it without touching the shape. Every
 * original point is kept, so a corner is still a corner and still takes its
 * own heading; only the long stretches between them gain points.
 */
export const resample = (points, every = 5) => {
    if (!points || points.length < 2) return points || [];

    const out = [points[0]];

    for (let i = 1; i < points.length; i += 1) {
        const from = points[i - 1];
        const to = points[i];
        const span = gapBetween(from, to);

        const steps = Math.floor(span / every);

        for (let n = 1; n <= steps; n += 1) {
            const t = (n * every) / span;
            if (t >= 1) break;

            out.push({
                latitude: from.latitude + (to.latitude - from.latitude) * t,
                longitude: from.longitude + (to.longitude - from.longitude) * t,
            });
        }

        out.push(to);
    }

    return out;
};

/**
 * How many minutes away, counted down rather than repeated.
 *
 * The stored figure was true when it was computed. Repeating "12 min" for
 * twenty minutes is what makes a tracking screen feel dead; counting down to
 * the arrival time the server worked out is closer to the truth and costs
 * nothing.
 */
export const minutesFrom = (etaSeconds, etaAt) => {
    if (etaAt) {
        const left = (new Date(etaAt).getTime() - Date.now()) / 1000;
        return Math.max(1, Math.round(left / 60));
    }

    if (etaSeconds == null) return null;
    return Math.max(1, Math.round(etaSeconds / 60));
};

/** Metres between two points, flat - see the note in snapToRoute. */
const gapBetween = (a, b) => {
    const k = Math.cos(((a.latitude + b.latitude) / 2) * RAD);
    const dx = (b.longitude - a.longitude) * k * DEG_M;
    const dy = (b.latitude - a.latitude) * DEG_M;
    return Math.hypot(dx, dy);
};

/** The length of a list of points, in metres. */
export const lengthOf = (points) => {
    if (!points || points.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < points.length; i += 1) total += gapBetween(points[i - 1], points[i]);
    return total;
};

/**
 * How far and how long is left, from where he actually is.
 *
 * The server's figures are worked out once when the route is, and again every
 * five minutes - which is right, because each one is a billed call - but it
 * means a customer watching a bike cross the last kilometre was told the same
 * "12 min" the whole way. The distance still to ride is already on screen: it
 * is the part of the line that has not been trimmed off behind him. Measuring
 * it costs nothing and changes with every fix, so the numbers fall as he comes.
 *
 * The pace is taken from the route the server worked out - its own distance
 * over its own duration - so traffic, one-ways and the size of the city are
 * all still Google's answer rather than a guess made here. Only the length
 * left is measured locally.
 *
 * With no route yet there is still an honest answer: the straight line from
 * him to the door, with a little added for the fact that roads bend.
 */

/** Roughly how much longer a road is than the straight line it follows. */
const ROAD_FACTOR = 1.3;

/** Fallback pace when nothing has been routed yet - about 26 km/h in traffic. */
const CITY_PACE = 1 / 7.2;

export const journeyLeft = ({ remaining, from, to, etaSeconds, distanceMeters }) => {
    const onRoute = remaining && remaining.length > 1 ? lengthOf(remaining) : 0;

    const metres = onRoute
        || (from && to ? gapBetween(from, to) * ROAD_FACTOR : 0);

    if (!metres) return { metres: null, minutes: null };

    const pace = (etaSeconds > 0 && distanceMeters > 0)
        ? etaSeconds / distanceMeters
        : CITY_PACE;

    return { metres, minutes: Math.max(1, Math.round((metres * pace) / 60)) };
};

/**
 * The distance as somebody would say it: kilometres until it is close, then
 * metres, because "0.3 km away" is not how anybody describes the end of a
 * street.
 */
export const distanceLabel = (metres) => {
    if (metres == null) return null;
    if (metres < 950) return Math.max(10, Math.round(metres / 10) * 10) + " m";
    return (metres / 1000).toFixed(1) + " km";
};
