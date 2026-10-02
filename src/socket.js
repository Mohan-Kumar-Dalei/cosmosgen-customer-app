import { io } from "socket.io-client";
import { readToken } from "./api";
import { API_URL } from "./config";

/**
 * The live connection, so nothing in this app has to sit on a timer.
 *
 * Two different sockets, because they are two different credentials:
 *
 *   The customer socket is the signed-in account. The website authenticates
 *   it with its cookie; a phone has none, so the token the app is already
 *   holding goes into the handshake instead and the server accepts either.
 *   Everything the office says about a job arrives on it.
 *
 *   The track socket is the job, not the person. Its credential is the
 *   ticket's own tracking token - the same one behind the link sent on
 *   WhatsApp - and it is joined to that one job's room and nothing else.
 *   That is what carries the technician's position while they are on the way.
 */
/*
 * Every change of state, said out loud.
 *
 * "Is it connected?" was not answerable from the terminal: the socket logged
 * three one-word lines and nothing about which address it was dialling, what
 * carried the connection, or why it had been opened or closed at all. When a
 * job does not ring, the first thing anybody needs to know is whether there
 * was a socket to ring down - so every transition says what happened and why,
 * with the time, and the tag is the same on both apps so one filter finds all
 * of it.
 */
const at = () => new Date().toLocaleTimeString();

const say = (line) => console.log("[SOCKET " + at() + "] " + line);

let socket = null;

export const connectCustomerSocket = async () => {
    const token = await readToken();
    if (!token) return null;

    if (socket) {
        if (!socket.connected) socket.connect();
        return socket;
    }

    socket = io(API_URL, {
        transports: ["websocket"],
        autoConnect: false,
        auth: { role: "customer", token },

        // A phone loses signal in a lift and in a basement, so this keeps
        // trying rather than giving up after a handful of attempts.
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => say(
        "customer CONNECTED  id=" + socket.id + "  via " + socket.io.engine.transport.name
    ));
    socket.on("disconnect", (why) => say("customer DISCONNECTED  reason: " + why));
    socket.on("connect_error", (err) => say("customer FAILED  " + err.message));
    socket.io.on("reconnect_attempt", (n) => say("customer retrying, attempt " + n));

    say("customer dialling " + API_URL);
    socket.connect();
    return socket;
};

/** Closed on sign out. An open socket outlives the account otherwise. */
export const closeCustomerSocket = () => {
    if (!socket) return;
    say("customer closing");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
};

/**
 * One job's live position, for as long as a screen is watching it.
 *
 * Built per screen rather than kept around: it is scoped to a single ticket,
 * and a customer with two jobs open needs two of them.
 */
export const createTrackSocket = (trackingToken) => {
    const s = io(API_URL, {
        transports: ["websocket"],
        autoConnect: false,
        auth: { role: "track", token: trackingToken },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        reconnectionAttempts: Infinity,
    });

    s.on("connect_error", (err) => console.log("[TRACK] error: " + err.message));
    return s;
};

/**
 * Read the screen again when a dropped connection comes back.
 *
 * Socket.IO reconnects on its own but it replays nothing: every event sent
 * while the phone was in a pocket went to nobody, and the screen comes back
 * looking perfectly live while showing what was true ten minutes ago. That is
 * the "sometimes it doesn't update" that is impossible to reproduce on a desk.
 *
 * Nothing here runs on a timer - it fires on a real reconnection, and the
 * short guard only stops two of them arriving together from fetching twice.
 */
export const onResume = (instance, reload) => {
    let last = 0;

    const run = () => {
        const now = Date.now();
        if (now - last < 3000) return;
        last = now;
        reload();
    };

    instance.io.on("reconnect", run);
    return () => instance.io.off("reconnect", run);
};
