import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { WHATSAPP_NUMBER } from "./config";
import { font, space, useThemedStyles } from "./theme";
import { Icon } from "./Icon";

/**
 * The company's pictures and its one outward link.
 *
 * The same set the website uses, named here rather than pasted into screens,
 * so that swapping the artwork is one edit. The office uploads to ImageKit
 * itself - nothing here is bundled into the app - which is also why the
 * catalogue's own `image` field wins wherever the server sends one.
 */
const IK = "https://ik.imagekit.io/h7wep5nji/cosmosgen/";

/**
 * The version of the artwork this build ships with.
 *
 * A picture replaced on ImageKit under the name it already had is invisible to
 * anybody who has seen the old one: the URL has not changed, so the CDN keeps
 * serving what it cached. Bump this whenever artwork is replaced without being
 * renamed - it costs one fresh fetch per picture and nothing after that.
 */
const V = "2026-09-13b";

const pic = (file) => IK + file + "?v=" + V;

/**
 * ImageKit resizes on the URL, so a card asks for a card-sized file instead of
 * pulling a 3000px original down a phone connection. This matters more here
 * than it does on the website: the phone is the device actually paying for
 * those bytes. Anything not on ImageKit is handed back untouched.
 */
export const ik = (url, tr) => {
    /*
     * Any ImageKit address, not only the one account.
     *
     * This used to test against `IK`, the endpoint the original artwork sits
     * on. The service pictures are now uploaded to a second account, and a URL
     * that failed the test came back untouched - so a phone pulled the full
     * three hundred kilobyte original for a card a hundred and twenty points
     * tall. Matching the host rather than the account is what the resizing was
     * always meant to key on.
     */
    if (!url || !tr || !url.includes("ik.imagekit.io/")) return url;
    return url + (url.includes("?") ? "&" : "?") + "tr=" + tr;
};

export const LOGO = pic("cosmosgen-logo.png");

/** Several engineers together, each holding the tool of their own trade. */
export const HERO_TEAM = pic("cg-hero-team.png");

/** Somebody from the team at a customer's door, listening to the job. */
export const HERO = pic("cg-hero-visit.png");

/** Somebody reading a code out at their own front door. */
export const AT_THE_DOOR = pic("cg-at-the-door.png");

/** The bike on the road, for the tracking screen. */
export const ON_THE_WAY = pic("cg-on-the-way.png");

/** The engineer holding the invoice out for the customer to read. */
export const THE_BILL = pic("cg-the-bill.png");

/** One per service key in the catalogue, for anything the office has not set. */
/*
 * The card artwork, drawn in a room rather than cut out of one.
 *
 * The original set were cutouts on a transparent ground, which the app framed
 * against a tint of its own. Mohan replaced them with pictures that carry
 * their own background - an engineer in an actual Indian kitchen or bathroom -
 * so the app fills the frame with them instead of fitting them inside it.
 *
 * On a second ImageKit account from everything else, which is why `ik` above
 * matches the host rather than one endpoint.
 */
const CARD = "https://ik.imagekit.io/ny6yinyut/Posters/CardPoster/";

export const SERVICE_IMAGE = {
    AC_APPLIANCE: CARD + "ac.png",
    ELECTRICAL: CARD + "electrician%20.png",
    PLUMBING: CARD + "plumber.png",
    HOME_CLEANING: CARD + "house%20cleaning.png",

    // Not drawn yet. These trades are not in the live catalogue either, so
    // nothing shows them - the old cutouts stay until there is a picture.
    CARPENTRY: pic("service-carpentry.png"),
    PEST_CONTROL: pic("service-pest.png"),
    PAINTING: pic("service-painting.png"),
};

/** One per appliance under AC & Appliance Repair. */
export const APPLIANCE_IMAGE = {
    AC: CARD + "ac.png",
    FRIDGE: CARD + "fridge.png",
    WASHING_MACHINE: CARD + "washing%20machine.png",

    MICROWAVE: CARD + "Microwave.png",
    GEYSER: CARD + "Water%20heater.png",

    /*
     * The last of the old cutouts.
     *
     * A water purifier has not been drawn in the new style yet, and the file
     * that stands in for it is portrait - so `fitFor` below keeps it contained
     * inside its frame rather than cropping three fifths of its height away.
     * It falls back rather than borrowing another machine's picture: a
     * customer tapping "Water Purifier" and seeing a fridge is worse than one
     * seeing the plain drawing the app has always had.
     */
    WATER_PURIFIER: pic("appliance-water-purifier.png"),
};

/**
 * A mark per appliance, so a machine can stand on its own in a grid.
 *
 * Every appliance used to hide behind one tile called "AC & Appliance Repair",
 * which meant somebody whose fridge had stopped had to know that a fridge lives
 * under air conditioning. Mohan asked for them out in the open - "sabko ek ek
 * karke dikhate hai" - and a tile with no mark of its own cannot be.
 *
 * Feather names, because that is the set the app already carries. Feather has
 * no fridge and no washing machine, so the nearest honest shape is used and the
 * word under it does the identifying, which on a four-column grid it was always
 * going to have to.
 */
export const APPLIANCE_ICON = {
    AC: "snowflake",
    FRIDGE: "thermometer",
    WASHING_MACHINE: "washing-machine",
    MICROWAVE: "oven",
    GEYSER: "droplet",
    WATER_PURIFIER: "filter",
};

/**
 * The catalogue flattened into one tile per thing somebody might tap.
 *
 * A trade with appliances under it becomes one tile per appliance; a trade
 * without stays a single tile. That is the difference between a customer
 * finding "Refrigerator" on the home screen and a customer having to work out
 * which trade a refrigerator belongs to.
 *
 * Each entry carries where it goes: an appliance opens its parent trade with
 * the machine already chosen, so the booking flow skips the question it has
 * just been answered.
 */
/**
 * The picture a card or a hero should draw.
 *
 * The app has always used whatever the server sends on a service, because the
 * office manages the catalogue's own pictures and a hard-coded list would go
 * stale the day a trade was added. That stays true for anything the office
 * uploads.
 *
 * What comes first now is the card artwork above. Those drawings are framed
 * for this app specifically - the figure centred, the side thirds kept simple,
 * because a phone crops them to a 210 by 120 card and to a full-width band and
 * the website does neither. A picture drawn for the website's proportions, put
 * in those frames, is the cropped head Mohan photographed.
 *
 * So: the card set where there is one, the office's picture where there is
 * not, and nothing at all rather than a wrong machine's drawing.
 */
export const artFor = (service, machine) => {
    if (machine) return APPLIANCE_IMAGE[machine.key] || machine.image || service?.image || "";
    return SERVICE_IMAGE[service?.key] || service?.image || "";
};

/**
 * Whether a picture should fill its frame or sit inside it.
 *
 * Only the card artwork is drawn to be cropped. Those six are landscape, near
 * enough three by two, with the figure centred and the side thirds kept
 * simple, so every frame in this app takes a slice out of them and loses
 * nothing that matters.
 *
 * Nothing else in the set is. The drawings still waiting to be replaced are
 * cutouts on a transparent ground, and two of them - the geyser and the water
 * purifier - are portrait: filling a card with one of those throws away three
 * fifths of its height, which is the engineer's head. The office's own uploads
 * are whatever shape the office uploaded.
 *
 * So the new set fills and everything else fits, which is what this app did
 * everywhere before the new set arrived. When the last of the old drawings is
 * replaced this can go back to being one answer.
 */
export const fitFor = (service, machine) => {
    const src = artFor(service, machine);
    return src && src.startsWith(CARD) ? "cover" : "contain";
};

export const tilesFor = (services = []) => services.flatMap((service) => {
    const kids = service.appliances || [];

    if (!kids.length) {
        return [{
            key: service.key,
            label: service.display || service.label,
            icon: SERVICE_ICON[service.key] || "tool",
            image: service.image,
            to: "/service/" + service.key,
        }];
    }

    return kids.map((a) => ({
        key: service.key + ":" + a.key,
        label: a.display || a.label,
        icon: APPLIANCE_ICON[a.key] || SERVICE_ICON[service.key] || "tool",
        image: APPLIANCE_IMAGE[a.key] || a.image || service.image,
        to: "/service/" + service.key + "?appliance=" + a.key,
    }));
});

export const WHATSAPP_LINK =
    "https://wa.me/" + WHATSAPP_NUMBER + "?text="
    + encodeURIComponent("Hi Cosmosgen, I need help with");

/**
 * Which tinted ground a drawing sits on, by its position in a list.
 *
 * The pictures are cutouts with nothing behind them, so the panel under each
 * is doing the work a photograph's own background would. Rotating through
 * three keeps a column of them from reading as one long tile.
 */
/*
 * `usuallyCosts` was removed from here.
 *
 * It formatted a price range into "Usually Rs 400 to Rs 1,200" and called a
 * `money` helper that does not exist in this file or anywhere imported into
 * it - so the first screen to use it would have thrown on sight. Nothing ever
 * did: it was exported, never called, and sat here looking finished.
 *
 * The app shows a range through `PriceRange` in ui.js, which lays the figures
 * out rather than writing them into a sentence, and `estimateRange` below is
 * what feeds it.
 */


/**
 * What a job is likely to come to, as a range.
 *
 * A single figure is the wrong shape for this business. The engineer has not
 * seen the fault yet, so any one number is either a promise nobody can keep or
 * a floor that quietly becomes a ceiling in the customer's head - and the
 * argument at the door afterwards costs more than the booking was worth. A
 * range says the true thing: most of these land between here and here.
 *
 * These are placeholders and Mohan asked for them as such. The moment the
 * office's own price list is filled in at /admin/services, `usually` arrives
 * with every service and wins outright - nothing here needs deleting when
 * that day comes.
 *
 * Each trade is also called what it actually charges for, because the same
 * rupee figure means four different things across this catalogue. An AC
 * call-out is a diagnostic fee and the repair is quoted after it. A tap washer
 * is the whole job. A flat clean is a package. One label over all of them
 * would be wrong three times out of four.
 */
const ESTIMATES = {
    AC_APPLIANCE: { from: 299, to: 2400, label: "Diagnostic fee" },
    ELECTRICAL: { from: 149, to: 1800, label: "Typical job" },
    PLUMBING: { from: 199, to: 2200, label: "Typical job" },
    HOME_CLEANING: { from: 899, to: 3500, label: "Full flat package" },
    CARPENTRY: { from: 249, to: 3000, label: "Typical job" },
    PEST_CONTROL: { from: 799, to: 2600, label: "Full flat package" },
    PAINTING: { from: 1499, to: 12000, label: "Full flat package" },
};

const FALLBACK = { from: 199, to: 2000, label: "Typical job" };

/**
 * The range a service card leads with.
 *
 * The office's own list first, the placeholder only when there is nothing -
 * and `estimated` says which of the two it was, so a screen can mark a guess
 * as a guess rather than letting it pass as the company's word.
 */
export const estimateRange = (service) => {
    const real = service?.usually;
    const stand = ESTIMATES[service?.key] || FALLBACK;

    const from = real?.from || stand.from;
    const to = real?.to || stand.to;

    return {
        from,
        to,
        // A range whose ends meet is not a range - say the one figure.
        single: from === to,
        label: stand.label,
        estimated: !real?.from,
    };
};

export const SERVICE_GROUP = {
    AC_APPLIANCE: "Repairs",
    ELECTRICAL: "Repairs",
    PLUMBING: "Repairs",
    CARPENTRY: "Installations",
    PAINTING: "Installations",
    HOME_CLEANING: "Cleaning",
    PEST_CONTROL: "Cleaning",
};

export const SERVICE_GROUPS = ["All services", "Repairs", "Installations", "Cleaning"];

export const tintFor = (index) => ["sky", "leaf", "sand"][index % 3];

/**
 * The icon that stands in for a service while its picture loads, or when the
 * office has not uploaded one.
 *
 * Feather names, because that is the set the app already carries - the website
 * uses lucide, which is the same drawings under different names.
 */
export const SERVICE_ICON = {
    AC_APPLIANCE: "snowflake",
    ELECTRICAL: "zap",
    PLUMBING: "pipe",
    CARPENTRY: "tool",
    PEST_CONTROL: "shield",
    HOME_CLEANING: "spray-bottle",
    PAINTING: "edit-3",
};

/**
 * The line at the bottom of the page, the way an app signs its own work.
 *
 * The vendor app carries this and Mohan asked for the same here. It is not
 * decoration: a screen that ends in blank space reads as unfinished, and
 * somebody who has scrolled to the end of the home page should arrive
 * somewhere rather than at nothing. Deliberately faint - it is a signature,
 * not a message.
 */
export const Signature = () => {
    const s = useThemedStyles(makeSignatureStyles);

    return (
        <View style={s.signature}>
            {/*
              * The words carry the page's left margin; the mark sits centred
              * under them. Two alignments in one block, which holds because the
              * big lines are the only thing at that size - so the logo below
              * reads as the signature on them rather than as a third line.
              */}
            <Text style={s.big}>MADE WITH</Text>
            <Text style={s.big}>LOVE IN ODISHA</Text>

            <Image source={{ uri: ik(LOGO, "w-120") }} style={s.mark} contentFit="contain" cachePolicy="memory-disk" />

            <Text style={s.who}>Cosmosgen Engineers Pvt. Ltd.</Text>
        </View>
    );
};

const makeSignatureStyles = (colors) => StyleSheet.create({
    signature: {
        // Stretched, so each piece chooses its own alignment
        alignItems: "stretch",
        alignSelf: "stretch",
        paddingTop: space.xxl + space.md,
        paddingBottom: space.xl,
    },

    /*
     * Leading tighter than the type is tall: the two lines are one sentence
     * broken in half, so they have to sit as one shape. At normal leading the
     * gap reads as a paragraph break and the sentence comes apart again.
     *
     * The size is chosen so "LOVE IN ODISHA" almost fills the measure between
     * the page's margins, which is what makes it read as a mark rather than as
     * a large line of text.
     */
    big: {
        fontFamily: font.displayBold,
        fontSize: 34,
        lineHeight: 37,
        letterSpacing: -0.8,
        color: colors.inkFaint,
        opacity: 0.65,
        textAlign: "left",
    },

    mark: { width: 26, height: 26, opacity: 0.45, marginTop: space.lg, alignSelf: "center" },

    // Small and widely tracked, so it reads as the caption to the mark rather
    // than as a third line of the sentence above it
    who: {
        fontFamily: font.medium,
        fontSize: 9,
        color: colors.inkFaint,
        opacity: 0.55,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginTop: 6,
        textAlign: "center",
    },
});
