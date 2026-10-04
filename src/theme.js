import { createContext, useContext, useMemo } from "react";
import { Platform, useColorScheme } from "react-native";

/**
 * The app's colours: the website's design language, on the vendor app's paper.
 *
 * The site's own tokens are cooler and whiter, and they are right on a laptop
 * looked at across a desk. A phone is held close, often in a dim room, and
 * that white is tiring - which is why the vendor app warmed its ground and why
 * Mohan asked for this one to match it. So the ground carries real yellow in
 * it and the cards sit just above the ground rather than being pure white
 * against it.
 *
 * What stays from the website is everything else that makes this the customer
 * side: the display face, the generous rounding, and colour used only where
 * somebody has to act.
 */
const light = {
    /*
     * Which theme this is, readable from a stylesheet.
     *
     * `useScheme()` answers the same question but only inside a component, and
     * the handful of places that genuinely differ between the two - a shadow
     * that has to disappear on a dark ground rather than be deepened - are all
     * in `makeStyles`, which is handed the palette and nothing else. Passing
     * the flag through the palette keeps those branches where the colours are.
     */
    isDark: false,

    /*
     * Paper and card, pulled apart on purpose.
     *
     * These used to be a shade of each other - #f4f1e9 under #fffdf7 - and at
     * that distance a card cannot hold its own edge, so a hairline had to be
     * drawn around everything to say where one thing stopped and the next
     * began. That is what made the app read like a form: the layout was being
     * carried by lines.
     *
     * A plain white card on warm paper separates by itself. The line is still
     * there, because Android cannot have the shadow that would replace it -
     * see shadowFor - but it is now a whisper under the card rather than the
     * thing holding it up.
     */
    /*
     * The design system's warm palette, not its token table.
     *
     * DESIGN.md carries two sets of values and they do not agree. The YAML at
     * the top is a Material export whose neutrals are cool - on-surface-variant
     * is #434655, a blue-grey, and outline is #747687 - and the prose section
     * underneath names the real thing: Warm Paper, Muted Sand, Deep Ink, Warm
     * Stone. Building from the YAML is what made the app look correct and feel
     * wrong, and Mohan spotted it immediately: every grey on the screen had
     * blue in it while the paper had yellow, so nothing sat on anything.
     *
     * The prose wins. Its greys carry the same warmth the canvas does, which
     * is the whole point of a warm palette - the neutrals have to belong to
     * the paper, not merely avoid clashing with it.
     */
    /*
     * The page itself takes the deeper tone, and everything follows it down.
     *
     * #ebe8e2 was tried on the chips first and the screen still read as white,
     * because the thing going white was never the chips - it was the page. A
     * card is pure white; at #fcf9f3 the paper under it was one per cent away
     * from white, which is not a difference a phone shows in daylight. So the
     * cards stopped being objects lying on paper and the whole screen became
     * one pale sheet with lines ruled on it.
     *
     * Mohan named #ebe8e2 twice and it was right for the app that existed
     * then - a page of cards on warm paper, where the paper had to be dark
     * enough for a card to lift off it without a shadow.
     *
     * The app has changed shape. The home screen now opens on a filled colour
     * band and the sections under it are white cards with real space between
     * them, which is the arrangement Mohan picked out of a reference kit; in
     * that arrangement the band and the cards do the separating and a ground
     * carrying eight per cent of anything competes with both. He asked for it
     * plainly - the page should be "halka safed" like the reference.
     *
     * So the ground came up to within four points of white and kept one point
     * of warmth, which is the difference between a page that reads as paper
     * and one that reads as a browser's default.
     */
    canvas: "#f5f4f1",          // the page: near white, a whisper warm

    /*
     * The card: off white, and only just.
     *
     * Pure #ffffff against warm paper reads as a different material - a sheet
     * of office paper dropped onto linen - so a point of warmth was put back
     * into it. The first attempt at that went too far: at #fdfbf7, and
     * especially with the icon grounds at #f3efe6 beside it, Mohan saw the
     * whole app go brown, in both themes.
     *
     * He is right, and the reason is that warmth on a large surface compounds.
     * Six points of yellow on a 34-point icon disc is a tint; the same six
     * points across a card that fills the screen is a colour.
     *
     * Now that the ground itself is near white, the card goes the whole way:
     * white on #f5f4f1 is a clean four points of separation, and any warmth
     * left in the card at this distance would read as a stain rather than as
     * a material. The warmth in this palette lives in the ground.
     */
    surface: "#ffffff",

    /*
     * What an icon, a thumbnail or a service drawing sits on.
     *
     * These used to take `sunken`, which is the colour of a field - a dent you
     * type into. An icon is not input, and a recess behind one makes the mark
     * look like it has fallen into the card.
     *
     * Near neutral for the same reason as the card above. It only has to be
     * visible against the card, and four points of lightness does that; the
     * beige it started at was carrying a hue as well, and a row of beige discs
     * is what turned the screen brown.
     *
     * The round category tiles on the home screen deliberately do not use
     * this - they take `accentTint`, a pale wash of the blue, which is what
     * the reference does with its own colour and what stops a row of eight
     * grey discs reading as a disabled keypad.
     */
    iconSurface: "#f2f1ee",

    /*
     * The recessed ladder, brought up with the page.
     *
     * These were mixed against an #ebe8e2 ground; left where they were, a chip
     * would now be darker than the page it sits on by more than the page is
     * darker than the card, and the layering reads inside out. Each one moved
     * by the same amount the ground did.
     */
    sunken: "#f0efec",          // chips, fields, recessed zones - on a card
    sunkenSoft: "#f8f7f5",      // the shallower one, for a whole band
    sunkenDeep: "#e8e6e1",      // a well inside a card

    // Lighter too. A border drawn for a darker page is a rule ruled across a
    // white one, which is what makes a screen of cards look like a form.
    hairline: "#e8e6e1",
    hairlineStrong: "#d6d3cc",

    ink: "#1a1a17",             // Deep Ink
    inkSoft: "#6e6d66",         // Warm Stone - secondary copy
    inkFaint: "#9b9890",        // and the quietest of the three

    /*
     * A confident blue rather than a utility one.
     *
     * #0f78d0 is the blue of a form you have to fill in - it is pale, it is
     * cyan-ish, and it reads as somebody else's software. This is the blue of
     * the uniform in the company's own drawings, and it is the one thing on
     * the screen allowed to shout.
     */
    /*
     * Deep blue, between Tailwind's 700 and 900.
     *
     * Three primaries came before it. Electric Royal Blue, which Mohan asked
     * to be rid of - it was the most saturated thing on every screen and made
     * the app read as software. A deep espresso, which was quiet where he
     * wanted confidence. A forest green, which was his own pick and still not
     * it. He named these two shades himself, and the reason they work where
     * the first blue did not is depth: #1d4ed8 is still bright enough to be a
     * highlighter across a whole header, #1e3a8a is nearly navy, and the point
     * between them is a blue that can carry a band without shouting from it.
     *
     * The difference from where this started is not hue, it is saturation. A
     * primary that has to fill the top fifth of every screen cannot be the
     * loudest thing on it, because then everything else - the logo green, the
     * done green, the terracotta warning - is arguing with the furniture.
     */
    accent: "#1e40af",          // between blue-700 and blue-900
    accentDeep: "#1e3a8a",      // blue-900, the pressed state
    accentTint: "#e8edfb",      // its palest wash
    accentEdge: "#c2cef2",

    /*
     * A whole band of colour rather than a button's worth: the primary button,
     * the tab badge, the bar the booking flow finishes on.
     */
    field: "#1e40af",
    fieldSoft: "#3156c4",
    fieldInk: "#f7f9fe",

    brand: "#17a03c",           // the logo green: money, done, confirmed
    brandDeep: "#128132",
    brandTint: "#e4f1e6",

    /*
     * Two greens that are not the logo's, and are not interchangeable.
     *
     * `ok` is the one the mockup uses to say a thing has happened - the code
     * has gone, the address is saved. `whatsapp` is WhatsApp's own teal, and
     * it appears on exactly one card in this app, the one that opens WhatsApp.
     * Borrowing another company's colour for our own "done" state is how a
     * palette stops meaning anything.
     */
    ok: "#059669",
    okTint: "#e6f4ee",

    /*
     * The dark lozenge, for a label that has to sit on a photograph.
     *
     * inverse-surface and inverse-on-surface from the design system. A white
     * chip on a picture competes with whatever pale part of it lands
     * underneath, and these drawings are pale nearly everywhere.
     */
    inverse: "#2e2b26",
    onInverse: "#f6f2ea",

    whatsapp: "#128c7e",
    whatsappTint: "#e5f1ea",

    panel: "#0d1a26",           // the navy the site's footer and dark bands use
    panelSoft: "#16293a",
    panelLine: "rgba(255, 255, 255, 0.09)",
    onPanel: "#9fb3c4",         // secondary text on those navy grounds

    /*
     * Terracotta rather than amber, which is the design system's own third
     * colour - kept for a local notice rather than for anything that has gone
     * wrong. Red is still red.
     */
    warn: "#7b2d18",            // Craft Terracotta
    warnTint: "#f7e2d8",

    /*
     * The colour a star is.
     *
     * Ratings were drawn in `warn`, which is terracotta - on a phone that
     * reads as dark red, and Mohan saw five rust-coloured stars where he
     * expected gold. A star is gold everywhere anybody has ever seen one, and
     * borrowing the palette's warning colour for it was making a rating look
     * like a fault.
     */
    star: "#f5a524",
    danger: "#ba1a1a",          // error
    dangerTint: "#ffdad6",      // error-container
    info: "#2d50cd",
    infoTint: "#e6eaff",

    white: "#ffffff",
    shadow: "#1a1a17",
    shadowOpacity: 0.06,

    /*
     * The tinted grounds the artwork sits on.
     *
     * Every drawing in the set is a cutout with nothing behind it, so the panel
     * underneath does the work a photograph's background would. Three of them,
     * rotated, so a column never reads as one tile.
     */
    art: {
        sky: ["#e6eaff", "#f6f2ea"],
        leaf: ["#e5f1ea", "#f6f2ea"],
        sand: ["#f4ece0", "#f6f2ea"],
        dark: ["#17293a", "#0d1a26"],
    },
};

/*
 * Warm, and with real steps between the layers.
 *
 * Not the light one inverted: inverting gives grey text on grey panels and a
 * brand green that glares. These carry a little brown in them - the same
 * warmth the paper theme has - and each layer is a step the eye can see.
 */
const dark = {
    canvas: "#141310",

    /*
     * The same move as in light, in the other direction.
     *
     * Warm, but only just - the same lesson the light theme learnt.
     *
     * #211e1a was almost neutral and read as grey on brown; #242019 fixed that
     * and overshot, and Mohan saw a brown app. Eleven points between the red
     * and blue channels is a colour at this size, not a tint. Four is warmth
     * you feel without being able to name it, which is what a card that fills
     * the screen should have.
     */
    surface: "#201f1d",

    // The ground under a mark, one step up from the card rather than one step
    // down: on a dark screen a recess disappears, and what an icon needs is
    // something to be seen against.
    iconSurface: "#2b2a27",

    sunken: "#2a2622",
    sunkenSoft: "#252119",
    sunkenDeep: "#302b25",
    hairline: "#2e2a26",        // a whisper here too
    hairlineStrong: "#433e38",

    // Not pure white. On a dark ground it glares and smears at small sizes.
    ink: "#ece7df",
    inkSoft: "#a39d94",
    inkFaint: "#6f6a63",

    /*
     * Lifted off the logo colours rather than reused: the web blue and green
     * are chosen to sit on paper, and on a dark ground they go muddy and stop
     * reading as the thing to press.
     */
    /*
     * The same blue, lifted rather than deepened.
     *
     * #1e40af on a near-black page is a dark shape on a dark page. This side
     * takes the hue up until it is the thing the eye finds first, and keeps it
     * unmistakably the same colour as the light theme's band rather than a
     * separate idea for night - which is what makes a two-theme app feel like
     * one app rather than two.
     */
    accent: "#8fb0ff",
    accentDeep: "#b9cbff",
    accentTint: "#161d38",
    accentEdge: "#2e3a63",

    /*
     * The band and the primary button on the dark side.
     *
     * Deeper than the accent above, because this is a surface somebody reads
     * white words off rather than a mark somebody looks at - a pale blue
     * filled across the top of the page would glare on a near-black screen at
     * night, which is the one time this theme is actually used.
     */
    field: "#2c4fb8",
    fieldSoft: "#3f62c9",
    fieldInk: "#f2f5fd",

    brand: "#4ac96d",
    brandDeep: "#4ac96d",
    brandTint: "#16301f",

    ok: "#34d399",
    okTint: "#10291f",

    inverse: "#e9e4dc",
    onInverse: "#1f1d1a",

    whatsapp: "#25d366",
    whatsappTint: "#132a21",

    panel: "#100e0d",
    panelSoft: "#1c1917",
    panelLine: "rgba(255, 255, 255, 0.12)",
    onPanel: "#9a928a",

    warn: "#dfa94d",
    warnTint: "#302518",

    // Brighter on a dark ground, where the light theme's gold goes muddy.
    star: "#ffc24d",
    danger: "#ec7d6c",
    dangerTint: "#351c1a",
    info: "#8fa4ff",
    infoTint: "#1b2248",

    white: "#ffffff",
    shadow: "#000000",
    shadowOpacity: 0.45,

    // Barely separated from the surface. A wash that reads as a tint on paper
    // reads as a stripe on a dark ground.
    art: {
        sky: ["#222540", "#1c1917"],
        leaf: ["#1b3024", "#1c1917"],
        sand: ["#2c2519", "#1c1917"],
        dark: ["#141210", "#0d0c0b"],
    },
};

export const palettes = { light, dark };

/**
 * The phone decides, and the app follows.
 *
 * The website has a switch because a browser tab is not the operating system;
 * a phone already has one setting for this, and offering a second place to get
 * it wrong is not a feature.
 */
const ThemeContext = createContext(light);

export const ThemeProvider = ({ children }) => {
    const scheme = useColorScheme();
    const colors = scheme === "dark" ? dark : light;

    return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
};

export const useColors = () => useContext(ThemeContext);

export const useScheme = () => (useColors() === dark ? "dark" : "light");

/**
 * Styles that depend on the palette.
 *
 * React Native has no cascade, so a stylesheet built once at module load can
 * never change colour. This rebuilds a screen's styles when - and only when -
 * the palette does.
 */
export const useThemedStyles = (build) => {
    const colors = useColors();
    return useMemo(() => build(colors), [build, colors]);
};

/* ---- the same in either theme ---- */

/** A four point rhythm, so spacing never becomes arbitrary. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** The site rounds generously - 14px on a card, a full pill on a control. */
/*
 * Rounder than it was.
 *
 * A 20px card on a 14px chip reads as a panel; at 24 it reads as an object
 * sitting on the page, which is the difference between a screen of sections
 * and a screen of things.
 */
/*
 * The design system's own scale: 0.5rem, 1rem, 1.5rem, 2rem, 3rem.
 *
 * `md` on a picture nested inside an `lg` card is the pairing it calls for -
 * a 16px corner inside a 24px one keeps the two curves in step instead of the
 * inner one reading as a square dropped into a rounded box.
 */
/**
 * How round a corner gets, and the answer is: less than it was.
 *
 * Mohan asked for the whole app to sit squarer - the layout is right, the
 * corners were not. The scale is roughly halved rather than flattened: a
 * 24-point card radius is a soft, friendly, slightly toy shape, and at 12 the
 * same card reads as something a company made. Zero would be the other
 * mistake; a hard corner on a phone looks like an unstyled view rather than a
 * decision.
 *
 * `pill` is untouched. It is not a radius, it is a shape - a chip and a
 * primary button are meant to be fully round ends, and squaring those would
 * turn every control into a rectangle and lose the one place roundness is
 * doing work.
 */
export const radius = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 24, pill: 999 };

/**
 * Outfit for anything large, Plus Jakarta Sans for everything else.
 *
 * The display face was Bricolage Grotesque, which is the website's. The design
 * system Mohan settled on asks for Outfit, and it is the better call for a
 * phone: Bricolage's character lives in its widths and its odd terminals, and
 * at the sizes a handset can afford those read as noise rather than as
 * personality. Outfit is geometric and tightly tracked, which is what carries
 * a 32pt headline on a 360dp screen.
 *
 * Outfit also has proper tabular figures, and this app is full of money.
 */
export const font = {
    display: "Outfit_600SemiBold",
    displayBold: "Outfit_700Bold",
    body: "PlusJakartaSans_400Regular",
    medium: "PlusJakartaSans_500Medium",
    semibold: "PlusJakartaSans_600SemiBold",
    bold: "PlusJakartaSans_700Bold",
};


/**
 * A button's fill, as three steps of its own colour.
 *
 * The website's WhatsApp button is a diagonal gradient - light at the top
 * left, the colour itself in the middle, deeper at the bottom right - and
 * Mohan asked for every button in both apps to carry the same treatment. It is
 * what separates a button somebody designed from a rectangle somebody filled
 * in: a flat block reads as a shape, a graded one reads as a surface with
 * light falling on it.
 *
 * Worked out from the colour rather than written as three hexes per tone,
 * because there are four tones in each app and two themes, and sixteen
 * hand-picked values is sixteen chances for one of them to drift away from the
 * palette it came from. Give it the fill and it makes the ramp.
 *
 * Anything that is not a hex - "transparent", an rgba - comes back unchanged
 * in both stops, so a gradient over it is a no-op rather than a crash.
 */
const clampByte = (n) => Math.max(0, Math.min(255, Math.round(n)));

const shade = (hex, amount) => {
    if (typeof hex !== "string" || hex[0] !== "#") return hex;

    const body = hex.slice(1);
    const full = body.length === 3 ? body.split("").map((c) => c + c).join("") : body;
    if (full.length !== 6) return hex;

    const value = parseInt(full, 16);
    if (Number.isNaN(value)) return hex;

    const parts = [(value >> 16) & 255, (value >> 8) & 255, value & 255];

    // Towards white when lightening, towards black when darkening, so a step
    // keeps the hue instead of sliding round it.
    const moved = parts.map((c) => (amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)));

    return "#" + moved.map((c) => clampByte(c).toString(16).padStart(2, "0")).join("");
};

/** Light, the colour, deep - the same shape as the site's WhatsApp button. */
export const rampFor = (hex, lift = 0.18, drop = 0.16) => [shade(hex, lift), hex, shade(hex, -drop)];

/**
 * Shadows, kept shallow.
 *
 * What lifts a card is its hairline; the shadow only stops it dissolving into
 * the ground. Deeper in dark mode, where a shallow one does nothing at all.
 *
 * No elevation on Android, and that is the fix for the dark smudge that
 * flickered when a tab slid away.
 *
 * The four shadow properties above are read by iOS only. Android draws a
 * shadow from `elevation` instead, and it draws it by compositing the view
 * into a layer of its own - so a card with elevation, inside a scene that is
 * transparent and is being faded across by the tab animation, has its shadow
 * composited against nothing and comes out as a hard grey-black block. Two
 * device pixels of shadow is not worth that, especially when the hairline is
 * what was doing the lifting anyway.
 *
 * It is also cheaper: every elevated view is an extra layer for the GPU, and
 * a list of cards was paying for one each.
 */
export const shadowFor = (colors) => ({
    shadowColor: colors.shadow,
    shadowOpacity: colors.shadowOpacity,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: Platform.OS === "android" ? 0 : 2,
});

/** The card every panel and list row is built from. */
export const cardFor = (colors) => ({
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    ...shadowFor(colors),
});
