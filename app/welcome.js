import { useRef, useState } from "react";
import {
    Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    AT_THE_DOOR, HERO, HERO_TEAM, ik, LOGO, ON_THE_WAY, THE_BILL,
} from "../src/brand";
import { recordIntro } from "../src/intro";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { Art, Button, Display, Greeting, Lede } from "../src/ui";
import { Icon } from "../src/Icon";

/**
 * The company's own opening, then the job explained end to end.
 *
 * The first page is the argument - the team, the claim, one button. Behind it
 * are the five steps of a job, in the same order and the same words as the
 * website's own How it works, for anybody who wants them before handing over a
 * phone number. Somebody who read that page and installed the app should
 * recognise it.
 *
 * This is the layout Mohan kept. It was rebuilt once into the reference kit's
 * shape - a picture filling the top with a white sheet sliding over it - and he
 * looked at it and asked for this one back. The difference is that here the
 * picture sits on the page rather than under a panel, so the artwork is the
 * screen instead of being a header above the words.
 *
 * There is deliberately no way past this to WhatsApp. Every channel this
 * company runs asks for a registration first, and offering an unregistered
 * customer a shortcut into the one channel that cannot ask for one would put
 * jobs in the office's queue with nobody's name on them.
 */
const STEPS = [
    {
        photo: HERO_TEAM,
        icon: "message-square",
        tint: "sky",
        eyebrow: "You start it",
        title: "You tell us what is wrong",
        body:
            "In the app, on WhatsApp, or to the AI assistant - in Odia, Hindi or English. You do not "
            + "have to work out which trade it falls under. Describing the problem in your own words "
            + "is enough.",
    },
    {
        photo: HERO,
        icon: "user-check",
        tint: "leaf",
        eyebrow: "The office decides",
        title: "We send somebody near you",
        body:
            "An approved engineer from our own team who does that work and is closest to your "
            + "address. You get their name, their photograph and their number before they set off. "
            + "Never an unknown person at the door.",
    },
    {
        photo: ON_THE_WAY,
        icon: "map-pin",
        tint: "sky",
        eyebrow: "On the way",
        title: "Watch them come to you",
        body:
            "You see where the engineer has got to and roughly when they will reach you, the same "
            + "way you watch a delivery. No waiting in all afternoon for somebody who might arrive.",
    },
    {
        photo: AT_THE_DOOR,
        icon: "key",
        tint: "sand",
        eyebrow: "At the door",
        title: "Two codes, read out by you",
        body:
            "Nothing begins and nothing closes without a code from your phone. That is what stops a "
            + "job being marked done when it is not, and it is why nobody can start work you have "
            + "not agreed to.",
    },
    {
        photo: THE_BILL,
        icon: "file-text",
        tint: "leaf",
        eyebrow: "And the money",
        title: "One bill, priced in front of you",
        body:
            "Itemised, agreed at the door before the work starts, and paid in cash or online "
            + "however suits you. No figure appears on it that you have not already seen.",
    },
];

export default function Welcome() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const pager = useRef(null);
    const [page, setPage] = useState(0);
    const [leaving, setLeaving] = useState(false);

    const last = STEPS.length;

    const goTo = (next) => {
        setPage(next);
        pager.current?.scrollTo({ x: next * width, animated: true });
    };

    const enter = async () => {
        setLeaving(true);

        // Remembered before leaving, so the introduction is shown once per
        // phone rather than once per sign-in.
        await recordIntro();
        router.replace("/login");
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            <ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setPage(
                    Math.round(e.nativeEvent.contentOffset.x / width),
                )}
                style={{ flex: 1 }}
            >
                {/* ---------------- 0. the argument ---------------- */}
                <View style={[s.page, { width, paddingTop: insets.top }]}>
                    {/*
                      * The team, before a word of it.
                      *
                      * The whole promise of this company is that a named,
                      * uniformed person comes to your door rather than whoever
                      * answers a number written on a wall. A photograph of that
                      * person makes the argument before the headline gets a
                      * chance to.
                      */}
                    <Hero src={HERO_TEAM} icon="users" tint="sand" />

                    <View style={s.stamp}>
                        <View style={s.stampMark}>
                            <Image
                                source={{ uri: ik(LOGO, "w-72") }}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                style={{ width: 14, height: 14 }}
                            />
                        </View>
                        <Text style={s.stampText}>COSMOSGEN CARE</Text>
                    </View>

                    <Display style={s.headline}>
                        Someone who can actually fix it, at your door
                    </Display>

                    <Lede style={s.blurb}>
                        Background-checked, uniformed engineers for your home in Bhubaneswar.
                        No random third-party handoffs.
                    </Lede>

                    <View style={s.vouch}>
                        <Icon name="check-circle" size={13} color={colors.accent} />
                        <Text style={s.vouchText}>100% in-house verified pros</Text>
                    </View>
                </View>

                {/* ---------------- 1 to 5. how a job runs ---------------- */}
                {STEPS.map((step) => (
                    <View
                        key={step.title}
                        style={[s.page, { width, paddingTop: insets.top }]}
                    >
                        <Hero src={step.photo} icon={step.icon} tint={step.tint} />

                        <View style={{ marginTop: space.lg }}>
                            <Greeting>{step.eyebrow}</Greeting>
                            <Display style={{ marginTop: space.sm, fontSize: 29, lineHeight: 34 }}>
                                {step.title}
                            </Display>
                            <Lede style={{ marginTop: space.md }}>{step.body}</Lede>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* ---------------- the controls ---------------- */}
            <View style={[s.dock, { paddingBottom: insets.bottom + space.lg }]}>
                {/*
                  * Where you are, as six marks rather than six numbers.
                  *
                  * The one you are on widens instead of merely brightening: on a
                  * phone held at arm's length two dots of slightly different
                  * grey are two dots, and shape survives sunlight in a way
                  * colour does not.
                  */}
                <View style={s.dots}>
                    {[0, ...STEPS.map((_, i) => i + 1)].map((i) => (
                        <View key={i} style={[s.dot, page === i ? s.dotOn : null]} />
                    ))}
                </View>

                {page === last ? (
                    <Button icon="arrow-right" busy={leaving} onPress={enter}>
                        Get my number verified
                    </Button>
                ) : (
                    <Button icon="arrow-right" onPress={() => goTo(page + 1)}>
                        {page === 0 ? "Get started" : "Next"}
                    </Button>
                )}

                <Pressable
                    onPress={enter}
                    hitSlop={8}
                    style={s.already}
                    android_ripple={null}
                >
                    <Text style={s.alreadyText}>
                        {page === 0 ? "Already have an account? " : "Skip the tour. "}
                    </Text>
                    <Text style={s.signIn}>Sign in</Text>
                </Pressable>
            </View>
        </View>
    );
}

/**
 * The opening picture, framed the way the design frames it.
 *
 * Three things, all of which were wrong before. It is four-by-three rather than
 * a fixed height, so it keeps its proportion on a tall handset and a short one
 * instead of becoming the square Mohan objected to. Only its bottom corners are
 * rounded, because it runs off the top of the screen - a shape with four
 * rounded corners floating below a gap reads as a picture somebody pasted onto
 * the page. And it fades out along its bottom edge into the paper, so the
 * photograph ends by becoming the page rather than by stopping.
 */
const Hero = ({ src, icon, tint }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    return (
        <View style={s.hero}>
            <Art
                src={src}
                icon={icon}
                iconSize={54}
                tint={tint}
                tr="w-800"

                // Cutout artwork, wider than this frame - see `Art`.
                fit="contain"
                radius={0}
                style={{ width: "100%", aspectRatio: 4 / 3 }}
            />

            <LinearGradient
                pointerEvents="none"
                colors={["transparent", colors.canvas]}
                style={s.fade}
            />
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    page: { paddingHorizontal: space.lg },

    hero: {
        borderBottomLeftRadius: radius.lg,
        borderBottomRightRadius: radius.lg,
        overflow: "hidden",
        marginHorizontal: -space.lg,
    },
    fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 72 },

    stamp: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginTop: space.xl,
        paddingLeft: 5,
        paddingRight: space.md,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    stampMark: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    stampText: {
        fontFamily: font.bold,
        fontSize: 10.5,
        letterSpacing: 0.8,
        color: colors.ink,
    },

    headline: { marginTop: space.lg, textAlign: "center", fontSize: 30, lineHeight: 36 },
    blurb: { marginTop: space.md, textAlign: "center" },

    vouch: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: space.lg,
        paddingHorizontal: space.md,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: colors.accentTint,
    },
    vouchText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.accentDeep },

    dock: { paddingHorizontal: space.lg, paddingTop: space.lg },

    dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: space.lg },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.hairlineStrong },
    dotOn: { width: 18, backgroundColor: colors.field },

    already: { flexDirection: "row", justifyContent: "center", marginTop: space.md },
    alreadyText: { fontFamily: font.body, fontSize: 13, color: colors.inkSoft },
    signIn: { fontFamily: font.semibold, fontSize: 13, color: colors.field },
});
