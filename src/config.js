import Constants from "expo-constants";

/**
 * Where the app looks for the backend.
 *
 * Not localhost. On a phone "localhost" is the phone itself, so a request to
 * it never leaves the handset and every screen fails before it starts.
 *
 * The hosted API is the default, and it is the same address the vendor app,
 * Exotel and PUBLIC_API_URL all use - so there is one address to change, not
 * four. It works from any network, mobile data included, and does not need
 * the laptop to be awake.
 *
 * API_URL in customer-app/.env overrides it, which is how a build points at a
 * local server: the laptop's own address on the wifi is faster for
 * development but only reaches the phone while both are on that wifi. For
 * this machine that is http://192.168.29.123:3000 - and check it again if the
 * router hands out a new one. Either way the backend has to actually be
 * running on port 3000.
 */
export const API_URL =
    Constants.expoConfig?.extra?.apiUrl
    || "https://cosmosgen-api.duckdns.org";

export const API_BASE = API_URL + "/api";

/** The number people book on when they would rather message than tap. */
export const WHATSAPP_NUMBER = "918260866144";
