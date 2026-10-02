import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { ik } from "./brand";
import { useNotices } from "./notices";
import { font, radius, shadowFor, space, useColors, useThemedStyles } from "./theme";
import { Small, Title } from "./ui";

/**
 * The office's posters, above the rest of the home screen.
 *
 * A festival, an offer, a trade worth pushing this month - the things a company
 * would put in a window. They are pictures the office uploads to ImageKit and
 * pastes the link for, so a campaign is an afternoon rather than a release.
 *
 * It moves on its own, which is the one piece of content in either app allowed
 * to. The rule here has been that only navigation animates and page content
 * holds still, because these apps have to stay smooth on cheap Android phones -
 * and that rule is kept in the way this is built rather than broken. There is
 * no Animated value and no layout being recalculated: it is a paged ScrollView
 * being told to scroll, which Android runs on its own thread, and it stops
 * entirely the moment a finger touches it or the poster count drops to one.
 */

/** Long enough to read a poster, short enough that nobody waits on the next. */
const EVERY_MS = 5000;

export const Posters = () => {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const { posters, reload } = useNotices();

    /*
     * Read again every time this screen comes to the front.
     *
     * The list was fetched once when the app started and again when it came
     * back from the background, which left a poster the office had just put up
     * invisible to anybody whose app was already open - Mohan had to close it
     * and reopen it to see his own change. Coming back to the home tab is the
     * natural moment to ask, it is one small request, and it costs nothing on
     * the many visits where nothing has changed.
     *
     * Not a timer. Nothing in these apps polls; this is the same rule the rest
     * of them follow, which is to ask at the moment somebody is looking.
     */
    useFocusEffect(useCallback(() => { reload(); }, [reload]));

    const { width } = useWindowDimensions();

    // The card is the screen less the page's own side margins, and the gap
    // between two of them rides inside the page so each one lands square.
    const page = width - space.lg * 2;

    const scroller = useRef(null);
    const [at, setAt] = useState(0);

    /*
     * Held still while somebody is working the carousel themselves.
     *
     * A poster sliding away under a thumb that was halfway through dragging it
     * back is the thing that makes an auto-carousel infuriating, and it is
     * worse on a slow phone where the drag is already fighting for frames.
     */
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (touched || posters.length < 2) return undefined;

        const timer = setInterval(() => {
            setAt((current) => {
                const next = (current + 1) % posters.length;
                scroller.current?.scrollTo({ x: next * page, animated: true });
                return next;
            });
        }, EVERY_MS);

        return () => clearInterval(timer);
    }, [touched, posters.length, page]);

    if (!posters.length) return null;

    const open = (poster) => {
        const action = poster.action || {};

        if (action.kind === "service" && action.serviceKey) {
            router.push("/service/" + action.serviceKey);
        } else if (action.kind === "url" && action.url) {
            Linking.openURL(action.url).catch(() => { /* a dead link is not a crash */ });
        }
    };

    return (
        <View style={s.wrap}>
            {/* The row the reference heads its offer carousel with. Only drawn
                when there is more than one, because "See all" over a single
                poster leads to a page showing that same poster. */}
            {posters.length > 1 ? (
                <View style={s.head}>
                    <Title style={{ fontSize: 17 }}>Offers for you</Title>

                    <Pressable
                        onPress={() => router.push("/offers")}
                        hitSlop={8}
                        android_ripple={null}
                    >
                        <Small style={s.seeAll}>See all</Small>
                    </Pressable>
                </View>
            ) : null}

            <ScrollView
                ref={scroller}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                onTouchStart={() => setTouched(true)}
                onMomentumScrollEnd={(e) => {
                    setAt(Math.round(e.nativeEvent.contentOffset.x / page));
                }}
            >
                {posters.map((poster) => (
                    <Pressable
                        key={poster.id}
                        onPress={() => open(poster)}
                        disabled={(poster.action?.kind || "none") === "none"}
                        android_ripple={null}
                        style={{ width: page }}
                    >
                        <View style={s.card}>
                            <Image
                                source={{ uri: ik(poster.imageUrl, "w-900") }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={200}
                                recyclingKey={poster.id}
                                style={s.picture}
                            />

                            {/*
                              * The title only when the artwork has not said it
                              * already.
                              *
                              * Most posters are designed whole - the words are
                              * part of the picture - and a caption bar under
                              * one of those repeats it in a second typeface.
                              * The office leaves the title off a poster that
                              * carries its own.
                              */}
                            {poster.body ? (
                                <View style={s.caption}>
                                    <Small style={s.captionTitle} numberOfLines={1}>{poster.title}</Small>
                                    <Small style={s.captionBody} numberOfLines={1}>{poster.body}</Small>
                                </View>
                            ) : null}
                        </View>
                    </Pressable>
                ))}
            </ScrollView>

            {/*
              * Where you are in the set.
              *
              * Only worth drawing when there is more than one - a single dot
              * under a single poster tells nobody anything and looks like a
              * speck of dirt on the screen.
              */}
            {posters.length > 1 ? (
                <View style={s.dots}>
                    {posters.map((poster, i) => (
                        <View
                            key={poster.id}
                            style={[
                                s.dot,
                                i === at ? { backgroundColor: colors.accent, width: 16 } : null,
                            ]}
                        />
                    ))}
                </View>
            ) : null}
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    head: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: space.md,
        marginBottom: space.md,
    },
    seeAll: { fontFamily: font.semibold, fontSize: 13, color: colors.accent },

    wrap: { marginTop: space.xl },

    /*
     * Squarer, taller, and lifted off the page.
     *
     * A 24 point corner on a poster reads as a sticker; at half that the
     * artwork keeps its own edges and the card stops competing with the rounded
     * tiles under it. The shadow is what Mohan asked for and it is the right
     * call here - this is the one thing on the home screen that is meant to
     * look like it is sitting on top of the page rather than printed on it.
     */
    card: {
        borderRadius: radius.sm + 4,
        overflow: "hidden",
        backgroundColor: colors.iconSurface,
        borderWidth: 1,
        borderColor: colors.hairline,
        ...shadowFor(colors),
    },

    // Taller than it was, on Mohan's reading, but still short enough that the
    // first row of trades shows under it - a poster that fills the fold turns
    // the home page into an advertisement.
    picture: { width: "100%", height: 186 },

    caption: {
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        backgroundColor: colors.inverse,
    },
    captionTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.onInverse },
    captionBody: { fontSize: 11.5, color: colors.onInverse, opacity: 0.8 },

    dots: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 5,
        marginTop: space.md,
    },
    dot: {
        width: 6, height: 6,
        borderRadius: 3,
        backgroundColor: colors.hairlineStrong,
    },
});
