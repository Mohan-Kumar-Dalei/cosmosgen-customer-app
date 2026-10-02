import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useBookmarks } from "./bookmarks";
import { APPLIANCE_ICON, artFor, estimateRange, fitFor, SERVICE_ICON } from "./brand";
import { font, radius, space, useColors, useThemedStyles } from "./theme";
import { Body, IconArt, PriceRange, Small } from "./ui";
import { Icon } from "./Icon";

/**
 * One trade, as the card every list in this app shows it with.
 *
 * The reference kit uses the same card on its popular services, its bookmarks,
 * its search results and its category pages, and so does this - a customer
 * should not have to learn what a service looks like four times. A picture, the
 * trade it belongs to, its name, what customers scored it, and what it usually
 * comes to.
 *
 * The heart is on the picture and is the only control on the card that is not
 * the card itself. It fills the moment it is pressed rather than waiting for
 * the server, which is what stops it feeling broken on a slow connection - see
 * src/bookmarks.js for what happens if the request then fails.
 */
export const TradeCard = ({ service, machine, wide = false, onPress, onRemove }) => {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const { has, toggle } = useBookmarks();

    const range = estimateRange(service);
    const saved = has(service.key);

    /*
     * A card can stand for one machine rather than the whole trade.
     *
     * Searching "washing machine" used to return the AC & Appliance Repair
     * card, because that is the service the machine lives inside - which is
     * the trade answering a question about a machine. With `machine` the card
     * carries that machine's name and picture and opens its own page.
     */
    const open = onPress || (() => router.push(
        "/service/" + service.key + (machine ? "?appliance=" + machine.key : "")
    ));

    return (
        <Pressable
            onPress={open}
            android_ripple={null}
            style={({ pressed }) => [s.card, wide ? null : { width: 210 }, pressed ? { opacity: 0.85 } : null]}
        >
            <View>
                <IconArt
                    src={artFor(service, machine)}
                    fit={fitFor(service, machine)}
                    icon={machine ? (APPLIANCE_ICON[machine.key] || "tool") : (SERVICE_ICON[service.key] || "tool")}
                    tint="sky"
                    tr="w-420"
                    height={wide ? 110 : 120}
                    chip={false}
                />

                {/* The score, where the reference puts it. */}
                <View style={s.score}>
                    <Icon name="star" size={11} color={colors.star} />
                    <Small style={s.scoreText}>
                        {Number(service.rating || 4.6).toFixed(1)}
                    </Small>
                </View>

                <Pressable
                    onPress={() => (onRemove ? onRemove(service) : toggle(service.key))}
                    hitSlop={8}
                    android_ripple={null}
                    style={s.heart}
                    accessibilityLabel={saved ? "Remove from saved" : "Save this trade"}
                >
                    <Icon
                        name="bookmark"
                        size={15}
                        color={saved ? colors.field : colors.inkFaint}
                    />
                </Pressable>
            </View>

            <View style={s.body}>
                <View style={s.chip}>
                    <Small style={s.chipText} numberOfLines={1}>
                        {machine
                            ? (service.display || service.label)
                            : (service.worker || "Home service")}
                    </Small>
                </View>

                <Body style={s.name} numberOfLines={2}>
                    {machine
                        ? (machine.display || machine.label)
                        : (service.display || service.label)}
                </Body>

                <PriceRange range={range} size="sm" />
            </View>
        </Pressable>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    card: {
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: space.sm,
        overflow: "hidden",
    },

    score: {
        position: "absolute",
        left: space.sm,
        top: space.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: space.sm,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
    },
    scoreText: { fontFamily: font.bold, fontSize: 11, color: colors.ink },

    heart: {
        position: "absolute",
        right: space.sm,
        top: space.sm,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.surface,
        alignItems: "center", justifyContent: "center",
    },

    body: { paddingHorizontal: space.sm, paddingTop: space.md, paddingBottom: space.sm, gap: 4 },
    chip: {
        alignSelf: "flex-start",
        paddingHorizontal: space.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: colors.accentTint,
    },
    chipText: { fontFamily: font.semibold, fontSize: 10, color: colors.accentDeep },

    name: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19 },
});
