import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { oneLine, useAddresses } from "./addresses";
import { ik } from "./brand";
import { useArea } from "./area";
import { useNotices } from "./notices";
import { useSession } from "./session";
import { font, radius, rampFor, space, useColors, useThemedStyles } from "./theme";
import { Icon } from "./Icon";

/**
 * The filled block the app opens on: where you are, what is waiting for you,
 * and the way into the catalogue.
 *
 * This replaces a top bar that sat on the page and looked like part of it. The
 * reference kit Mohan picked out does the same thing every app of this kind
 * does - it puts the address, the bell and the search into one coloured band
 * with its bottom corners rounded off, and lets the white page start
 * underneath. The reason it works is that it gives the screen a top: the eye
 * knows where the chrome stops and the content begins without a rule being
 * drawn, and the first white card reads as lying on the page rather than as the
 * page's first row.
 *
 * The colour is ours, not the reference's. It is the same blue every button in
 * both apps carries, through the same three-stop diagonal - light at the top
 * left, the colour itself, deeper at the bottom right - so the band reads as a
 * surface with light on it rather than a rectangle somebody filled in.
 *
 * Nothing in here scrolls. It is the one fixed thing on a tab screen, which is
 * what makes the address and the bell reachable from anywhere in a long page.
 */
export const HeaderBand = ({ heading, note, search = true, onSearch }) => {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const insets = useSafeAreaInsets();

    const { customer } = useSession();
    const { place, known } = useArea();
    const { unread } = useNotices();

    /*
     * The address itself, not the name of the area it fell in.
     *
     * This used to read "Rasulgarh" - the suburb the phone's pin landed in -
     * which is not where anybody is sending an engineer. Mohan asked for the
     * saved address instead, the way a delivery app does it: the label on top,
     * because that is how somebody thinks about the place ("Home"), and the
     * street under it so they can see at a glance which of their addresses the
     * next booking is going to.
     *
     * Falls back to the area while nothing is saved, because a new account has
     * a pin before it has an address book.
     */
    const book = useAddresses();
    const saved = book.items.find((a) => a.isDefault) || book.items[0];

    /*
     * Light icons in the status bar while this band is on screen.
     *
     * The bar sits on top of a saturated blue, and the phone's own clock and
     * battery are painted dark on a light theme - which on this blue is close
     * to unreadable. Set on focus rather than once, because a stacked screen
     * pushed over the top of this one is back on white paper and needs the
     * dark set restored when it is popped.
     */
    useFocusEffect(useCallback(() => {
        setStatusBarStyle("light", true);
        return () => setStatusBarStyle("auto", true);
    }, []));

    const initial = (customer?.name || "").trim().charAt(0).toUpperCase();

    const placeName = saved?.label || (known ? "Your area" : "Location");
    const where = saved
        ? oneLine(saved)
        : (known ? (place?.label || place?.city || "Your area") : "Tell us where you are");

    return (
        <LinearGradient
            colors={rampFor(colors.field)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.band, { paddingTop: insets.top + space.md }]}
        >
            <View style={s.row}>
                {/*
                  * The address, as a label over a value.
                  *
                  * Two lines rather than one because "Location" is what makes
                  * the line under it legible as an address rather than as a
                  * heading - this is a screen where a place name and a service
                  * name would otherwise look alike. Tapping it opens the area
                  * picker, which is the same thing the old bar did.
                  */}
                {heading ? (
                    /*
                      * A screen that is not about where you are says what it
                      * is instead. Your jobs and Account have nothing to do
                      * with an address, and a location line on them is the
                      * band repeating itself on every page.
                      */
                    <View style={{ flex: 1 }}>
                        <Text style={s.heading} numberOfLines={1}>{heading}</Text>
                        {note ? <Text style={s.note} numberOfLines={1}>{note}</Text> : null}
                    </View>
                ) : (
                    <Pressable
                        onPress={() => router.push("/addresses")}
                        hitSlop={6}
                        android_ripple={null}
                        style={{ flex: 1 }}
                    >
                        <View style={s.whereRow}>
                            <Icon name="map-pin" size={13} color={colors.fieldInk} />
                            <Text style={s.label} numberOfLines={1}>{placeName}</Text>
                            <Icon name="chevron-down" size={15} color={colors.fieldInk} />
                        </View>

                        <Text style={s.where} numberOfLines={1}>{where}</Text>
                    </Pressable>
                )}

                {/*
                  * The bell, and a dot rather than a number.
                  *
                  * A customer does not work through a queue of these the way
                  * the office works through tickets - there is either something
                  * new from the company or there is not, and a figure invites
                  * the reader to wonder what they missed.
                  */}
                <Pressable
                    onPress={() => router.push("/notices")}
                    hitSlop={8}
                    android_ripple={null}
                    style={s.chip}
                    accessibilityLabel={unread ? "Notices, something new" : "Notices"}
                >
                    <Icon name="bell" size={17} color={colors.fieldInk} />
                    {unread > 0 ? <View style={s.pip} /> : null}
                </Pressable>

                {/* The customer's own initial. There is no profile photograph
                    in this app and no reason to ask for one. */}
                <Pressable
                    onPress={() => router.push("/(tabs)/account")}
                    hitSlop={8}
                    android_ripple={null}
                    style={s.avatar}
                    accessibilityLabel="Your account"
                >
                    {/*
                      * The picture if there is one.
                      *
                      * It was always the initial, so somebody who added a
                      * photograph saw it on the profile screen and then not on
                      * the home screen they spend their time on - which reads
                      * as the upload having half worked.
                      */}
                    {customer?.photoUrl ? (
                        <Image
                            source={{ uri: ik(customer.photoUrl, "w-160") }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={180}
                            style={s.avatarPhoto}
                        />
                    ) : initial ? (
                        <Text style={s.initial}>{initial}</Text>
                    ) : (
                        <Icon name="user" size={17} color={colors.field} />
                    )}
                </Pressable>
            </View>

            {/*
              * A button that looks like a field.
              *
              * It opens the search screen rather than taking a word here: a
              * box that raises the keyboard on one screen and then throws the
              * text at another is two search boxes that can disagree about
              * what was typed. That screen searches for real - it was going to
              * the catalogue and merely filtering it before, which is not what
              * a search box on a home page is for.
              */}
            {search ? (
                <Pressable
                    onPress={onSearch || (() => router.push("/search"))}
                    android_ripple={null}
                    style={s.search}
                >
                    <Icon name="search" size={17} color={colors.inkFaint} />
                    <Text style={s.searchText} numberOfLines={1}>
                        Search AC repair, tap leak, switchboard…
                    </Text>
                </Pressable>
            ) : null}
        </LinearGradient>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    /*
     * Only the bottom corners are rounded. The top of it runs under the status
     * bar and off the top of the screen, which is what makes it read as the
     * page's edge rather than as a card that happens to be first.
     */
    band: {
        paddingHorizontal: space.lg,
        paddingBottom: space.lg,
        borderBottomLeftRadius: radius.lg,
        borderBottomRightRadius: radius.lg,
    },

    row: { flexDirection: "row", alignItems: "center", gap: space.sm },

    // The label is the heading now and the street is the quiet line under it,
    // which is the way round a delivery app sets them.
    label: {
        flexShrink: 1,
        fontFamily: font.semibold,
        fontSize: 15,
        color: colors.fieldInk,
    },
    heading: {
        fontFamily: font.display,
        fontSize: 21,
        lineHeight: 26,
        letterSpacing: -0.3,
        color: colors.fieldInk,
    },
    note: {
        fontFamily: font.medium,
        fontSize: 12,
        color: colors.fieldInk,
        opacity: 0.8,
        marginTop: 1,
    },

    whereRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    where: {
        marginTop: 1,
        fontFamily: font.body,
        fontSize: 12,
        color: colors.fieldInk,
        opacity: 0.8,
    },

    // A translucent disc rather than a white one: white on this blue is a
    // second button competing with the avatar beside it.
    chip: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: "rgba(255, 255, 255, 0.18)",
        alignItems: "center", justifyContent: "center",
    },
    pip: {
        position: "absolute",
        top: 7, right: 8,
        width: 9, height: 9,
        borderRadius: 5,
        backgroundColor: colors.warn,
        borderWidth: 2,
        borderColor: colors.field,
    },

    // The one solid white thing in the band, because it is the way back to
    // the customer's own details from every screen in the app.
    avatar: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: colors.white,
        alignItems: "center", justifyContent: "center",
    },
    initial: { fontFamily: font.bold, fontSize: 16, color: colors.field },
    avatarPhoto: { width: "100%", height: "100%", borderRadius: 19 },

    search: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        height: 46,
        marginTop: space.lg,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
    },
    searchText: { flex: 1, fontFamily: font.body, fontSize: 13.5, color: colors.inkFaint },
});
