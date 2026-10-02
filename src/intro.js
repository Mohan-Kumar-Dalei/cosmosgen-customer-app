import { vaultGet, vaultSet } from "./vault";

/**
 * Whether this phone has already been shown the introduction.
 *
 * Stored with a version on it rather than as a plain yes, so that when the
 * introduction is rewritten - a new service, a change to how the codes work -
 * raising INTRO_VERSION puts everybody through it once more. That is the whole
 * point of an introduction nobody is forced to read twice.
 *
 * It is deliberately separate from being signed in. Signing out does not
 * un-explain the company, so somebody who leaves and comes back lands on the
 * sign-in screen rather than being walked through five pages again.
 */
const KEY = "cosmosgen.customer.intro";

export const INTRO_VERSION = "1";

export const hasSeenIntro = async () => {
    try {
        return (await vaultGet(KEY)) === INTRO_VERSION;
    } catch {
        // A phone that will not give us its keystore should still be usable;
        // the worst case is that the introduction is shown again.
        return false;
    }
};

export const recordIntro = async () => {
    try {
        await vaultSet(KEY, INTRO_VERSION);
    } catch { /* shown again next time, which is the safe way to fail */ }
};
