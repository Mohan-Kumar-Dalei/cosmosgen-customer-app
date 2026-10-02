import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearToken, errorFrom, readToken, saveToken } from "./api";
import { closeCustomerSocket } from "./socket";

/**
 * Who is signed in, for the whole app.
 *
 * One place asks the server who this token belongs to and every screen reads
 * the answer from here. Without it each screen would fetch the profile for
 * itself, and an address changed on the account screen would still be the old
 * one on the booking screen.
 */
const SessionContext = createContext(null);

export const useSession = () => {
    const value = useContext(SessionContext);
    if (!value) throw new Error("useSession used outside SessionProvider");
    return value;
};

export const SessionProvider = ({ children }) => {
    const [customer, setCustomer] = useState(null);

    // Null rather than false to begin with: "we have not asked yet" is a real
    // state, and treating it as signed out flashes a sign-in screen at
    // somebody who is already signed in.
    const [ready, setReady] = useState(false);

    const loadProfile = useCallback(async () => {
        const token = await readToken();
        if (!token) {
            setCustomer(null);
            setReady(true);
            return;
        }

        try {
            const res = await api.get("/customer/me");
            setCustomer(res.data.data);
        } catch (err) {
            /*
             * Only a token the server actually refuses is thrown away.
             *
             * Anything else - a timeout, one bar of signal, the tunnel down -
             * is the network's problem and not the session's. Clearing on any
             * failure is how an app quietly signs somebody out on a train.
             */
            if ([401, 403].includes(err?.response?.status)) {
                await clearToken();
                setCustomer(null);
            }
        } finally {
            setReady(true);
        }
    }, []);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    /** Sends six digits to their WhatsApp. */
    const requestCode = useCallback(async (phone) => {
        try {
            const res = await api.post("/customer/otp", { phone });
            return { ok: true, ...res.data };
        } catch (err) {
            return {
                ok: false,
                retryAfter: err.response?.data?.retryAfter,
                message: errorFrom(err, "Could not send the code."),
            };
        }
    }, []);

    const signIn = useCallback(async (phone, code) => {
        try {
            const res = await api.post("/customer/otp/verify", { phone, code });
            const token = res.data?.token;

            if (!token) return { ok: false, message: "The server did not return a sign in token." };

            await saveToken(token);
            setCustomer(res.data.user);
            setReady(true);

            // A phone number and nothing else means a row that has just been
            // created. The screen after this asks for the rest rather than
            // dropping somebody into an empty account.
            return { ok: true, needsProfile: res.data.needsProfile };
        } catch (err) {
            return { ok: false, message: errorFrom(err, "That code was not accepted.") };
        }
    }, []);

    /**
     * Their name, their door and the language they want to be spoken to in.
     *
     * The address is resolved from the pin on the server, the same way it is
     * on WhatsApp - so somebody who registers in the app is registered at the
     * same door on every channel.
     */
    const saveProfile = useCallback(async (fields) => {
        try {
            const res = await api.put("/customer/profile", fields);
            setCustomer(res.data.data);
            return { ok: true };
        } catch (err) {
            return { ok: false, message: errorFrom(err, "Could not save that.") };
        }
    }, []);

    const signOut = useCallback(async () => {
        // Told to the server first, then forgotten locally whatever it said -
        // a failed logout must not strand somebody signed in.
        try { await api.post("/customer/logout"); } catch { /* leaving anyway */ }

        closeCustomerSocket();
        await clearToken();
        setCustomer(null);
    }, []);

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
        () => ({ customer, setCustomer, ready, requestCode, signIn, saveProfile, signOut, reload: loadProfile }),
        [customer, ready, requestCode, signIn, saveProfile, signOut, loadProfile]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
