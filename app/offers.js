import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ik } from "../src/brand";
import { useNotices } from "../src/notices";
import { PageHeader } from "../src/PageHeader";
import { font, radius, space, useThemedStyles } from "../src/theme";
import { Body, Empty, Small } from "../src/ui";

/**
 * Everything the office is advertising, not only the ones that fit on the home
 * screen.
 *
 * This is the destination behind "See all" on the carousel. The cards are the
 * office's own artwork rather than a template with a discount typed into it,
 * which is the one real difference from the reference kit - a poster here is a
 * picture somebody drew, so the picture is the card and there is no "Claim"
 * button to press. What a poster offers is arranged with the office, not
 * granted by tapping.
 *
 * A poster with somewhere to go says so by being tappable. One without is still
 * worth showing - "we are closed on Thursday" is an announcement rather than an
 * offer - and it simply does not respond to a press.
 */
export default function Offers() {
    const router = useRouter();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { posters } = useNotices();

    const open = (poster) => {
        const action = poster.action || {};

        if (action.kind === "service" && action.serviceKey) {
            router.push("/service/" + action.serviceKey);
        } else if (action.kind === "url" && action.url) {
            Linking.openURL(action.url).catch(() => { /* a dead link is not a crash */ });
        }
    };

    return (
        <View style={s.page}>
            <PageHeader title="Offers" />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + space.xxl,
                }}
                showsVerticalScrollIndicator={false}
            >
                {!posters.length ? (
                    <View style={{ marginTop: space.xxl }}>
                        <Empty
                            icon="tag"
                            title="Nothing running just now"
                            hint="When there is an offer or a festival week it appears here and on the home screen."
                        />
                    </View>
                ) : (
                    <View style={{ gap: space.md }}>
                        {posters.map((poster) => {
                            const tappable = (poster.action?.kind || "none") !== "none";

                            return (
                                <Pressable
                                    key={poster.id}
                                    onPress={() => open(poster)}
                                    disabled={!tappable}
                                    android_ripple={null}
                                    style={({ pressed }) => [
                                        s.card,
                                        pressed && tappable ? { opacity: 0.85 } : null,
                                    ]}
                                >
                                    <Image
                                        source={{ uri: ik(poster.imageUrl, "w-900") }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={200}
                                        recyclingKey={poster.id}
                                        style={s.picture}
                                    />

                                    {poster.body ? (
                                        <View style={s.words}>
                                            <Body style={s.title} numberOfLines={1}>
                                                {poster.title}
                                            </Body>
                                            <Small style={s.note} numberOfLines={2}>
                                                {poster.body}
                                            </Small>
                                        </View>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    card: {
        borderRadius: radius.lg,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    picture: { width: "100%", height: 160, backgroundColor: colors.iconSurface },

    words: { padding: space.lg },
    title: { fontFamily: font.semibold, fontSize: 15 },
    note: { marginTop: 2, fontSize: 12.5, lineHeight: 18 },
});
