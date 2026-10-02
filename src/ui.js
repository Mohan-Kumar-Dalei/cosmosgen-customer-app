import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
/*
 * expo-image rather than React Native's own.
 *
 * Every picture here comes off ImageKit over somebody's mobile data, and the
 * built-in Image keeps remote pictures in memory only - leave a screen and
 * come back and the whole catalogue is fetched again. This one holds them on
 * disk as well, so the second look is instant and costs nothing, and it fades
 * each one in instead of snapping it into place.
 */
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { ik } from "./brand";
import { cardFor, font, radius, rampFor, shadowFor, space, useColors, useThemedStyles } from "./theme";
import { Icon } from "./Icon";

/* ==================================================================
   TYPE
   The site sets three sizes of display type and one of body. Anything
   that needs a fourth is usually a sign the screen is saying too much.
   ================================================================== */

/*
 * All five take `numberOfLines`, and three of them did not.
 *
 * This is the whole of what Mohan kept calling broken text. A caller would
 * write `<Title numberOfLines={1}>` on a name sitting beside a badge, the prop
 * was dropped on the floor, and the name wrapped to three lines inside a
 * column narrow enough for one - so the card grew, the badge beside it no
 * longer lined up with anything, and every screen carrying that card looked
 * as though its layout had come apart.
 *
 * It was never a styling problem. It was three components quietly ignoring
 * the one instruction that stops text doing this.
 */
export const Display = ({ children, style, numberOfLines }) => {
    const s = useThemedStyles(makeStyles);
    return <Text numberOfLines={numberOfLines} style={[s.display, style]}>{children}</Text>;
};

export const Title = ({ children, style, numberOfLines }) => {
    const s = useThemedStyles(makeStyles);
    return <Text numberOfLines={numberOfLines} style={[s.title, style]}>{children}</Text>;
};

export const Lede = ({ children, style, numberOfLines }) => {
    const s = useThemedStyles(makeStyles);
    return <Text numberOfLines={numberOfLines} style={[s.lede, style]}>{children}</Text>;
};

export const Body = ({ children, style, numberOfLines }) => {
    const s = useThemedStyles(makeStyles);
    return <Text numberOfLines={numberOfLines} style={[s.body, style]}>{children}</Text>;
};

export const Small = ({ children, style, numberOfLines }) => {
    const s = useThemedStyles(makeStyles);
    if (!children) return null;
    return <Text numberOfLines={numberOfLines} style={[s.small, style]}>{children}</Text>;
};

/**
 * The little uppercase line that divides one section from the next.
 *
 * Tracked-out capitals are a horizontal rule made of letters: they are read as
 * furniture rather than as words, which is exactly what a divider wants to be.
 * Used between sections, that is right. Used at the top of a screen to say
 * hello to somebody, it is a notice board - see Greeting below, which is what
 * every page heading in this app now opens with instead.
 */
export const Eyebrow = ({ children, tone, style }) => {
    const s = useThemedStyles(makeStyles);
    return <Text style={[s.eyebrow, tone ? { color: tone } : null, style]}>{children}</Text>;
};

/**
 * The line above a page's heading, in the voice of somebody talking.
 *
 * Every screen in this app used to open on an Eyebrow - nine point, bold,
 * uppercase, letter-spaced - so the first thing a customer read was HELLO,
 * MOHAN or YOUR ACCOUNT, set the way a municipal form sets APPLICANT NAME.
 * Four screens deep that is no longer a style, it is the register of the whole
 * app, and it is the single reason it read as something issued by an office
 * rather than something a company made.
 *
 * Same words, same place, sentence case.
 */
export const Greeting = ({ children, style }) => {
    const s = useThemedStyles(makeStyles);
    if (!children) return null;
    return <Text style={[s.greeting, style]}>{children}</Text>;
};

/* ==================================================================
   SURFACES
   ================================================================== */

export const Card = ({ children, style, tone }) => {
    const s = useThemedStyles(makeStyles);

    return (
        <View style={[s.card, tone ? { backgroundColor: tone, borderColor: "transparent" } : null, style]}>
            {children}
        </View>
    );
};

/** A hairline, used instead of a border wherever one rule is enough. */
export const Rule = ({ style }) => {
    const s = useThemedStyles(makeStyles);
    return <View style={[s.rule, style]} />;
};

/* ==================================================================
   THE ARTWORK
   Every picture in the set is a cutout on a transparent ground, so it
   is sat on a tinted panel rather than cropped to fill a frame - a
   cutout cropped to a box loses its feet. Until it loads, and if it
   never arrives, the panel and its icon stand in: nothing here ever
   shows a torn-page symbol.
   ================================================================== */

export const Art = ({ src, icon = "image", iconSize = 24, tint = "sky", tr = "w-400", fit = "cover", style, radius: r = radius.lg }) => {
    const colors = useColors();
    const wash = colors.art[tint] || colors.art.sky;

    /*
     * The icon stands in for the picture; it does not sit behind it.
     *
     * It is drawn only while there is nothing else to look at: no picture at
     * all, or one that has not arrived yet. The wash behind it is the same
     * reason - it is what fills the space until the drawing lands, and what
     * shows through the corners of one that does not quite fill it.
     */
    const [loaded, setLoaded] = useState(false);

    return (
        <LinearGradient
            colors={wash}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[{ borderRadius: r, overflow: "hidden", alignItems: "center", justifyContent: "center" }, style]}
        >
            {!src || !loaded ? (
                <Icon
                    name={icon}
                    size={iconSize}
                    color={colors.inkFaint}
                    style={{ position: "absolute", opacity: 0.5 }}
                />
            ) : null}

            {src ? (
                <Image
                    source={{ uri: ik(src, tr) }}

                    /*
                     * Filled by default, fitted where the caller says so.
                     *
                     * The service artwork used to be cutouts on a transparent
                     * ground, so `contain` was right - the tint behind them was
                     * the background. Mohan replaced that set with pictures
                     * carrying their own, and a picture with a background
                     * sitting inside a differently coloured box with bars down
                     * either side is two backgrounds arguing. So cover is the
                     * default now.
                     *
                     * The welcome carousel is still the old cutout artwork and
                     * still wants the tint to be its background: the team
                     * drawing is wider than the frame it sits in, and filling
                     * that frame takes the tops of their heads off. Those
                     * callers ask for `contain` rather than this component
                     * trying to guess which kind of picture it was handed.
                     */
                    contentFit={fit}
                    cachePolicy="memory-disk"
                    transition={220}

                    // Named, so a row scrolling in a list is told the picture
                    // in it has changed rather than showing the previous row's
                    // for a frame.
                    recyclingKey={src}
                    onLoad={() => setLoaded(true)}
                    style={{ width: "100%", height: "100%" }}
                />
            ) : null}
        </LinearGradient>
    );
};

/**
 * The picture, mounted the way Mohan drew it.
 *
 * His sketch is three shapes: a tinted panel, a second rounded rectangle
 * inset inside it holding the image, and a circle sitting on that inner
 * rectangle's top-left corner with the trade's icon in it. The inset is what
 * makes it read as a mounted photograph rather than a picture cropped to the
 * edge of a card - the panel is a mount board, and the circle is the label
 * pinned to it.
 *
 * The image is clipped with `overflow: hidden` and a radius rather than
 * masked through @react-native-masked-view. A mask is a second offscreen
 * layer composited every frame, on a screen that can hold seven of these at
 * once, on the cheap handsets this app has to keep working on. A rounded clip
 * costs nothing and is the same picture.
 *
 * The circle is drawn over the artwork, never under it: these drawings are
 * cutouts, and an icon behind one shows through the gaps between an arm and a
 * body.
 */
export const IconArt = ({
    src, icon = "image", tint = "sky", tr = "w-420", fit = "cover",
    height = 120, chip = true, corner, style,
}) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    return (
        <View style={[s.mount, style]}>
            <Art src={src} icon={icon} tint={tint} tr={tr} fit={fit} radius={radius.md} style={{ height }} />

            {chip ? (
                <View style={s.artChip}>
                    <Icon name={icon} size={16} color={colors.accent} />
                </View>
            ) : null}

            {/* Whatever the card wants on the far corner - a rating, a
                distance, how long the trade takes. */}
            {corner ? <View style={s.artCorner}>{corner}</View> : null}
        </View>
    );
};

/**
 * What the work is likely to come to, written as money rather than as a field.
 *
 * Two figures with a rule between them, the rule drawn rather than typed: a
 * hyphen between two numbers reads as a form asking for a minimum and a
 * maximum, and an en dash at this size is a speck. A line has length, which is
 * what a range is.
 *
 * The rupee sign is set smaller than the digits and lifted off the baseline,
 * the way a price is set in print. It is the one detail that separates a
 * number somebody typed from a number somebody laid out.
 */
export const PriceRange = ({ range, size = "lg", align = "left" }) => {
    const s = useThemedStyles(makeStyles);
    const small = size === "sm";

    const Figure = ({ value }) => (
        <View style={s.figure}>
            <Text style={[s.rupee, small ? s.rupeeSm : null]}>₹</Text>
            <Text style={[s.amount, small ? s.amountSm : null]}>
                {Number(value).toLocaleString("en-IN")}
            </Text>
        </View>
    );

    return (
        <View style={[
            s.priceRow,
            small ? { gap: space.sm } : null,
            align === "center" ? { justifyContent: "center" } : null,
            align === "right" ? { justifyContent: "flex-end" } : null,
        ]}>
            <Figure value={range.from} />

            {!range.single ? (
                <>
                    <View style={[s.priceRule, small ? s.priceRuleSm : null]} />
                    <Figure value={range.to} />
                </>
            ) : null}
        </View>
    );
};

/* ==================================================================
   CONTROLS
   A press is the one thing that is allowed to animate: it is direct
   feedback on something a thumb is touching, not decoration on a page.
   ================================================================== */

/*
 * A press dims. It used to bounce, and the bounce was the problem.
 *
 * This was a spring down to 0.97 and back, with a little overshoot on the way
 * - which reads as the button pulsing under the thumb rather than responding
 * to it, and was asked to go. Nothing that big-and-busy does this: a tap on
 * Meesho or Flipkart dips and returns, flat and immediate.
 *
 * Opacity through Pressable's own `pressed` flag rather than an Animated
 * value, so there is no animation driver, no wrapper view around every button
 * on the screen, and no work at all until a thumb lands. Android keeps its
 * ripple on top, which is the feedback that platform expects anyway.
 */
const PRESSED = 0.72;

/*
 * Every filled button is a gradient, the way the site's WhatsApp button is.
 *
 * Light at the top left, the colour itself in the middle, deeper at the bottom
 * right - a surface with light falling across it rather than a rectangle
 * filled in. rampFor() in theme.js works the three stops out from the tone's
 * own colour, so both themes and every tone stay in step with the palette.
 *
 * The quiet tone gets a far shallower one - it is a second choice and must not
 * start competing with the first - and a plain button gets none at all,
 * because it is a link that happens to be shaped like a button and has no fill
 * to grade.
 */

/**
 * `tone` is what the button is for, not what colour it is:
 *   field  - the one thing this screen is asking for
 *   brand  - money, confirming, anything finished
 *   quiet  - a second option that must not compete with the first
 *   plain  - a link that happens to be a button
 *
 * `icon` takes a Feather name and `mark` takes a drawn one - the WhatsApp
 * glyph, the assistant's star - for the two buttons where the real mark is the whole
 * point and a generic bubble would be a worse drawing of the same thing.
 */
export const Button = ({
    children, onPress, tone = "field", icon, mark: Mark, busy, disabled, full = true, style, small,
}) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const palette = {
        field: { bg: colors.field, ink: colors.fieldInk, border: "transparent", ramp: rampFor(colors.field) },
        brand: { bg: colors.brand, ink: "#ffffff", border: "transparent", ramp: rampFor(colors.brand) },
        quiet: { bg: colors.surface, ink: colors.ink, border: colors.hairlineStrong, ramp: rampFor(colors.surface, 0, 0.045) },
        plain: { bg: "transparent", ink: colors.accent, border: "transparent", ramp: null },
    }[tone];

    const off = busy || disabled;

    return (
        <View style={[full ? { alignSelf: "stretch" } : null, style]}>
            <Pressable
                onPress={off ? undefined : onPress}
                /*
                 * `foreground` matters now that there is a gradient.
                 *
                 * The ripple is drawn on the Pressable's own background, and
                 * the gradient covers that completely - so the ripple was
                 * about to start happening underneath it, where nobody could
                 * see it. Drawn in the foreground it lands over the fill,
                 * which is where Android puts it anyway.
                 */
                // No ripple. See Row above - this app says "pressed" with a
                // dim and nothing else, so that one gesture has one answer.
                android_ripple={null}
                style={({ pressed }) => [
                    s.button,
                    small ? { height: 42, paddingHorizontal: space.lg } : null,
                    {
                        backgroundColor: palette.bg,
                        borderColor: palette.border,
                        opacity: off ? 0.55 : (pressed ? PRESSED : 1),
                    },
                    tone !== "plain" ? shadowFor(colors) : null,
                ]}
            >
                {palette.ramp ? (
                    <LinearGradient
                        colors={palette.ramp}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                ) : null}

                {busy ? (
                    <ActivityIndicator size="small" color={palette.ink} />
                ) : (
                    <>
                        {Mark ? <Mark size={17} color={palette.ink} /> : null}
                        {!Mark && icon ? <Icon name={icon} size={17} color={palette.ink} /> : null}
                        <Text style={[s.buttonText, { color: palette.ink }, small ? { fontSize: 14 } : null]}>
                            {children}
                        </Text>
                    </>
                )}
            </Pressable>
        </View>
    );
};

/**
 * The graded fill, on its own, for a control that is not a Button.
 *
 * Four of them are built by hand rather than from Button - the round arrow in
 * the area card, the send key on the chat, and the call buttons on the job and
 * tracking screens. They are circles with one icon in them, which Button does
 * not do, and every one of them was a flat disc. This gives them the same
 * light as everything else without pretending they are the same component.
 *
 * Drop it in as the first child, and give the control `overflow: "hidden"` so
 * the fill takes the shape of its corners.
 */
export const GradientFill = ({ color, lift, drop }) => (
    <LinearGradient
        colors={rampFor(color, lift, drop)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
    />
);

/** A row that is really a button - the pattern the whole site is built on. */
/**
 * Anything that is pressed but is not a button.
 *
 * A dim, and only a dim. There used to be an Android ripple under here as
 * well, and on a whole card that is a circle of colour expanding out from
 * wherever the thumb landed - which Mohan read, correctly, as the card
 * pulsing at him. A ripple is right on a 48pt button and wrong on a 300pt
 * card, and rather than keep two rules the app now keeps one: press dims,
 * everywhere, immediately, with nothing travelling across anything.
 */
export const Row = ({ children, onPress, style }) => (
    <View style={style}>
        <Pressable
            onPress={onPress}
            style={({ pressed }) => (pressed ? { opacity: PRESSED } : null)}
        >
            {children}
        </Pressable>
    </View>
);

/** A choice, as a pill. Selected pills carry the field colour, not grey. */
/**
 * One choice among several, picked by tapping.
 *
 * A chosen chip used to differ from an unchosen one by a pale tint and a
 * coloured border, which on a phone in daylight is close to no difference at
 * all - a customer picking three faults out of eight could not see at a glance
 * which three. It now fills with the accent and carries a tick, so what has
 * been chosen reads from arm's length and the list can be checked without
 * reading every word again.
 *
 * The tick replaces the chip's own icon rather than sitting beside it. Two
 * marks on a control this small is one too many, and the tick is the one
 * carrying the information.
 */
export const Chip = ({ children, selected, onPress, icon }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const mark = selected ? "check" : icon;

    return (
        <Pressable
            onPress={onPress}
            android_ripple={null}
            style={({ pressed }) => [
                s.chip,
                selected
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { backgroundColor: colors.surface, borderColor: colors.hairlineStrong },

                // A press dips rather than bounces, the same as every button.
                pressed && { opacity: PRESSED },
            ]}
        >
            {mark ? (
                <Icon name={mark} size={14} color={selected ? colors.white : colors.inkFaint} />
            ) : null}

            <Text style={[
                s.chipText,
                selected ? { color: colors.white, fontFamily: font.semibold } : null,
            ]}>
                {children}
            </Text>
        </Pressable>
    );
};

/** A state, as a badge: booked in, on the way, finished. */
export const Badge = ({ children, tone = "info" }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    const palette = {
        info: { bg: colors.infoTint, ink: colors.info },
        brand: { bg: colors.brandTint, ink: colors.brandDeep },
        warn: { bg: colors.warnTint, ink: colors.warn },
        danger: { bg: colors.dangerTint, ink: colors.danger },
        quiet: { bg: colors.sunken, ink: colors.inkSoft },
    }[tone];

    return (
        <View style={[s.badge, { backgroundColor: palette.bg }]}>
            <Text style={[s.badgeText, { color: palette.ink }]}>{children}</Text>
        </View>
    );
};

/* ==================================================================
   INPUT
   ================================================================== */

export const Field = ({ label, hint, prefix, style, inputStyle, ...props }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    return (
        <View style={style}>
            {label ? <Text style={s.label}>{label}</Text> : null}

            {/*
              * One box, with the prefix inside it.
              *
              * The prefix used to be a bordered box of its own sitting beside a
              * bordered input, and the two edges plus the input's own rounded
              * corner drew over each other - which is what made "+91" and the
              * number look stacked on top of one another.
              */}
            <View style={[s.fieldWrap, props.multiline ? s.fieldWrapMulti : null]}>
                {prefix ? (
                    <View style={s.prefixBox}>
                        <Text style={s.prefix}>{prefix}</Text>
                    </View>
                ) : null}

                <TextInput
                    placeholderTextColor={colors.inkFaint}
                    style={[s.input, props.multiline ? s.inputMulti : null, inputStyle]}
                    {...props}
                />
            </View>

            {hint ? <Small style={{ marginTop: space.xs }}>{hint}</Small> : null}
        </View>
    );
};

/** What went wrong, said once, where it happened. */
export const Notice = ({ children, tone = "danger" }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    if (!children) return null;

    const palette = {
        danger: { bg: colors.dangerTint, ink: colors.danger, icon: "alert-circle" },
        warn: { bg: colors.warnTint, ink: colors.warn, icon: "alert-triangle" },
        info: { bg: colors.infoTint, ink: colors.info, icon: "info" },
        brand: { bg: colors.brandTint, ink: colors.brandDeep, icon: "check-circle" },
    }[tone];

    return (
        <View style={[s.notice, { backgroundColor: palette.bg }]}>
            <Icon name={palette.icon} size={15} color={palette.ink} style={{ marginTop: 1.5 }} />
            <Text style={[s.noticeText, { color: palette.ink }]}>{children}</Text>
        </View>
    );
};

/** An empty list, explained. An empty list with no explanation reads as a bug. */
export const Empty = ({ icon = "inbox", title, hint, children }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    return (
        <View style={s.empty}>
            <View style={s.emptyIcon}>
                <Icon name={icon} size={22} color={colors.inkFaint} />
            </View>
            <Text style={s.emptyTitle}>{title}</Text>
            {hint ? <Small style={{ textAlign: "center", marginTop: space.xs }}>{hint}</Small> : null}
            {children ? <View style={{ marginTop: space.lg, alignSelf: "stretch" }}>{children}</View> : null}
        </View>
    );
};


/**
 * A question the app asks in its own words, on its own sheet.
 *
 * Never the platform's alert box. That dialog belongs to Android, looks like
 * every other app on the phone, and cannot carry a sentence explaining what is
 * about to happen - which is the only part worth reading.
 */
export const Confirm = ({
    open, title, body, badge,
    confirmLabel = "Yes, do it", cancelLabel = "Cancel",
    tone = "field", onConfirm, onCancel, busy,
}) => {
    const s = useThemedStyles(makeStyles);

    /*
     * Not mounted at all while it is closed, which is the black box.
     *
     * This used to sit here permanently as `<Modal visible={open}>`, and on
     * Android a Modal is not a view inside the page - it is a second native
     * window, created as soon as the component renders and kept whether or not
     * anything is drawn in it. A window belonging to a frozen tab paints a
     * frame with nothing in it on the way out, and an empty window is black.
     *
     * Returning null takes the window away with the question.
     */
    const rise = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!open) return undefined;

        rise.setValue(0);
        Animated.spring(rise, {
            toValue: 1,
            useNativeDriver: true,
            stiffness: 220,
            damping: 26,
            mass: 0.9,
        }).start();

        return undefined;
    }, [open, rise]);

    if (!open) return null;

    return (
        /*
         * The modal itself does not animate; the sheet inside it does.
         *
         * With `animationType="slide"` the whole window travels up from the
         * bottom - and the window includes the dark wash, so the dimming
         * arrived as a black rectangle sliding into view. Mohan called that
         * out three times and he was describing exactly what was happening.
         *
         * So the window appears at once with the blur and the dim already
         * covering the page, and only the white sheet rises. That is the
         * behaviour everywhere else on a phone: the app behind fades where it
         * stands, and the sheet is the thing that moves.
         */
        <Modal visible transparent animationType="none" onRequestClose={onCancel}>
            <Pressable style={s.scrim} onPress={busy ? undefined : onCancel}>
                {/*
                  * Blur behind the dim, not instead of it.
                  *
                  * A dark wash alone leaves the page perfectly legible and the
                  * eye keeps reading it; blurring alone on a pale screen barely
                  * registers. Together the page becomes texture and the sheet
                  * is the only thing with edges, which is the whole job of a
                  * scrim.
                  *
                  * `experimentalBlurMethod` is what makes it a blur on Android
                  * at all - without it expo-blur falls back to a flat
                  * translucent rectangle, which is the "black wrapper" this
                  * screen kept being accused of.
                  */}
                <BlurView
                    intensity={36}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />

                {/* Swallows the press so a tap inside the sheet does not close it */}
                <Pressable onPress={() => {}}>
                    <Animated.View
                        style={[
                            s.sheet,
                            {
                                transform: [{
                                    translateY: rise.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [340, 0],
                                    }),
                                }],
                            },
                        ]}
                    >
                        <View style={s.grabber} />

                        {/*
                          * What this question is about, named.
                          *
                          * "Remove this address?" is the question; the badge is
                          * which address. Without it the sheet covers the row
                          * somebody tapped and they are answering about a thing
                          * they can no longer see.
                          */}
                        {badge ? (
                            <View style={s.sheetBadge}>
                                <Small style={s.sheetBadgeText} numberOfLines={1}>{badge}</Small>
                            </View>
                        ) : null}

                        <Title>{title}</Title>
                        {body ? <Small style={{ marginTop: space.sm }}>{body}</Small> : null}

                        <View style={s.sheetButtons}>
                            <View style={{ flex: 1 }}>
                                <Button tone="quiet" onPress={onCancel} disabled={busy}>
                                    {cancelLabel}
                                </Button>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Button tone={tone} onPress={onConfirm} busy={busy}>
                                    {confirmLabel}
                                </Button>
                            </View>
                        </View>
                    </Animated.View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    /*
     * The design system's own scale, at its mobile sizes.
     *
     * headline-xl-mobile, headline-md, body-lg, body-md, body-sm - five steps
     * and no sixth. Anything that wants a size between two of these is usually
     * a screen saying too much, and the right fix is fewer words rather than
     * another entry here.
     *
     * The tracking is negative and gets tighter as the type gets bigger, which
     * is what stops a 32pt geometric face reading as loose at the top of a
     * 360dp screen.
     */
    display: {
        fontFamily: font.displayBold,
        fontSize: 32,
        lineHeight: 36,
        letterSpacing: -0.8,
        color: colors.ink,
    },
    title: {
        fontFamily: font.display,
        fontSize: 20,
        lineHeight: 26,
        letterSpacing: -0.3,
        color: colors.ink,
    },
    lede: {
        fontFamily: font.body,
        fontSize: 16,
        lineHeight: 25,
        color: colors.inkSoft,
    },
    body: {
        fontFamily: font.body,
        fontSize: 15,
        lineHeight: 22,
        color: colors.ink,
    },
    small: {
        fontFamily: font.body,
        fontSize: 13,
        lineHeight: 18,
        color: colors.inkSoft,
    },
    eyebrow: {
        fontFamily: font.bold,
        fontSize: 11,
        lineHeight: 15,
        letterSpacing: 1.8,
        textTransform: "uppercase",
        color: colors.inkFaint,
    },
    greeting: {
        fontFamily: font.medium,
        fontSize: 15,
        lineHeight: 20,
        color: colors.inkSoft,
    },

    /*
     * The mount board. Its padding is what insets the picture, and its own
     * corner is one step rounder than the picture's - a 16px corner inside a
     * 24px one keeps the two curves in step, which is the pairing the design
     * system asks for.
     */
    mount: {
        borderRadius: radius.md,
        backgroundColor: colors.sunkenSoft,
        overflow: "hidden",
    },

    /*
     * On the picture's top-left corner, half on and half off it.
     *
     * Centred inside the panel's padding it would sit in a corner of empty
     * board and read as an afterthought; straddling the edge it belongs to
     * both shapes, which is what makes the three pieces read as one object.
     */
    artChip: {
        position: "absolute",
        left: space.sm,
        top: space.sm,
        width: 34, height: 34,
        borderRadius: 17,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",

        // A disc on a photograph needs its own edge or it dissolves into a
        // light patch of the picture.
        borderWidth: 1,
        borderColor: colors.hairline,
    },

    artCorner: {
        position: "absolute",
        right: space.sm,
        bottom: space.sm,
    },

    priceRow: { flexDirection: "row", alignItems: "center", gap: space.md },
    figure: { flexDirection: "row", alignItems: "flex-start" },

    // Lifted and lightened. Full size and on the baseline it competes with the
    // digits; at this weight it is punctuation, which is what it is.
    rupee: {
        fontFamily: font.medium,
        fontSize: 14,
        lineHeight: 20,
        color: colors.inkSoft,
        marginTop: 3,
        marginRight: 1,
    },
    amount: {
        fontFamily: font.displayBold,
        fontSize: 24,
        lineHeight: 28,
        letterSpacing: -0.24,
        color: colors.ink,
    },

    // The range itself. Wide enough to read as "to" and thin enough not to be
    // mistaken for a divider between two separate prices.
    priceRule: {
        width: 22,
        height: 1.5,
        borderRadius: 1,
        backgroundColor: colors.hairlineStrong,
    },

    rupeeSm: { fontSize: 10.5, lineHeight: 15, marginTop: 2 },
    amountSm: { fontSize: 17, lineHeight: 21, letterSpacing: -0.4 },
    priceRuleSm: { width: 10 },

    card: cardFor(colors),
    rule: { height: 1, backgroundColor: colors.hairline },

    button: {
        height: 52,
        borderRadius: radius.pill,
        borderWidth: 1,
        paddingHorizontal: space.xl,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space.sm,
        overflow: "hidden",
    },
    buttonText: { fontFamily: font.semibold, fontSize: 15.5, letterSpacing: -0.1 },

    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 38,
        paddingHorizontal: space.md + 2,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    chipText: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 18, color: colors.ink },

    /*
     * Sized by what is in it, not to a fixed height.
     *
     * These were locked to 24 points with the text centred inside, which was
     * fine until the display face changed: Outfit and Plus Jakarta sit on
     * different baselines, and a line box taller than its container is
     * clipped rather than centred. Padding instead of height means the badge
     * is always exactly as tall as the words it holds, in any face, at any
     * system font size.
     */
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
    },
    badgeText: { fontFamily: font.bold, fontSize: 11, lineHeight: 15, letterSpacing: 0.2 },

    label: {
        fontFamily: font.semibold,
        fontSize: 13,
        color: colors.ink,
        marginBottom: space.sm,
    },
    /*
     * A dent in the page rather than a box drawn on it.
     *
     * This was a white rectangle with a 10px corner and a strong border - the
     * input every government portal on the internet is built out of, and there
     * are five of them between opening this app and having an engineer at the
     * door. Two things change it: the corner goes to 16, which is the same
     * family as the cards around it rather than a squarer thing sitting among
     * them, and the fill goes to the sunken tone so the field reads as
     * somewhere to put something instead of another panel.
     *
     * The sunken fill also solves a real problem: on the account screen these
     * sit inside a card, and now that a card is pure white a white field
     * inside it was a border with nothing either side of it.
     */
    fieldWrap: {
        flexDirection: "row",
        alignItems: "center",
        height: 54,
        borderWidth: 1,
        borderColor: colors.hairline,
        borderRadius: radius.md,
        backgroundColor: colors.sunken,
        overflow: "hidden",
    },
    fieldWrapMulti: { height: 112, alignItems: "flex-start" },

    prefixBox: {
        alignSelf: "stretch",
        justifyContent: "center",
        paddingHorizontal: space.md,

        // The one line between them, drawn once rather than as two borders
        // meeting. No fill of its own any more - the field it sits in is
        // already the tone the prefix box used to be.
        borderRightWidth: 1,
        borderRightColor: colors.hairline,
    },
    prefix: { fontFamily: font.semibold, fontSize: 15, color: colors.inkSoft },

    input: {
        flex: 1,
        alignSelf: "stretch",
        paddingHorizontal: space.md,
        fontFamily: font.body,
        fontSize: 15,
        color: colors.ink,
    },
    inputMulti: { paddingTop: space.md, paddingBottom: space.md, textAlignVertical: "top" },

    notice: {
        flexDirection: "row",
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.md,
        marginBottom: space.md,
    },
    noticeText: { flex: 1, fontFamily: font.body, fontSize: 13.5, lineHeight: 20 },

    scrim: {
        flex: 1,
        backgroundColor: "rgba(6, 10, 14, 0.28)",
        justifyContent: "flex-end",
    },

    // The handle every sheet on a phone has. It is not draggable here and does
    // not pretend to be - it is the mark that says which edge this came from.
    grabber: {
        alignSelf: "center",
        width: 40, height: 4,
        borderRadius: 2,
        backgroundColor: colors.hairlineStrong,
        marginTop: -space.md,
        marginBottom: space.lg,
    },

    // Side by side, with the quiet one first. The reference puts Cancel on the
    // left and the consequence on the right, which is the order a thumb
    // travelling from the middle of the screen meets them in.
    sheetButtons: { flexDirection: "row", gap: space.sm, marginTop: space.xl },

    sheetBadge: {
        alignSelf: "flex-start",
        maxWidth: "100%",
        paddingHorizontal: space.md,
        paddingVertical: 4,
        marginBottom: space.md,
        borderRadius: radius.sm + 2,
        backgroundColor: colors.accentTint,
    },
    sheetBadgeText: { fontFamily: font.semibold, fontSize: 12, color: colors.accentDeep },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: space.xl,
        paddingBottom: space.xxl,
        borderTopWidth: 1,
        borderColor: colors.hairline,
    },

    empty: { alignItems: "center", paddingVertical: space.xxl },
    emptyIcon: {
        width: 54, height: 54, borderRadius: 27,
        backgroundColor: colors.sunken,
        alignItems: "center", justifyContent: "center",
        marginBottom: space.md,
    },
    emptyTitle: { fontFamily: font.display, fontSize: 18, lineHeight: 24, color: colors.ink },
});
