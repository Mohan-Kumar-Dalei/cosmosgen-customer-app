import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useArea } from "./area";
import { PlaceSearch } from "./PlaceSearch";
import { font, radius, space, useColors, useThemedStyles } from "./theme";
import { Badge, Body, Button, Eyebrow, Notice, Small, Title } from "./ui";
import { Icon } from "./Icon";

/**
 * The control that answers "do you even come to my street".
 *
 * The website puts this in the header, where a delivery app keeps its address,
 * because it is the first thing anybody checks and the last thing they want to
 * hunt for. There is no header on a phone screen, so it sits at the top of the
 * home page instead - and it asks the same two ways, for the same reason: a
 * good half of people refuse the location prompt, and somebody arranging a
 * repair at their parents' house is not standing in it.
 *
 * Nothing here asks for the permission on its own. A permission box that
 * appears before anybody has read a word is the fastest way to have it denied
 * for ever.
 */
export const AreaCard = () => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const { place, known, total, radiusKm, covered, status, error, detect, pick, forget } = useArea();

    const [open, setOpen] = useState(false);

    // Settled areas collapse to one line. Re-opening is one tap, and the
    // question is not worth a card of its own once it has been answered.
    const asking = open || !known;

    return (
        <View style={s.card}>
            <View style={s.head}>
                <View style={s.pin}>
                    <Icon name="map-pin" size={16} color={known ? colors.accent : colors.inkFaint} />
                </View>

                <View style={{ flex: 1 }}>
                    <Eyebrow>Your area</Eyebrow>
                    <Title style={{ fontSize: 17, marginTop: 2 }}>
                        {known ? (place.label || place.city || place.state) : "Where are you?"}
                    </Title>
                </View>

                {known ? (
                    <Badge tone={covered ? "brand" : "warn"}>
                        {covered ? "We come here" : "Not here yet"}
                    </Badge>
                ) : null}
            </View>

            {known ? (
                <Small style={{ marginTop: space.sm }}>
                    {total > 0
                        ? total + " engineer" + (total === 1 ? "" : "s") + " within " + radiusKm + " km of you."
                        : "Nobody within " + radiusKm + " km yet. Ask anyway - the office will tell you straight."}
                </Small>
            ) : (
                <Small style={{ marginTop: space.sm }}>
                    We are in more towns every month, but not every trade has somebody in every town. Check
                    before you describe the problem.
                </Small>
            )}

            {asking ? (
                <View style={{ marginTop: space.lg }}>
                    <Button
                        icon="navigation"
                        busy={status === "locating"}
                        onPress={async () => {
                            const ok = await detect();
                            if (ok) setOpen(false);
                        }}
                    >
                        {known ? "Use my location again" : "Use my location"}
                    </Button>

                    <View style={s.or}>
                        <View style={s.orLine} />
                        <Small style={{ fontSize: 11 }}>or</Small>
                        <View style={s.orLine} />
                    </View>

                    {/*
                      * Picked from a list, not typed into a box.
                      *
                      * This was a plain field that sent whatever was in it,
                      * and the server could only title-case the words and hand
                      * them back - so a line of nonsense became "Your area"
                      * with a badge underneath saying we do not come there
                      * yet. Suggestions carry coordinates, and a coordinate
                      * cannot be made up.
                      */}
                    <PlaceSearch
                        label="Search for your town or area"
                        onPick={async (place) => {
                            const ok = await pick(place.lat, place.lon);
                            if (ok) setOpen(false);
                        }}
                    />

                    {error ? <View style={{ marginTop: space.md }}><Notice>{error}</Notice></View> : null}
                </View>
            ) : (
                <View style={s.settled}>
                    <Pressable onPress={() => setOpen(true)} hitSlop={8}>
                        <Body style={s.link}>Change area</Body>
                    </Pressable>
                    <Pressable onPress={forget} hitSlop={8}>
                        <Body style={[s.link, { color: colors.inkFaint }]}>Clear</Body>
                    </Pressable>
                </View>
            )}
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: space.lg,
    },
    head: { flexDirection: "row", alignItems: "center", gap: space.md },
    pin: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },

    or: { flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.md },
    orLine: { flex: 1, height: 1, backgroundColor: colors.hairline },

    settled: { flexDirection: "row", gap: space.lg, marginTop: space.md },
    link: { fontFamily: font.semibold, fontSize: 13.5, color: colors.accent },
});
