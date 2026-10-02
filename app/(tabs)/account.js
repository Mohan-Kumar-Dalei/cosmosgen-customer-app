import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ik, WHATSAPP_LINK } from "../../src/brand";
import { WhatsAppMark } from "../../src/Marks";
import { TAB_BAR_SPACE } from "../../src/TabBar";
import { useSession } from "../../src/session";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Confirm, Small } from "../../src/ui";
import { Icon } from "../../src/Icon";

/**
 * Who you are, and everywhere else this app goes.
 *
 * A face, a name, and a list - which is the reference kit's shape for this tab
 * and the right one. What was here before put the whole name-and-address form
 * at the top and hung four links underneath it, so the screen somebody opens to
 * find their bookings opened on a text field.
 *
 * The form still exists; it is behind Your profile now. Everything on this
 * screen is a destination, and each one is a place that already exists rather
 * than a row put here because the reference had a row there - no payment
 * methods, because nothing is stored, and no wallet, because a customer does
 * not have one.
 *
 * There is no blue band on this screen. Mohan asked for that colour to stop
 * appearing on every page; it belongs to the home screen, where it carries the
 * address and the search.
 */
export default function Account() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { customer, signOut } = useSession();
    const [leaving, setLeaving] = useState(false);
    const [busy, setBusy] = useState(false);

    const initial = (customer?.name || "").trim().charAt(0).toUpperCase();

    const leave = async () => {
        setBusy(true);
        await signOut();
        setBusy(false);
        router.replace("/welcome");
    };

    /*
     * No Notifications row.
     *
     * The bell in the header opens them from every screen in the app, and a
     * second door to the same page is a second thing to keep in step for no
     * gain - Mohan asked for it off this list for exactly that reason.
     */
    const ROWS = [
        { icon: "user", label: "Your profile", to: "/profile" },
        { icon: "map-pin", label: "Manage addresses", to: "/addresses" },
        { icon: "clipboard", label: "My bookings", to: "/(tabs)/jobs" },
        { icon: "bookmark", label: "Saved services", to: "/bookmarks" },
        { icon: "tag", label: "Offers", to: "/offers" },
        { mark: WhatsAppMark, label: "Book on WhatsApp", url: WHATSAPP_LINK },
        { icon: "help-circle", label: "Help Centre", to: "/help" },
        { icon: "lock", label: "Privacy policy", to: "/policy" },
        { icon: "file-text", label: "Terms and conditions", to: "/policy?at=terms" },
    ];

    return (
        <View style={s.page}>
            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingTop: insets.top + space.xl,
                    paddingBottom: insets.bottom + TAB_BAR_SPACE + space.xl,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* ---- who ---- */}
                <Pressable
                    onPress={() => router.push("/profile")}
                    android_ripple={null}
                    style={s.who}
                >
                    <View style={s.avatar}>
                        {/*
                          * The picture if there is one, the initial if not.
                          *
                          * It was always the initial, so a customer who added a
                          * photograph on the profile screen came back here and
                          * found it missing - which reads as the upload having
                          * failed.
                          */}
                        {customer?.photoUrl ? (
                            <Image
                                source={{ uri: ik(customer.photoUrl, "w-240") }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={180}
                                style={s.avatarPhoto}
                            />
                        ) : initial ? (
                            <Text style={s.avatarInitial}>{initial}</Text>
                        ) : (
                            <Icon name="user" size={34} color={colors.accentDeep} />
                        )}

                        {/* The pencil the reference puts on the picture. It
                            opens the form rather than a camera - there is no
                            profile photograph in this product. */}
                        <View style={s.pencil}>
                            <Icon name="edit-2" size={12} color={colors.fieldInk} />
                        </View>
                    </View>

                    <Text style={s.name}>{customer?.name || "Your details"}</Text>
                    <Small style={s.number}>
                        +91 {(customer?.phone || "").replace(/^91/, "")}
                    </Small>
                </Pressable>

                {/* ---- everywhere else ---- */}
                <View style={s.list}>
                    {ROWS.map((row, i) => (
                        <Pressable
                            key={row.label}
                            onPress={() => (row.url
                                ? Linking.openURL(row.url).catch(() => {})
                                : router.push(row.to))}
                            android_ripple={null}
                            style={({ pressed }) => [
                                s.row,
                                i > 0 ? s.divided : null,
                                pressed ? { backgroundColor: colors.sunkenSoft } : null,
                            ]}
                        >
                            {row.mark
                                ? <row.mark size={18} color={colors.inkSoft} />
                                : <Icon name={row.icon} size={18} color={colors.inkSoft} />}

                            <Text style={s.rowLabel}>{row.label}</Text>
                            <Icon name="chevron-right" size={18} color={colors.inkFaint} />
                        </Pressable>
                    ))}
                </View>

                {/* ---- and the way out ---- */}
                <Pressable
                    onPress={() => setLeaving(true)}
                    android_ripple={null}
                    style={({ pressed }) => [
                        s.list,
                        s.row,
                        { marginTop: space.lg },
                        pressed ? { backgroundColor: colors.dangerTint } : null,
                    ]}
                >
                    <Icon name="log-out" size={18} color={colors.danger} />
                    <Text style={[s.rowLabel, { color: colors.danger }]}>Logout</Text>
                </Pressable>
            </ScrollView>

            {/*
              * The sheet the reference asks for, which this app already had -
              * its own modal rather than the platform's alert box. Mohan's rule
              * is that this product never uses window.confirm's equivalent.
              */}
            <Confirm
                open={leaving}
                title="Logout"
                badge={customer?.name || "This account"}
                body="Are you sure you want to log out? Your jobs stay exactly where they are - coming back means one more six digit code on WhatsApp."
                confirmLabel="Yes, logout"
                tone="field"
                busy={busy}
                onConfirm={leave}
                onCancel={() => setLeaving(false)}
            />
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    who: { alignItems: "center" },
    avatar: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    avatarInitial: { fontFamily: font.displayBold, fontSize: 38, color: colors.accentDeep },
    avatarPhoto: { width: "100%", height: "100%", borderRadius: 48 },
    pencil: {
        position: "absolute",
        right: 0, bottom: 2,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.field,
        alignItems: "center", justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.canvas,
    },

    name: {
        marginTop: space.md,
        fontFamily: font.display,
        fontSize: 20,
        color: colors.ink,
    },
    number: { marginTop: 1, fontSize: 13 },

    list: {
        marginTop: space.xxl,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.lg,
        paddingHorizontal: space.lg,
        paddingVertical: space.lg - 1,
    },

    // On the row rather than between them, so the first never draws a line
    // against the card's own top edge.
    divided: { borderTopWidth: 1, borderTopColor: colors.hairline },

    rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
});
