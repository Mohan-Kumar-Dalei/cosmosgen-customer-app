import axios from "axios";
import * as Network from "expo-network";
import { vaultDelete, vaultGet, vaultSet } from "./vault";
import { API_BASE } from "./config";

/*
 * A key of its own, not the vendor app's.
 *
 * Both apps can sit on the same phone - a technician books a plumber for his
 * own house like anybody else - and they are two different accounts on two
 * different sides of the platform. Sharing one key would sign one of them out
 * every time the other signed in.
 */
const TOKEN_KEY = "cosmosgen.customer.token";

/**
 * The signed-in customer's token, kept in the phone's keystore.
 *
 * The store underneath is the Android keystore rather than a file, so it is
 * not readable by another app or by anybody browsing the device's storage.
 * The website never does this because the browser holds an httpOnly cookie,
 * which an app has no equivalent of.
 *
 * See src/vault.js for what happens when this runs in a browser, which is only
 * ever a development surface for this app.
 */
export const saveToken = (token) => vaultSet(TOKEN_KEY, token);
export const readToken = () => vaultGet(TOKEN_KEY);
export const clearToken = () => vaultDelete(TOKEN_KEY);

/*
 * Whether this phone believes it is online, kept current.
 *
 * Optimistic to begin with: a listener that has not fired yet should not make
 * the app accuse somebody of being offline, and the very first request usually
 * arrives before the first event does.
 */
let deviceOnline = true;

try {
    Network.addNetworkStateListener((state) => {
        deviceOnline = state?.isInternetReachable !== false && state?.isConnected !== false;
    });
} catch {
    // A platform without the module is a platform where the old wording was
    // no worse. Nothing here is worth failing a boot over.
}

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 20000,

    // ngrok serves a browser warning page to anything that looks like a
    // browser, and the app would receive that HTML instead of the answer.
    // This header is what tells it to serve the real thing.
    headers: { "ngrok-skip-browser-warning": "true" },
});

/** Every request carries the token, so no screen has to remember to add it. */
api.interceptors.request.use(async (config) => {
    const token = await readToken();
    if (token) config.headers.Authorization = "Bearer " + token;
    return config;
});

/*
 * One quiet second chance, for reads only.
 *
 * A phone handing the radio from wifi to mobile data, or waking one up, drops
 * whatever was in flight at that moment. The request never reached the server,
 * so nothing happened twice by sending it again - and the alternative is an
 * error on screen for a blip the customer never knew about.
 *
 * Reads only, deliberately. A POST that failed to send probably did fail to
 * send, but "probably" is not good enough when the POST books a job or saves
 * an address, and a duplicate of either is worse than a message asking them to
 * try again.
 */
api.interceptors.response.use(undefined, async (err) => {
    const config = err?.config;
    const method = String(config?.method || "").toLowerCase();

    const worthRetrying =
        err?.message === "Network Error"
        && method === "get"
        && config
        && !config.__retried;

    if (!worthRetrying) throw err;

    config.__retried = true;
    await new Promise((done) => setTimeout(done, 700));

    return api.request(config);
});

/**
 * Turns any failure into the sentence to put on screen.
 *
 * The backend already writes its messages for a person to read - "You already
 * have a Plumbing request open" - so those are used as they are. Only when
 * there is no message at all does this invent one, and then it says what
 * actually happened rather than "something went wrong".
 */
export const errorFrom = (err, fallback = "That did not work. Please try again.") => {
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.code === "ECONNABORTED") return "The server took too long to answer.";

    /*
     * "Network Error" is axios saying the request never left, and it says that
     * for two very different reasons: the phone has no connection, or it has
     * one and our server did not answer. Telling somebody with four bars of 4G
     * to check their internet sends them to fight their router over a problem
     * that is ours.
     *
     * So the phone is asked. The answer is kept up to date by the listener
     * below rather than fetched here, because this has to stay synchronous -
     * every screen calls it while rendering an error.
     */
    if (err?.message === "Network Error") {
        return deviceOnline
            ? "Could not reach Cosmosgen just now. Please try again."
            : "No connection. Check the internet and try again.";
    }

    return fallback;
};
