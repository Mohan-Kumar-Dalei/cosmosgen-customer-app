import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { vaultDelete, vaultGet, vaultSet } from "./vault";
import { api, errorFrom } from "./api";
import { fixPosition } from "./location";

/**
 * Where this phone is, and what we can actually do there.
 *
 * The catalogue is the same in every town; the people who do the work are not.
 * Showing somebody in a district we have never sent an engineer to the same
 * confident list of services as somebody in Bhubaneswar is a promise the
 * company cannot keep - and they find that out only after describing their
 * problem and waiting.
 *
 * The same reasoning, and the same endpoint, as the website's area picker. The
 * area is asked once, kept, and every service list in the app is answered
 * against it.
 */
const AreaContext = createContext(null);

const STORE = "cosmosgen.customer.area";

export const AreaProvider = ({ children }) => {
    const [status, setStatus] = useState("idle");   // idle | locating | loading | ready | error
    const [place, setPlace] = useState(null);
    const [services, setServices] = useState([]);
    const [radiusKm, setRadiusKm] = useState(25);
    const [engineers, setEngineers] = useState(0);
    const [error, setError] = useState("");

    /** One call, whether the question is a pin or a typed name. */
    const ask = useCallback(async (params, remember) => {
        setStatus("loading");
        setError("");

        try {
            const res = await api.get("/customer/coverage", { params });
            const data = res.data.data || {};

            setPlace(data.place || null);
            setServices(data.services || []);
            setRadiusKm(data.radiusKm || 25);
            setEngineers(data.engineers || 0);
            setStatus("ready");

            if (remember) {
                vaultSet(STORE, JSON.stringify(remember))
                    .catch(() => { /* asked again next time, which is the safe way to fail */ });
            }

            return true;
        } catch (err) {
            setStatus("error");
            setError(errorFrom(err, "Could not check that area just now."));
            return false;
        }
    }, []);

    /*
     * What we already knew is re-checked on load rather than trusted.
     *
     * A saved area is a name, not an answer: the engineer who covered it last
     * month may have left.
     */
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const raw = await vaultGet(STORE);
                if (!raw || !alive) return;
                const params = JSON.parse(raw);
                if (params) ask(params, params);
            } catch { /* nothing saved, or a keystore that will not answer */ }
        })();

        return () => { alive = false; };
    }, [ask]);

    const detect = useCallback(async () => {
        setStatus("locating");
        setError("");

        const fix = await fixPosition();

        if (!fix.ok) {
            setStatus("error");
            setError(fix.message);
            return false;
        }

        const params = { lat: Number(fix.lat.toFixed(5)), lon: Number(fix.lon.toFixed(5)) };
        return ask(params, params);
    }, [ask]);

    /*
     * A place somebody picked off the list.
     *
     * The typed search below sends the words themselves, and the server can
     * only title-case them and hand them back - so "Usshshjssi" became an area
     * with a badge saying we do not come there yet. A picked place arrives
     * with its own coordinates, and coordinates cannot be invented: the same
     * geocoder that names a dropped pin names this one.
     */
    const pick = useCallback((lat, lon) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Promise.resolve(false);

        const params = { lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) };
        return ask(params, params);
    }, [ask]);

    const search = useCallback((q) => {
        const term = String(q || "").trim();
        if (!term) return Promise.resolve(false);
        return ask({ q: term }, { q: term });
    }, [ask]);

    const forget = useCallback(() => {
        vaultDelete(STORE).catch(() => { /* it will be overwritten */ });
        setPlace(null);
        setServices([]);
        setStatus("idle");
        setError("");
    }, []);

    const value = useMemo(() => {
        const byKey = new Map(services.map((s) => [s.key, s]));

        return {
            status,
            place,
            services,
            radiusKm,
            error,
            detect,
            search,
            pick,
            forget,
            busy: status === "locating" || status === "loading",

            /** Whether the area has been settled at all. */
            known: status === "ready" && Boolean(place),

            /** The coverage row for one service, or null while unknown. */
            cover: (key) => byKey.get(key) || null,

            /** People, counted once each however many trades they cover. */
            total: engineers,

            covered: services.some((s) => s.available),
        };
    }, [status, place, services, radiusKm, engineers, error, detect, search, pick, forget]);

    return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
};

export const useArea = () => {
    const ctx = useContext(AreaContext);
    if (!ctx) throw new Error("useArea used outside AreaProvider");
    return ctx;
};
