import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api, errorFrom } from "./api";
import { fixPosition } from "./location";

/**
 * The customer's saved places, and the one thing that was missing from them.
 *
 * An account used to carry a single address - the one given at sign-up - and
 * every booking went there. Somebody who registered at home and then wanted
 * the office looked at had no way to say so, so the job went to an empty flat
 * and the technician rang the office from the doorstep.
 *
 * The list lives on the server, because it is the server that stamps a pin
 * onto the ticket and the technician's map that drives to it. Nothing is kept
 * on the phone beyond what is on screen.
 */

/**
 * Where you are, written out.
 *
 * Taking a fix is the easy half. The half that was missing is the address
 * itself: the app saved the coordinates and left the address line blank, so
 * every customer who pressed "use my current location" then had to type out
 * the place they were standing in. The geocoder already runs on our server -
 * this asks it.
 *
 * A fix without an answer is still worth having. The pin is what the
 * technician drives to; the words are what the office reads. So a failed
 * lookup returns the point with empty text rather than failing the whole
 * thing.
 */
export const describeHere = async () => {
    const fix = await fixPosition();
    if (!fix.ok) return fix;

    const here = { ok: true, lat: fix.lat, lon: fix.lon, address: "", area: "", city: "", state: "", pincode: "" };

    try {
        const res = await api.get("/map/rev-geocode", { params: { lat: fix.lat, lon: fix.lon } });
        const place = res.data?.data?.results?.[0];

        if (place) {
            here.address = place.formatted_address || "";
            here.area = place.locality || "";
            here.city = place.city || "";
            here.state = place.state || "";
            here.pincode = place.pincode || "";
        }
    } catch {
        // The pin is the part that matters. Leaving the words empty lets the
        // customer type them, which is no worse than before.
    }

    return here;
};

/** One line that reads like an address rather than a database row. */
export const oneLine = (a) => {
    if (!a) return "";

    // Floor and landmark first where they exist: they are what somebody
    // standing outside actually needs, and the street is what they already
    // have.
    const parts = [a.address, a.floor, a.landmark, a.area, a.city, a.pincode].filter(Boolean);
    if (parts.length) return parts.join(", ");

    return Number.isFinite(a.lat) ? "The pin you saved" : "";
};

/**
 * The list, with the four things anybody does to it.
 *
 * Every change re-reads the list from the server rather than patching what is
 * on screen. A default moving from one entry to another touches two rows and
 * the account's own address at once, and guessing at that from the client is
 * how a screen ends up disagreeing with the thing it is showing.
 */
export const useAddresses = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            const res = await api.get("/customer/addresses");
            setItems(res.data?.data || []);
            setError("");
        } catch (err) {
            setError(errorFrom(err, "Could not load your addresses"));
        } finally {
            setLoading(false);
        }
    }, []);

    /*
     * Re-read whenever the screen comes back, not only when it mounts.
     *
     * The booking screen and the address book are two screens over one list.
     * Add an address in the second and return to the first and the first was
     * still showing what it had loaded on the way in - the customer had to
     * close the app and reopen it to see the address they had just saved.
     * Focus is the moment the answer might have changed.
     */
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const run = useCallback(async (call, whenWrong) => {
        setError("");
        try {
            await call();
            await load();
            return true;
        } catch (err) {
            setError(errorFrom(err, whenWrong));
            return false;
        }
    }, [load]);

    return {
        items,
        loading,
        error,
        setError,
        reload: load,

        add: (body) => run(() => api.post("/customer/addresses", body), "Could not save the address"),
        update: (id, body) => run(() => api.patch("/customer/addresses/" + id, body), "Could not save the address"),
        remove: (id) => run(() => api.delete("/customer/addresses/" + id), "Could not remove the address"),
        makeDefault: (id) => run(() => api.post("/customer/addresses/" + id + "/default"), "Could not change the default"),
    };
};
