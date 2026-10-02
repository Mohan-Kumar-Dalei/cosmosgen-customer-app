import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { api } from "./api";
import { useSession } from "./session";

/**
 * What the office is saying to everybody: the home screen's posters and the
 * notices behind the bell.
 *
 * Held here rather than fetched by the two screens that show them, because the
 * bell's badge is drawn on every screen with a top bar and the posters are on
 * the home screen - two places reading the same request, and a badge that
 * disagreed with the list it opens would be worse than no badge.
 *
 * Nothing runs on a timer. The office broadcasting is a rare event announced by
 * a push; between pushes there is nothing to poll for. It is read again when
 * the app comes back to the front, which is when a customer who tapped a
 * notification actually arrives.
 */
const NoticesContext = createContext(null);

export const useNotices = () => useContext(NoticesContext) || {
    posters: [],
    notices: [],
    unread: 0,
    markSeen: () => {},
    reload: () => {},
};

export const NoticesProvider = ({ children }) => {
    const { customer } = useSession();

    const [posters, setPosters] = useState([]);
    const [notices, setNotices] = useState([]);
    const [unread, setUnread] = useState(0);

    const reload = useCallback(async () => {
        // Signed in only: the unread count is per customer, and the endpoint
        // says so. Somebody who has not signed in yet has a home screen with no
        // carousel on it, which is the same as a week with no posters.
        if (!customer) {
            setPosters([]);
            setNotices([]);
            setUnread(0);
            return;
        }

        try {
            const res = await api.get("/customer/announcements");
            const data = res.data?.data || {};

            setPosters(Array.isArray(data.posters) ? data.posters : []);
            setNotices(Array.isArray(data.notices) ? data.notices : []);
            setUnread(Number(data.unread) || 0);
        } catch {
            // A poster that did not arrive is a home screen without a poster.
            // Nothing here is worth a red bar across an app that works.
        }
    }, [customer]);

    useEffect(() => { reload(); }, [reload]);

    /*
     * Read again when the app comes back to the front.
     *
     * Somebody who taps a push arrives here through this event, and the notice
     * they tapped has to be in the list when they get here. The same handler
     * covers the ordinary case of an app left open on a table for a day.
     */
    useEffect(() => {
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") reload();
        });

        return () => sub.remove();
    }, [reload]);

    /**
     * The bell has been opened.
     *
     * The badge clears here rather than waiting for the server to answer: the
     * customer is looking at the list, so a number still sitting on the bell
     * behind it is wrong whatever the network is doing. The request that
     * follows only has to make it stay cleared on the next phone.
     */
    const markSeen = useCallback(async () => {
        setUnread(0);

        try {
            await api.post("/customer/notices/seen");
        } catch {
            // It will be sent again the next time the bell is opened.
        }
    }, []);

    return (
        <NoticesContext.Provider value={{ posters, notices, unread, markSeen, reload }}>
            {children}
        </NoticesContext.Provider>
    );
};
