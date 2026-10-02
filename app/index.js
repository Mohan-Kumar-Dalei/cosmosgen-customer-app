import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { hasSeenIntro } from "../src/intro";
import { Loading } from "../src/Loading";
import { useSession } from "../src/session";

/**
 * The door, and nothing else.
 *
 * Three answers decide which half of the app opens, and none of them is known
 * at the moment the app starts: whether this phone has been introduced to the
 * company, and whether the stored token still means anything. Sending somebody
 * anywhere before both have come back is how a returning customer gets a flash
 * of the sign-in screen every single time they open the app.
 */
export default function Index() {
    const { customer, ready } = useSession();

    const [introSeen, setIntroSeen] = useState(null);

    useEffect(() => {
        hasSeenIntro().then(setIntroSeen);
    }, []);

    if (!ready || introSeen === null) return <Loading label="Opening Cosmosgen" />;

    if (customer) return <Redirect href="/(tabs)" />;

    // Signing out does not un-explain the company: somebody who has already
    // been through the introduction lands on the sign-in screen rather than
    // being walked through five pages again.
    return <Redirect href={introSeen ? "/login" : "/welcome"} />;
}
