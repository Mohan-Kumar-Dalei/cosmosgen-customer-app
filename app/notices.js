import { useEffect } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ik } from "../src/brand";
import { useNotices } from "../src/notices";
import { PageHeader } from "../src/PageHeader";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { Body, Empty, Small } from "../src/ui";
import { Icon } from "../src/Icon";

/**
 * What the company has said to everybody, kept.
 *
 * A push lands on the lock screen, and a lock screen is swept clean by whoever
 * picks the phone up next. So the offer somebody meant to come back to, or the
 * notice about the holiday hours, was gone the moment they cleared the shade.
 * This is where it stays.
 *
 * Only the office's own broadcasts. A job's progress - assigned, on the way,
 * billed - is not in here: it belongs to that job, it is on the job's own
 * screen, and a list mixing the two would be a list nobody could scan.
 */
export default function Notices() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const { notices, unread, markSeen } = useNotices();

    /*
     * The badge clears on arrival rather than on leaving.
     *
     * Somebody who opens this page has seen what is in it, whether or not they
     * scroll to the end - and a dot still sitting on the bell when they go back
     * would send them in here a second time to look for something they have
     * already read.
     */
    useEffect(() => { markSeen(); }, [markSeen]);

    const open = (notice) => {
        const action = notice.action || {};

        if (action.kind === "service" && action.serviceKey) {
            router.push("/service/" + action.serviceKey);
        } else if (action.kind === "url" && action.url) {
            Linking.openURL(action.url).catch(() => { /* a dead link is not a crash */ });
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <PageHeader
                title="Notifications"
                right={unread ? (
                    <View style={s.badge}>
                        <Small style={s.badgeText}>{unread} NEW</Small>
                    </View>
                ) : null}
            />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingTop: space.sm,
                    paddingBottom: insets.bottom + space.xxl,
                }}
                showsVerticalScrollIndicator={false}
            >

                {!notices.length ? (
                    <View style={{ marginTop: space.xxl }}>
                        <Empty
                            icon="bell"
                            title="Nothing just now"
                            hint="When there is an offer or a change you should know about, it will be here."
                        />
                    </View>
                ) : (
                    <View style={{ gap: space.md, marginTop: space.sm }}>
                        {notices.map((notice, i) => {
                            /*
                             * A day heading, printed once when the day changes.
                             *
                             * The reference groups these under Today and
                             * Yesterday, and it is worth the trouble: a list of
                             * notices with a time against each is a list you
                             * have to read to date, and a heading answers it
                             * before the eye gets there.
                             */
                            const band = dayBandOf(notice.at);
                            const first = i === 0 || dayBandOf(notices[i - 1].at) !== band;

                            const tappable = (notice.action?.kind || "none") !== "none";

                            return (
                                <View key={notice.id}>
                                {first ? <Small style={s.band}>{band}</Small> : null}

                                <Pressable
                                    onPress={() => open(notice)}
                                    disabled={!tappable}
                                    android_ripple={null}
                                    style={({ pressed }) => [s.card, pressed && tappable ? { opacity: 0.85 } : null]}
                                >
                                    {/*
                                      * The picture on top, full width.
                                      *
                                      * These are posters the office drew for a
                                      * festival or an offer, so they are the
                                      * message rather than an illustration of
                                      * it. A notice written without one is a
                                      * sentence and reads perfectly well as
                                      * one.
                                      */}
                                    {notice.imageUrl ? (
                                        <Image
                                            source={{ uri: ik(notice.imageUrl, "w-900") }}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={200}
                                            recyclingKey={notice.id}
                                            style={s.picture}
                                        />
                                    ) : null}

                                    <View style={s.text}>
                                        <Body style={s.title}>{notice.title}</Body>

                                        {notice.body ? (
                                            <Small style={{ marginTop: space.xs }}>{notice.body}</Small>
                                        ) : null}

                                        <View style={s.foot}>
                                            <Small style={s.when}>{said(notice.at)}</Small>

                                            {/*
                                              * How long an offer has left.
                                              *
                                              * Only on notices the office gave
                                              * an end date - most have none and
                                              * are simply announcements. A
                                              * countdown on something that
                                              * never expires is a clock
                                              * running for no reason.
                                              */}
                                            {left(notice.endsAt) ? (
                                                <View style={s.until}>
                                                    <Small style={s.untilText}>
                                                        {left(notice.endsAt)}
                                                    </Small>
                                                </View>
                                            ) : null}

                                            {tappable ? (
                                                <View style={s.go}>
                                                    <Small style={s.goText}>Open</Small>
                                                    <Icon name="chevron-right" size={13} color={colors.accentDeep} />
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                </Pressable>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

/**
 * "Ends today", "3 days left", or nothing.
 *
 * Nothing once it has passed as well as when there was never a date: a notice
 * that has expired is filtered out by the server, and one that slipped through
 * should go quiet rather than announce that it is stale.
 */
const left = (iso) => {
    if (!iso) return "";

    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return "";

    const days = Math.ceil((at.getTime() - Date.now()) / 86400000);
    if (days < 0) return "";
    if (days === 0) return "Ends today";
    if (days === 1) return "Last day tomorrow";

    return days + " days left";
};

/** Today, Yesterday, or the date - the heading a run of notices sits under. */
const dayBandOf = (iso) => {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return "Earlier";

    const days = Math.floor((Date.now() - at.getTime()) / 86400000);
    if (days <= 0) return "TODAY";
    if (days === 1) return "YESTERDAY";

    return at.toLocaleDateString("en-IN", { day: "numeric", month: "long" }).toUpperCase();
};

/**
 * When it arrived, in the words somebody would use.
 *
 * "Today" and "Yesterday" rather than a date, because that is how anybody talks
 * about something they might have missed - and past that the date is what
 * matters, not the hour.
 */
const said = (iso) => {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return "";

    const days = Math.floor((Date.now() - at.getTime()) / 86400000);

    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return days + " days ago";

    return at.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const makeStyles = (colors) => StyleSheet.create({
    until: {
        paddingHorizontal: space.sm + 2,
        paddingVertical: 3,
        borderRadius: radius.sm,
        backgroundColor: colors.warnTint,
    },
    untilText: { fontFamily: font.bold, fontSize: 10.5, color: colors.warn },

    badge: {
        paddingHorizontal: space.md,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: colors.field,
    },
    badgeText: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.5, color: colors.fieldInk },

    band: {
        fontFamily: font.bold,
        fontSize: 10,
        letterSpacing: 0.8,
        color: colors.inkFaint,
        marginTop: space.lg,
        marginBottom: space.sm,
    },

    card: {
        borderRadius: radius.lg,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    picture: { width: "100%", height: 150, backgroundColor: colors.iconSurface },

    text: { padding: space.lg },
    title: { fontFamily: font.semibold, fontSize: 15 },

    foot: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        marginTop: space.md,
    },
    when: { flex: 1, fontSize: 11.5, color: colors.inkFaint },

    go: { flexDirection: "row", alignItems: "center", gap: 1 },
    goText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.accentDeep },
});
