import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { useSession } from "./session";

/**
 * Trades this customer has kept.
 *
 * Held here rather than fetched by the screens that need them, because three
 * of them do at once - the heart on a service page, the list behind Account,
 * and the filter chips on that list - and a heart that is filled on one screen
 * and hollow on another is worse than no heart at all.
 *
 * The list lives on the account rather than on the phone, so it survives a
 * reinstall and follows somebody to a new handset. A saved list that
 * disappears with the app is worse than none, because it was promised.
 */
const BookmarksContext = createContext(null);

export const useBookmarks = () => useContext(BookmarksContext) || {
    keys: [],
    has: () => false,
    toggle: () => {},
    remove: () => {},
    reload: () => {},
};

export const BookmarksProvider = ({ children }) => {
    const { customer } = useSession();
    const [keys, setKeys] = useState([]);

    const reload = useCallback(async () => {
        if (!customer) return setKeys([]);

        try {
            const res = await api.get("/customer/bookmarks");
            setKeys(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch {
            // A heart that did not load is a hollow heart. Nothing here is
            // worth a message across a screen that otherwise works.
        }
    }, [customer]);

    useEffect(() => { reload(); }, [reload]);

    const has = useCallback((key) => keys.includes(key), [keys]);

    /*
     * The list moves before the request does.
     *
     * A heart that waits for a round trip before filling feels broken on a
     * slow connection, and the worst case if the request fails is a heart that
     * is wrong until the next time the list is read.
     */
    const toggle = useCallback(async (key) => {
        const on = keys.includes(key);
        setKeys((prev) => (on ? prev.filter((k) => k !== key) : [...prev, key]));

        try {
            if (on) await api.delete("/customer/bookmarks/" + key);
            else await api.post("/customer/bookmarks", { serviceKey: key });
        } catch {
            setKeys((prev) => (on ? [...prev, key] : prev.filter((k) => k !== key)));
        }
    }, [keys]);

    const remove = useCallback(async (key) => {
        setKeys((prev) => prev.filter((k) => k !== key));
        try { await api.delete("/customer/bookmarks/" + key); } catch { reload(); }
    }, [reload]);

    return (
        <BookmarksContext.Provider value={{ keys, has, toggle, remove, reload }}>
            {children}
        </BookmarksContext.Provider>
    );
};
