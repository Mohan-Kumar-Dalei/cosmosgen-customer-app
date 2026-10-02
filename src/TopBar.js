import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ik, LOGO } from "./brand";
import { useNotices } from "./notices";
import { useSession } from "./session";
import { font, rampFor, space, useColors, useThemedStyles } from "./theme";
import { Icon } from "./Icon";

/**
 * The bar across the top of every screen.
 *
 * This app had none, on purpose: each page carried its own heading, and a bar
 * repeating the name of the tab you had just pressed is a line of the screen
 * spent telling somebody what they already know. That reasoning was right
 * about the title and wrong about everything else a top bar does.
 *
 * What it does here is say where the company is standing. "Patia,
 * Bhubaneswar" under the mark is the single most reassuring thing on a screen
 * that is about letting a stranger into your house, and it was previously
 * buried three cards down the home page. The mark says whose app this is, and
 * the face on the right is the way back to your own details from anywhere.
 *
 * The bell beside it used to be deliberately absent: nothing in this app kept a
 * list of anything, so a bell would have opened either nothing or a lie. The
 * office can now broadcast - a festival, an offer, a change of hours - and
 * those are kept, so the bell has something true to open. It still shows only
 * what the office sent to everybody; a job's own updates belong to the job and
 * are read there.
 */
export const TopBar = ({ title, subtitle, back, onBack, mark = true }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const router = useRouter();
    const { customer } = useSession();
    const { unread } = useNotices();

    const initial = (customer?.name || "").trim().charAt(0).toUpperCase();

    return (
        <View style={s.bar}>
            {back ? (
                <Pressable
                    onPress={onBack || (() => router.back())}
                    hitSlop={10}
                    style={s.back}
                    android_ripple={null}
                >
                    <Icon name="arrow-left" size={20} color={colors.ink} />
                </Pressable>
            ) : null}

            {/*
              * The mark stays beside the back button rather than being
              * replaced by it.
              *
              * A stacked screen with only an arrow on it could belong to any
              * app on the phone. Somebody three steps into a booking, about to
              * give an address and a phone number, should be able to see whose
              * form they are filling in without going back to find out.
              */}
            {/*
              * The mark itself, not the mark in a box.
              *
              * It was set in a bordered rounded square, which turns a logo
              * into an app icon sitting inside its own app - a thing only
              * ever seen on a home screen. The export puts the artwork
              * straight on the bar and it is right: the logo already has its
              * own shape.
              */}
            {mark ? (
                <Image
                    source={{ uri: ik(LOGO, "w-120") }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    style={s.mark}
                />
            ) : null}

            <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>{title}</Text>

                {subtitle ? (
                    <View style={s.where}>
                        <Icon name="map-pin" size={12} color={colors.accent} />
                        <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
                    </View>
                ) : null}
            </View>

            {/*
              * The bell, to the left of the avatar.
              *
              * Only while somebody is signed in: there is nothing addressed to
              * a stranger, and a bell that always opens an empty page is the
              * lie this bar spent a year avoiding.
              *
              * The count is a dot rather than a number. A customer does not
              * work through a queue of these the way the office works through
              * tickets - there is either something new from the company or
              * there is not, and "3" invites the reader to wonder what they
              * missed.
              */}
            {customer ? (
                <Pressable
                    onPress={() => router.push("/notices")}
                    hitSlop={8}
                    style={s.bell}
                    android_ripple={null}
                    accessibilityLabel={unread ? "Notices, something new" : "Notices"}
                >
                    <Icon name="bell" size={17} color={colors.ink} />
                    {unread > 0 ? <View style={s.pip} /> : null}
                </Pressable>
            ) : null}

            {/*
              * The customer's own initial, not a stock silhouette.
              *
              * There is no profile photograph in this app and there is no
              * reason to ask for one - so the avatar is the first letter of
              * the name the engineer will ask for at the gate, which is the
              * only identity this app actually holds.
              *
              * Bigger than the bell beside it, and the only filled thing on
              * this bar. At 34 points in the palest blue it was a chip among
              * chips and Mohan could not find it; it is the way back to your
              * own details from every screen in the app, so it is allowed to
              * be the one element here with weight.
              *
              * The fill is the accent taken through the same three-stop
              * diagonal every button in both apps carries - light at the top
              * left, the colour itself, deeper at the bottom right. On a disc
              * that reads as a sphere rather than as a circle somebody filled
              * in, which is what makes a letter on it look like a mark rather
              * than a label.
              */}
            <Pressable
                onPress={() => router.push("/(tabs)/account")}
                hitSlop={8}
                android_ripple={null}
                accessibilityLabel="Your account"
            >
                <LinearGradient
                    colors={rampFor(colors.field)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.avatar}
                >
                    {initial
                        ? <Text style={s.initial}>{initial}</Text>
                        : <Icon name="user" size={19} color="#ffffff" />}
                </LinearGradient>
            </Pressable>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    bar: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingHorizontal: space.lg,
        paddingBottom: space.md,
    },

    mark: { width: 34, height: 32 },
    back: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        alignItems: "center", justifyContent: "center",
    },

    // headline-md: the display face at twenty, tightly tracked. It is the
    // name of the screen, and a screen's name is a heading.
    title: {
        fontFamily: font.display,
        fontSize: 20,
        lineHeight: 25,
        letterSpacing: -0.3,
        color: colors.ink,
    },
    where: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 },
    subtitle: { flex: 1, fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },

    bell: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: colors.iconSurface,
        alignItems: "center", justifyContent: "center",
    },

    // On the rim rather than inside the disc, so it never sits on the bell
    // itself. A ring in the bar's own colour cuts it away from whatever is
    // behind it, which is how it stays legible on either theme.
    pip: {
        position: "absolute",
        top: 5, right: 6,
        width: 9, height: 9,
        borderRadius: 5,
        backgroundColor: colors.danger,
        borderWidth: 2,
        borderColor: colors.canvas,
    },

    avatar: {
        width: 42, height: 42, borderRadius: 21,
        alignItems: "center", justifyContent: "center",

        // A hairline in the page's own colour, so the disc reads as sitting on
        // the paper rather than as a hole cut through it. On the dark theme it
        // is the same idea and does the opposite job - it keeps a bright blue
        // circle from glowing at the edges.
        borderWidth: 2,
        borderColor: colors.canvas,
    },
    initial: { fontFamily: font.bold, fontSize: 17, color: "#ffffff" },
});
