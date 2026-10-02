import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { api, errorFrom } from "./api";
import { useSession } from "./session";
import { connectCustomerSocket, closeCustomerSocket, onResume } from "./socket";

/**
 * What the company sells, and what this customer has asked for.
 *
 * Both live here rather than in the screens, for two reasons. The catalogue is
 * read by the home screen, the service list and every step of the booking
 * flow, and fetching it four times over a phone connection is four times the
 * wait. And the jobs are read by the home screen, the jobs tab and the tab
 * badge, which have to agree - a job that has just been booked must not be
 * missing from one of them.
 *
 * Nothing in here runs on a timer. The office talks to the customer over the
 * socket for every step of a job, and that message is the signal to read the
 * list again; pull-to-refresh is the fallback for anything the socket missed.
 */
const JobsContext = createContext(null);

export const useJobs = () => {
    const value = useContext(JobsContext);
    if (!value) throw new Error("useJobs used outside JobsProvider");
    return value;
};

export const JobsProvider = ({ children }) => {
    const { customer } = useSession();

    const [services, setServices] = useState([]);
    const [open, setOpen] = useState([]);
    const [closed, setClosed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /**
     * The catalogue, in English.
     *
     * Public, so it is fetched whether or not anybody is signed in - somebody
     * deciding whether to keep the app has to be able to see what is on offer
     * before they hand over a phone number.
     *
     * The language a customer picks belongs to the two places they are spoken
     * to in sentences: the WhatsApp assistant and the call before a job. This
     * app is written in English throughout, and asking the server to translate
     * the four service names left Odia titles sitting under English headings
     * on an English screen - which reads as a half-finished translation rather
     * than as a choice.
     */
    const loadServices = useCallback(async () => {
        try {
            const res = await api.get("/customer/services");
            setServices(res.data.data || []);
        } catch {
            // The home screen says so in its own words; a red bar over the
            // whole app for a list that will be there on the next pull is not
            // worth it.
        }
    }, []);

    const loadTickets = useCallback(async () => {
        if (!customer) {
            setOpen([]);
            setClosed([]);
            return;
        }

        try {
            const res = await api.get("/customer/tickets");
            setOpen(res.data.data.open || []);
            setClosed(res.data.data.closed || []);
            setError("");
        } catch (err) {
            setError(errorFrom(err, "Could not read your jobs."));
        }
    }, [customer]);

    const reload = useCallback(async () => {
        await Promise.all([loadServices(), loadTickets()]);
    }, [loadServices, loadTickets]);

    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);
            await reload();
            if (alive) setLoading(false);
        })();

        return () => { alive = false; };
    }, [reload]);

    /**
     * The office's own messages are what tell this app something moved.
     *
     * Every customer-facing line - booked, somebody assigned, on the way,
     * finished - is emitted to this account's room as it is sent on WhatsApp.
     * The app does not show those messages twice; it takes them as the signal
     * that the job list is now out of date, and reads it again.
     */
    /*
     * Open for a job, and for nothing else.
     *
     * A socket used to be opened the moment somebody signed in and kept for
     * as long as they stayed signed in - which is most of for ever, on a
     * phone. That is a connection the server pays for and the handset's radio
     * pays for, to carry nothing, for a customer who books twice a year.
     *
     * Then it was held while the app was in front as well, and Mohan cut that
     * too: "jab customer WhatsApp ke through ya app ke through service create
     * karke book karega tabhi hi socket se connect hoga - jab tak ticket job
     * close nahi hua hai tab tak". So a booking is what opens it and the
     * ticket closing is what shuts it, whichever channel the job came in on.
     * Somebody browsing the catalogue holds nothing open.
     *
     * A job in flight is the one thing that genuinely needs it: every step -
     * assigned, on the way, finished - arrives this way and has to land
     * without anybody pulling to refresh.
     */
    const wantSocket = Boolean(customer) && open.length > 0;

    /*
     * And the one thing the socket used to cover for: a job booked on
     * WhatsApp while the app was shut.
     *
     * There is no connection to hear about it on, so the list is read again
     * over REST when the app comes back to the front. One request on return,
     * rather than a connection held open all day waiting for a booking that
     * usually is not coming - and the moment that request turns up an open
     * ticket, the socket opens by itself above.
     */
    useEffect(() => {
        if (!customer) return undefined;

        const sub = AppState.addEventListener("change", (next) => {
            if (next === "active") loadTickets();
        });

        return () => sub.remove();
    }, [customer, loadTickets]);

    useEffect(() => {
        if (!wantSocket) {
            closeCustomerSocket();
            return undefined;
        }

        let socket = null;
        let stopResume = null;

        (async () => {
            socket = await connectCustomerSocket();
            if (!socket) return;

            socket.on("ai-response", loadTickets);

            /*
             * And when a job moves without anything being said about it.
             *
             * A message used to accompany every step - assigned, on the way,
             * arrived - so reloading on messages alone kept the list honest.
             * Those messages are gone, and with them went the reloads: the card
             * sat on an old stage until somebody pulled to refresh. The server
             * now sends the moment itself; see jobMoved on the other side.
             */
            socket.on("job:changed", loadTickets);

            stopResume = onResume(socket, loadTickets);
        })();

        return () => {
            stopResume?.();
            socket?.off("ai-response", loadTickets);
            socket?.off("job:changed", loadTickets);
        };
    }, [wantSocket, loadTickets]);

    /** One service, by the key a ticket or a route carries. */
    const serviceFor = useCallback(
        (key) => services.find((s) => s.key === key) || null,
        [services]
    );

    /*
     * Memoised, so a screen only re-renders when something it reads actually
     * changed.
     *
     * A fresh object here is a new context value on every render of this
     * provider, and every screen reading it re-renders with it - five mounted
     * tabs, their lists and their cards, for a state change none of them care
     * about. That is the kind of work that shows up as a stutter on a cheap
     * handset long before it shows up anywhere else.
     */
    const value = useMemo(
        () => ({ services, serviceFor, open, closed, loading, error, reload, reloadTickets: loadTickets }),
        [services, serviceFor, open, closed, loading, error, reload, loadTickets]
    );

    return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
};
