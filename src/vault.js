import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Where the app keeps the few things it has to remember between launches: the
 * sign-in token, the area somebody chose, whether they have seen the intro,
 * which assistant thread is theirs.
 *
 * On a phone that is `expo-secure-store`, which is the Android keystore rather
 * than a file - not readable by another app, and not by anybody browsing the
 * device's storage. That is the right store for a token and it is the only
 * reason this app does not simply use AsyncStorage.
 *
 * The package has no web implementation at all, and the failure is not a
 * graceful one: `getItemAsync` resolves to a native module that is not there,
 * throws `getValueWithKeyAsync is not a function` inside the effect that reads
 * the token, and the app never finishes its first render - a white page with
 * the error only in the console. That is what stopped `expo start --web` from
 * being usable, which matters because a browser is the only way Mohan and I can
 * look at the same screen at the same time instead of building an APK for every
 * change to a margin.
 *
 * So the browser gets `localStorage`. It is not a keystore and it is not
 * pretending to be one: web is a development surface for this product - the app
 * ships to Android - and a token in a browser that only ever talks to a laptop
 * is not the thing standing between anybody and their account.
 *
 * Everything here answers a promise and swallows its own failures. Private
 * browsing, a cleared profile and blocked site data all make `localStorage`
 * throw on access rather than return nothing, and none of that is worth taking
 * the app down for - a customer who has to sign in again is a customer who can
 * sign in again.
 */
const onWeb = Platform.OS === "web";

export const vaultGet = async (key) => {
    if (!onWeb) return SecureStore.getItemAsync(key);

    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

export const vaultSet = async (key, value) => {
    if (!onWeb) return SecureStore.setItemAsync(key, value);

    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Nothing to do about it and nothing worth saying: the app works for
        // as long as it is open, which is the whole of a browser session.
    }

    return undefined;
};

export const vaultDelete = async (key) => {
    if (!onWeb) return SecureStore.deleteItemAsync(key);

    try {
        window.localStorage.removeItem(key);
    } catch {
        // Already gone, as far as anything that reads it is concerned.
    }

    return undefined;
};
