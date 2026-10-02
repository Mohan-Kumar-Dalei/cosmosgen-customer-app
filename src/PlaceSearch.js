import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { api } from "./api";
import { font, radius, space, useColors, useThemedStyles } from "./theme";
import { Field, Small } from "./ui";
import { Icon } from "./Icon";

/**
 * An address somebody picked, not an address somebody typed.
 *
 * The address box was a plain text field, so "dbskdb" saved as happily as a
 * street did - and the job was then sent to whatever pin happened to be on the
 * record, with nonsense printed underneath it for the vendor to read at the
 * door. A written address that nobody can find is worse than none: it looks
 * like an answer.
 *
 * So the typing is a search and the saving is a choice. Suggestions come from
 * the same Places service the office panel uses, through our own server, and
 * only picking one sets the address - with its own coordinates, its own area,
 * its own pincode, all of them Google's rather than ours.
 *
 * On the bill, this is the cheap half of Places in India: autocomplete
 * requests are free up to 70,000 a month, and a session - all the keystrokes
 * of one search plus the details call at the end - is billed as one lookup
 * rather than as one per letter. That is what the session token below is for.
 */

/** How long a pause in typing counts as "they have finished a word". */
const SETTLE_MS = 350;

/** Google's own floor; shorter than this is not a search, it is a letter. */
const MIN_LETTERS = 3;

/**
 * One token for one search.
 *
 * Google groups every keystroke under it and charges the session once. It has
 * to be thrown away after a pick, or the next search rides on a spent session
 * and is billed on its own.
 */
const newSession = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 12);

export const PlaceSearch = ({ label = "Search for the address", onPick, style }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const [query, setQuery] = useState("");
    const [list, setList] = useState([]);
    const [looking, setLooking] = useState(false);
    const [note, setNote] = useState("");

    const session = useRef(newSession());

    /*
     * Asked after the typing stops, not during it.
     *
     * A request per keystroke would be four requests for "Bhubaneswar" before
     * the word exists, and the answers would arrive out of order - the list
     * flickering backwards as the earlier ones land last.
     */
    useEffect(() => {
        const q = query.trim();

        if (q.length < MIN_LETTERS) {
            setList([]);
            setLooking(false);
            return undefined;
        }

        setLooking(true);
        let dropped = false;

        const timer = setTimeout(async () => {
            try {
                const res = await api.get("/map/search", {
                    params: { q, session: session.current },
                });

                if (dropped) return;

                const found = res?.data?.data || [];
                setList(found);
                setNote(found.length ? "" : "Nothing found by that name.");
            } catch {
                if (!dropped) {
                    setList([]);
                    setNote("Could not search just now. Try again in a moment.");
                }
            } finally {
                if (!dropped) setLooking(false);
            }
        }, SETTLE_MS);

        return () => { dropped = true; clearTimeout(timer); };
    }, [query]);

    const choose = async (item) => {
        setLooking(true);
        setList([]);
        setQuery(item.mainText || item.label || "");

        try {
            const res = await api.get("/map/place", {
                params: { placeId: item.placeId, session: session.current },
            });

            const place = res?.data?.data;
            if (!place) throw new Error("no place");

            // Spent: the next search starts its own session - see newSession.
            session.current = newSession();

            onPick({
                address: place.label || item.label || "",
                area: place.area || "",
                city: place.city || "",
                state: place.state || "",
                pincode: place.pincode || "",
                lat: place.lat,
                lon: place.lon,
            });

            setQuery("");
            setNote("");
        } catch {
            setNote("Could not read that address. Pick it again, or use your current location.");
        } finally {
            setLooking(false);
        }
    };

    return (
        <View style={style}>
            <Field
                label={label}
                value={query}
                onChangeText={(t) => { setQuery(t); setNote(""); }}
                placeholder="Street, building or area"
                autoCorrect={false}
            />

            {looking ? (
                <View style={s.busy}>
                    <ActivityIndicator size="small" color={colors.inkFaint} />
                    <Small style={{ color: colors.inkFaint }}>Looking…</Small>
                </View>
            ) : null}

            {note ? <Small style={{ marginTop: space.xs }}>{note}</Small> : null}

            {list.length ? (
                <View style={s.list}>
                    {list.slice(0, 6).map((item, i) => (
                        <Pressable
                            key={item.placeId}
                            onPress={() => choose(item)}
                            style={[s.row, i ? s.divided : null]}
                            android_ripple={null}
                        >
                            <Icon name="map-pin" size={15} color={colors.inkFaint} />

                            <View style={{ flex: 1 }}>
                                <Small style={s.main} numberOfLines={1}>
                                    {item.mainText || item.label}
                                </Small>

                                {item.secondaryText ? (
                                    <Small style={s.second} numberOfLines={1}>
                                        {item.secondaryText}
                                    </Small>
                                ) : null}
                            </View>
                        </Pressable>
                    ))}
                </View>
            ) : null}
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    busy: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.sm },

    list: {
        marginTop: space.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.surface,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.md,
        paddingVertical: space.md,
    },
    divided: { borderTopWidth: 1, borderTopColor: colors.hairline },

    main: { fontFamily: font.semibold, color: colors.ink },
    second: { fontSize: 11.5, color: colors.inkFaint },
});
