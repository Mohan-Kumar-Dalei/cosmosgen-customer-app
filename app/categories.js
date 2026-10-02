import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tilesFor } from "../src/brand";
import { useJobs } from "../src/jobs";
import { PageHeader } from "../src/PageHeader";
import { font, radius, rampFor, space, useColors, useThemedStyles } from "../src/theme";
import { Empty, Small } from "../src/ui";
import { Icon } from "../src/Icon";

/**
 * Every trade the company sells, as a grid.
 *
 * The home screen shows seven and a way here; this is the rest. It is a grid
 * rather than the list on the catalogue screen because the two answer different
 * questions - the list is for reading what a trade covers and what it costs,
 * and this is for finding the one you already have in mind, which the eye does
 * faster across rows of marks than down a column of paragraphs.
 */
export default function Categories() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { services } = useJobs();

    return (
        <View style={s.page}>
            <PageHeader title="All services" />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + space.xxl,
                }}
                showsVerticalScrollIndicator={false}
            >
                {!services.length ? (
                    <View style={{ marginTop: space.xxl }}>
                        <Empty
                            icon="wifi-off"
                            title="The list is not loading"
                            hint="Pull down on the home screen to try again."
                        />
                    </View>
                ) : (
                    <View style={s.grid}>
                        {tilesFor(services).map((tile) => (
                            <Pressable
                                key={tile.key}
                                onPress={() => router.push(tile.to)}
                                android_ripple={null}
                                style={({ pressed }) => [s.tile, pressed ? { opacity: 0.7 } : null]}
                            >
                                {/*
                                  * A square with a gradient ground, not a disc.
                                  *
                                  * Mohan asked for both: the tile squared off,
                                  * and the wash behind the mark graded rather
                                  * than flat - the same treatment every button
                                  * in these apps carries, which is what stops a
                                  * filled shape reading as a rectangle somebody
                                  * coloured in.
                                  */}
                                <LinearGradient
                                    colors={rampFor(colors.accentTint, 0.5, 0.06)}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={s.tileIcon}
                                >
                                    <Icon name={tile.icon} size={24} color={colors.field} />
                                </LinearGradient>

                                <Small style={s.tileName} numberOfLines={2}>{tile.label}</Small>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    // A quarter of the row rather than a measured width, so the grid survives a
    // rotation and a tablet without being told the screen size.
    grid: { flexDirection: "row", flexWrap: "wrap", marginTop: space.sm },
    tile: { width: "25%", alignItems: "center", paddingVertical: space.md, gap: space.sm },
    tileIcon: {
        width: 62, height: 62,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    tileName: {
        fontSize: 11.5,
        lineHeight: 15,
        textAlign: "center",
        color: colors.inkSoft,
        fontFamily: font.medium,
    },
});
