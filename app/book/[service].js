import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorFrom } from "../../src/api";
import { APPLIANCE_ICON, estimateRange, SERVICE_ICON } from "../../src/brand";
import { oneLine, useAddresses } from "../../src/addresses";
import { useJobs } from "../../src/jobs";
import { Loading } from "../../src/Loading";
import { fixPosition } from "../../src/location";
import { useSession } from "../../src/session";
import { TopBar } from "../../src/TopBar";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import {
    Body, Button, Display, Greeting, IconArt, Lede, Notice, PriceRange, Row, Small,
} from "../../src/ui";
import { useKeyboardPad, useKeyboardScroll } from "../../src/keyboard";
import { Icon } from "../../src/Icon";

/**
 * Which language everything after this happens in.
 *
 * Each is written in its own language rather than in English, because the
 * person who needs this option is the person who would not be reading the
 * English word for it. The app itself stays in English - what this sets is how
 * the company talks back: the WhatsApp messages about this job, the assistant, and the
 * call the office makes before anybody is assigned.
 */
/*
 * Hinglish is written in Roman letters, and the row offering it has to be
 * too. It was labelled in Devanagari, which is the one script Hinglish is
 * specifically not - somebody choosing it expects "kya problem hai", and the
 * label promised the opposite.
 */
/*
 * Which language the assistant uses, and only the assistant.
 *
 * The design this came from said "we dispatch a technician fluent in your
 * preferred language", and Mohan was clear that is not what this question is:
 * "wo engineer ke liye nehi hai, engineer srif apne local bhasa main baat
 * karega". The engineer speaks the local language and that is the end of it.
 *
 * What this actually sets is the AI - the call it makes after the booking, and
 * the WhatsApp thread it runs. Promising a language for the man at the door
 * would be a promise the office cannot keep, and it would be discovered at the
 * worst possible moment.
 */
const LANGUAGES = [
    { key: "english", mark: "EN", label: "English", note: "The assistant calls and writes in English" },
    { key: "hinglish", mark: "हि", label: "Hinglish", note: "सहायक हिंदी में बात करेगा" },
    { key: "odia", mark: "ଓ", label: "ଓଡ଼ିଆ", note: "ସହାୟକ ଓଡ଼ିଆରେ କଥା ହେବେ" },
];

/*
 * The days on offer, worked out rather than written down.
 *
 * A fixed list goes stale overnight - "Tomorrow, 24 Sept" is wrong by morning,
 * and a list typed into the app is a list somebody has to remember to change.
 * These are built from today each time the screen opens, so they cannot drift.
 *
 * A week is as far as this goes. The server allows a fortnight; nobody books a
 * tap two weeks out, and a longer list buries the two answers people want.
 */
const DAYS_AHEAD = 7;

const daysFromToday = () => {
    const out = [];

    for (let i = 0; i < DAYS_AHEAD; i += 1) {
        const day = new Date();
        day.setHours(12, 0, 0, 0);
        day.setDate(day.getDate() + i);

        out.push({
            key: day.toISOString().slice(0, 10),
            date: day.toISOString(),
            label: i === 0 ? "Today" : i === 1 ? "Tomorrow"
                : day.toLocaleDateString("en-IN", { weekday: "long" }),
            note: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        });
    }

    return out;
};

/*
 * Windows rather than times.
 *
 * An engineer crossing Bhubaneswar cannot promise four o'clock, and a promise
 * the company cannot keep costs more than the vagueness saves. These four are
 * the same strings the server accepts - see SLOT_WINDOWS in booking.service -
 * and a window this screen offered that the server refused would be a form
 * filled in and rejected for a reason nobody can see.
 */
const WINDOWS = ["9 AM - 12 PM", "12 PM - 3 PM", "3 PM - 6 PM", "6 PM - 9 PM"];

/**
 * Booking, one question at a time.
 *
 * The same order the assistant asks in on WhatsApp, because it is the same
 * booking and the same ticket at the end of it: which machine, what it is
 * doing, then the part only the customer can write. A single page with every
 * field on it would be faster to build and is the version people abandon -
 * somebody with a leaking geyser is not filling in a form.
 *
 * Nothing is promised here. The price is what the office quotes once it knows
 * what the job is, and this screen is careful never to imply otherwise.
 */
/**
 * "2 x Air conditioner, 1 x Refrigerator", or nothing at all.
 *
 * Written into the description rather than sent as its own field, so every
 * channel that reads a ticket keeps reading one sentence.
 */
const countLine = (service, quantities) => {
    const parts = (service?.appliances || [])
        .filter((a) => quantities[a.key])
        .map((a) => quantities[a.key] + " x " + (a.display || a.label));

    return parts.join(", ");
};

export default function Book() {
    // Room for the keyboard, measured rather than assumed - see src/keyboard.js
    const keyboardPad = useKeyboardPad();
    const scroll = useKeyboardScroll();
    const { service: serviceKey, appliance: wanted } = useLocalSearchParams();
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const { serviceFor, loading, reloadTickets, open } = useJobs();
    const { customer, saveProfile } = useSession();

    const service = serviceFor(String(serviceKey));

    const [appliance, setAppliance] = useState(null);

    /*
     * How many of each machine, keyed by appliance.
     *
     * Zero means not chosen, which is why this is a count rather than a set -
     * a customer with two air conditioners is telling the office something,
     * and a checkbox cannot carry it.
     */
    const [quantities, setQuantities] = useState({});

    /*
     * Opened for one machine, so there is nothing to choose.
     *
     * A customer who tapped "Washing machine" has already said which machine
     * it is. Asking again - and offering them four others while they are at it
     * - is the multiple-selection flow Mohan objected to being put in front of
     * somebody who wanted one thing. With `?appliance=` the step is skipped
     * entirely and the count starts at one.
     */
    const [onlyOne] = useState(() => String(wanted || "") || null);
    const [seededOne, setSeededOne] = useState(false);

    const bump = (key, by) => {
        setQuantities((prev) => {
            const next = { ...prev, [key]: Math.max(0, Math.min(9, (prev[key] || 0) + by)) };
            if (!next[key]) delete next[key];
            return next;
        });

        setError("");

        // The faults question is about one machine, and the sensible one is
        // the first they counted. Cleared if they take that one back to zero.
        setAppliance((was) => {
            if (by > 0 && !was) return key;
            return was;
        });
    };
    const [issues, setIssues] = useState([]);
    const [description, setDescription] = useState("");

    /*
     * English unless they have actually chosen something else.
     *
     * `language` always holds a value - the account carries one from the
     * moment it is made - so reading it straight meant this screen opened on
     * whatever the default happened to be, or on a choice made once over
     * WhatsApp months ago, with no way to tell those two apart.
     * `languageConfirmedAt` is the difference, and it is the same test the
     * backend uses everywhere: set means they picked, absent means nobody has
     * asked them yet. Nobody is ever shown a language they did not choose.
     */
    const [language, setLanguage] = useState(
        customer?.languageConfirmedAt ? (customer.language || "english") : "english"
    );
    /*
     * When they want somebody, and the two answers that are not a date.
     *
     * "As soon as you can" is the default and stays the default, because it is
     * what most people mean and because it is what every booking meant before
     * this step existed. A day is picked only by somebody who has a reason -
     * they are at work until Thursday, the flat is empty till the weekend -
     * and that reason is exactly what the office needs in order to hold the
     * job rather than send a vendor to a locked door.
     */
    const [when, setWhen] = useState(null);      // null = as soon as you can
    const [window, setWindow] = useState("");

    const [step, setStep] = useState(0);

    const [locating, setLocating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    /*
     * Which questions this service actually has.
     *
     * A service with appliances under it asks which machine first; one without
     * goes straight to what is wrong. Building the list rather than writing
     * `if (service.appliances)` in four places is what keeps the progress
     * indicator and the back button honest.
     */
    /*
     * A job in hand has already settled the language.
     *
     * Mohan's rule: whichever language a customer books in carries that job
     * from the first message to the last, and only the next booking is a fresh
     * choice. So the question is asked when nothing is running and skipped
     * when something is - offering it mid-job would let a second booking
     * change the language of a visit already on its way.
     */
    const running = open.length > 0;

    const steps = useMemo(() => {
        const list = [];
        if (service?.appliances?.length && !onlyOne) list.push("appliance");
        list.push("issues", "describe", "when");
        if (!running) list.push("language");
        list.push("confirm");
        return list;
    }, [service, running, onlyOne]);

    const current = steps[step];

    /*
     * What each question is called, for the line above the progress bar.
     *
     * A row of pips tells somebody how far along they are and nothing about
     * what is being asked - which is the difference between a progress bar and
     * a form that says "Step 2 of 5: what is it doing". The second is the one
     * people finish, because it promises an end and names every stop.
     */
    const stepName = {
        appliance: "Select appliance",
        issues: "What is wrong",
        describe: "In your words",
        when: "When to come",
        language: "Your language",
        confirm: "Check and send",
    }[current] || "";

    // What this trade usually comes to, for the screen somebody commits on.
    const range = estimateRange(service || {});

    // The faults on offer belong to the appliance once one is chosen, and to
    // the service itself otherwise.
    // Seeded once, when the flow was opened for a single machine.
    if (onlyOne && !seededOne) {
        setSeededOne(true);
        setAppliance(onlyOne);
        setQuantities({ [onlyOne]: 1 });
    }

    const counted = Object.keys(quantities);

    /*
     * The faults of every machine that was counted, kept under that machine.
     *
     * Adding a refrigerator beside an air conditioner and then being offered
     * only the air conditioner's faults was the first bug here. The fix put
     * every machine's faults into one list and wrote the machine's name into
     * each line - "Air Conditioner \u00b7 Not cooling properly" - and Mohan
     * looked at that list and asked for headings instead.
     *
     * He is right, and for more than tidiness. The name was the longest part
     * of every line, so in a two-column grid the fault itself - the only part
     * that differs - was the part that got truncated: eight rows all reading
     * "Air Conditioner \u00b7 Not cool...". Said once as a heading, the name
     * costs one line for the whole group and every fault under it is readable.
     *
     * The keys are untouched. They still carry `machine:fault`, which is what
     * the submit below splits on, so this changed the reading and nothing
     * about what reaches the office.
     */
    const faultGroups = counted.length
        ? counted
            .map((k) => {
                const a = (service?.appliances || []).find((x) => x.key === k);
                if (!a || !(a.issues || []).length) return null;

                return {
                    key: k,
                    title: a.display || a.label,
                    icon: APPLIANCE_ICON[a.key] || SERVICE_ICON[service?.key] || "tool",
                    items: (a.issues || []).map((i) => ({
                        ...i,
                        key: k + ":" + i.key,
                        display: i.display || i.label,
                    })),
                };
            })
            .filter(Boolean)

        /*
         * A trade with no machines under it - plumbing, electrical work -
         * has its faults on the service itself and nothing to head them
         * with. One untitled group, rather than a second way of drawing
         * this step.
         */
        : [{ key: service?.key || "service", title: null, items: service?.issues || [] }];

    const faults = faultGroups.flatMap((g) => g.items);

    /*
     * Which of the saved addresses this job is for.
     *
     * The default is used unless the customer says otherwise, which is the
     * whole point: somebody sitting in their office should be able to send a
     * technician there without first changing where they live. Null means the
     * account's own address, which is what a customer who has never opened the
     * list still gets.
     */
    const addressBook = useAddresses();
    const [chosenId, setChosenId] = useState(null);
    const [picking, setPicking] = useState(false);

    const chosen = addressBook.items.find((a) => String(a._id) === String(chosenId))
        || addressBook.items.find((a) => a.isDefault)
        || addressBook.items[0]
        || null;

    const hasAddress = chosen
        ? Number.isFinite(chosen.lat)
        : (Boolean(customer?.address) || Number.isFinite(customer?.lat));

    const next = () => {
        setError("");

        if (current === "appliance" && !Object.keys(quantities).length) {
            return setError("Add at least one machine.");
        }

        /*
         * Writing it out is only required when nothing was picked.
         *
         * The customer has already said what is wrong by choosing from the
         * list on the screen before; making them write the same thing again is
         * a second question about one answer. Where nothing fitted - a service
         * with no list, or a fault that is not on it - the words are the only
         * description there is, so then they are asked for.
         */
        if (current === "describe" && !issues.length && description.trim().length < 5) {
            return setError("Tell us what is happening, in a line or two.");
        }

        // A day without a window is a job the office cannot place in its
        // morning - so the window is asked for as soon as a day is.
        if (current === "when" && when && !window) {
            return setError("Pick a time that suits you on that day.");
        }

        setStep((n) => Math.min(n + 1, steps.length - 1));
    };

    const back = () => {
        setError("");
        if (step === 0) return router.back();
        setStep((n) => n - 1);
    };

    const locate = async () => {
        setLocating(true);
        setError("");

        const fix = await fixPosition();

        if (!fix.ok) {
            setLocating(false);
            return setError(fix.message);
        }

        const saved = await saveProfile({ lat: fix.lat, lon: fix.lon });
        setLocating(false);

        if (!saved.ok) setError(saved.message);
    };

    const book = async () => {
        setBusy(true);
        setError("");

        try {
            const res = await api.post("/customer/book", {
                serviceKey: service.key,

                /*
                 * The plain fault keys, without the machine in front of them.
                 *
                 * The faults step prefixes each key with its appliance so two
                 * machines can both offer "Not cooling" without colliding in
                 * the same list. That prefix is a detail of this screen - the
                 * ticket, the office and the vendor have always seen bare keys
                 * and nothing downstream should learn otherwise. Which machine
                 * it was is already in the line below.
                 */
                selectedIssues: issues.map((k) => (k.includes(":") ? k.split(":").pop() : k)),

                /*
                 * And the same keys with their machine still attached.
                 *
                 * The office reads a ticket with two machines on it and used
                 * to get one row of badges with nothing saying which box each
                 * complaint came off - and an air conditioner and a
                 * refrigerator both offer "Not cooling properly", so the
                 * grouping cannot be worked out again from the phrases. It has
                 * to travel.
                 *
                 * Sent beside the bare keys rather than instead of them. The
                 * vendor app, the assistant and the bill all read the flat
                 * list and none of them has to learn anything.
                 */
                issueKeys: issues.filter((k) => k.includes(":")),

                /*
                 * What was counted, folded into the description.
                 *
                 * The booking endpoint takes a service, some faults and the
                 * customer's own words - there is no field for a basket, and
                 * inventing one would mean the WhatsApp flow and this one
                 * describing the same job differently. The office reads the
                 * line; the engineer reads the line; nothing else has to
                 * change.
                 */
                problemDescription: [countLine(service, quantities), description.trim()]
                    .filter(Boolean)
                    .join(" \u2014 "),

                /*
                 * The language, but only when this booking chose one.
                 *
                 * The server saves it on the account rather than on the
                 * ticket, so the messages, the call and the assistant all
                 * speak it without being told again. Which is exactly why it
                 * is left out while a job is running: this screen never asked,
                 * so what it holds is an untouched default, and sending that
                 * would turn a visit already under way back into English.
                 */
                ...(running ? {} : { language }),

                // Absent means the account's own address, which is what this
                // screen sent before there was a list to choose from.
                ...(chosen ? { addressId: chosen._id } : {}),

                // Both absent when they asked for the next available engineer,
                // which the server reads as the old behaviour.
                ...(when ? { scheduledFor: when.date, slotWindow: window } : {}),
            });

            await reloadTickets();

            /*
             * Onto the confirmation, then the job.
             *
             * This used to go straight to the job on the argument that a screen
             * saying only "booked" is a screen somebody has to get past. That
             * was right about a bare confirmation and wrong about this one:
             * Mohan asked for the reference kit's celebration screen, and it
             * earns its place because it carries the job number and the two
             * things anybody wants next - track it, or go home. It replaces
             * rather than pushes, so Back never returns into a finished form.
             */
            router.replace({
                pathname: "/booked/" + res.data.data.id,
                params: { ticket: res.data.data.ticketNumber || "" },
            });
        } catch (err) {
            setBusy(false);
            setError(errorFrom(err, "Could not book this."));
        }
    };

    if (loading && !service) return <Loading label="Reading the service" />;

    if (!service) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.canvas, padding: space.lg, paddingTop: insets.top + space.xxl }}>
                <Display>We do not do that one</Display>
                <Lede style={{ marginTop: space.sm }}>
                    Pick a service from the list and we will take it from there.
                </Lede>
                <Button style={{ marginTop: space.xl }} onPress={() => router.replace("/(tabs)/services")}>
                    See what we do
                </Button>
            </View>
        );
    }

    return (
        /*
         * A plain box, deliberately.
         *
         * This was a KeyboardAvoidingView. On Android "height" shrinks the
         * whole container by the keyboard's height - so the page above slid
         * up - and the scroller below already keeps that same room as bottom
         * padding, which meant the keyboard was being paid for twice. The
         * padding is the half that works: it lets the field scroll up to the
         * thumb without anything on the page moving on its own.
         */
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            {/* ---- where in the flow this is ---- */}
            <View style={[s.top, { paddingTop: insets.top + space.sm }]}>
                <TopBar
                    back
                    onBack={back}
                    title="Booking"
                    subtitle={service.display || service.label}
                />

                {/* ---- where in the flow this is ---- */}
                <View style={s.steps}>
                <View style={s.stepRow}>
                    <View style={s.stepNumber}>
                        <Small style={s.stepNumberText}>{step + 1}</Small>
                    </View>
                    <Body style={s.stepName} numberOfLines={1}>{stepName}</Body>
                    <Small style={s.stepCount}>Step {step + 1} of {steps.length}</Small>
                </View>

                <View style={s.progress}>
                    {steps.map((name, i) => (
                        <View
                            key={name}
                            style={[
                                s.pip,
                                { backgroundColor: i <= step ? colors.accentDeep : colors.sunken },
                            ]}
                        />
                    ))}
                </View>
                </View>
            </View>

            <ScrollView
                ref={scroll.ref}
                onScroll={scroll.onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{
                    paddingHorizontal: space.lg,

                    // The footer is docked over the page now, so the last
                    // thing on it has to end above where that bar starts.
                    paddingBottom: space.xxl * 3 + keyboardPad,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {current === "appliance" ? (
                    <>
                        <Display style={{ marginTop: space.sm }}>Which machine is it?</Display>
                        <Lede style={{ marginTop: space.sm }}>
                            So the engineer arrives with the right parts rather than coming twice.
                        </Lede>

                        {/*
                          * A row per machine with a stepper on it, which is
                          * the shape Mohan pointed at.
                          *
                          * A grid of tiles could only ever say one machine;
                          * somebody with two air conditioners and a fridge had
                          * to book three times. The count travels to the
                          * office so the engineer arrives knowing there are
                          * two of them rather than finding out at the door.
                          *
                          * The first machine given a count also becomes the
                          * one the faults question is about - it is the
                          * machine the customer thought of first, which is
                          * almost always the one that is broken.
                          */}
                        <View style={s.counts}>
                            {service.appliances.map((item, i) => {
                                const n = quantities[item.key] || 0;

                                return (
                                    <View
                                        key={item.key}
                                        style={[s.countRow, i > 0 ? s.countDivided : null]}
                                    >
                                        <View style={s.countIcon}>
                                            <Icon
                                                name={APPLIANCE_ICON[item.key] || "tool"}
                                                size={20}
                                                color={n ? colors.field : colors.inkSoft}
                                            />
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Body style={s.countName} numberOfLines={1}>
                                                {item.display || item.label}
                                            </Body>
                                            <Small style={s.countNote} numberOfLines={1}>
                                                {(item.issues?.length || 0) + " common faults"}
                                            </Small>
                                        </View>

                                        <View style={s.stepper}>
                                            <Pressable
                                                onPress={() => bump(item.key, -1)}
                                                disabled={!n}
                                                hitSlop={8}
                                                android_ripple={null}
                                                style={[s.step, !n ? s.stepOff : null]}
                                                accessibilityLabel={"One fewer " + (item.label || "")}
                                            >
                                                <Icon
                                                    name="minus"
                                                    size={15}
                                                    color={n ? colors.ink : colors.inkFaint}
                                                />
                                            </Pressable>

                                            <Body style={s.stepCount}>{n}</Body>

                                            <Pressable
                                                onPress={() => bump(item.key, 1)}
                                                hitSlop={8}
                                                android_ripple={null}
                                                style={[s.step, s.stepOn]}
                                                accessibilityLabel={"One more " + (item.label || "")}
                                            >
                                                <Icon name="plus" size={15} color={colors.fieldInk} />
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                    </>
                ) : null}

                {current === "issues" ? (
                    <>
                        <Display style={{ marginTop: space.sm }}>What is it doing?</Display>
                        <Lede style={{ marginTop: space.sm }}>
                            Pick anything that matches. If none of it fits, skip this - the next
                            question is the one that matters.
                        </Lede>

                        {/*
                           * Two to a row, and each one carries its own state.
                           *
                           * These were pills that changed colour when chosen,
                           * which is the whole of the signal - and on a phone
                           * held at arm's length in daylight, a filled pill
                           * and an unfilled one are two pills. A circle that
                           * becomes a tick says picked the way a checklist
                           * says it, and does not depend on the screen being
                           * bright enough to tell two blues apart.
                           */}
                        {faultGroups.map((group) => (
                            <View key={group.key}>
                                {/*
                                  * The machine, said once over its own faults.
                                  *
                                  * Only where there is a machine to name. A
                                  * trade whose faults hang off the trade itself
                                  * would be headed with its own title, which
                                  * the question at the top of this step has
                                  * already asked.
                                  */}
                                {group.title ? (
                                    <View style={s.faultHead}>
                                        <View style={s.faultHeadIcon}>
                                            <Icon name={group.icon} size={14} color={colors.accent} />
                                        </View>
                                        <Body style={s.faultHeadText}>{group.title}</Body>

                                        <Small style={s.faultHeadCount}>
                                            {group.items.length} common
                                        </Small>
                                    </View>
                                ) : null}

                                <View style={[s.faults, group.title ? s.faultsUnderHead : null]}>
                                    {group.items.map((fault) => {
                                        const on = issues.includes(fault.key);

                                        return (
                                            <Row
                                                key={fault.key}
                                                style={{ width: "48%" }}
                                                onPress={() => setIssues((prev) => (
                                                    on
                                                        ? prev.filter((k) => k !== fault.key)
                                                        : [...prev, fault.key]
                                                ))}
                                            >
                                                <View style={[s.fault, on ? s.faultOn : null]}>
                                                    <Icon
                                                        name={on ? "check-circle" : "circle"}
                                                        size={16}
                                                        color={on ? colors.fieldInk : colors.inkFaint}
                                                    />
                                                    <Body
                                                        style={[s.faultText, on ? s.faultTextOn : null]}
                                                        numberOfLines={2}
                                                    >
                                                        {fault.display || fault.label}
                                                    </Body>
                                                </View>
                                            </Row>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}

                        {!faults.length ? (
                            <Small style={{ marginTop: space.lg }}>
                                Nothing listed for this one - tell us in your own words on the next
                                screen.
                            </Small>
                        ) : (
                            <View style={s.aside}>
                                <View style={s.asideIcon}>
                                    <Icon name="tool" size={15} color={colors.accent} />
                                </View>
                                <Small style={{ flex: 1 }}>
                                    Whatever you pick reaches the office before they choose who to
                                    send, so the engineer sets off with the right spares rather
                                    than coming twice.
                                </Small>
                            </View>
                        )}
                    </>
                ) : null}

                {current === "describe" ? (
                    <>
                        <Display style={{ marginTop: space.sm }}>
                            {issues.length ? "Anything to add?" : "Say it in your own words"}
                        </Display>
                        <Lede style={{ marginTop: space.sm }}>
                            {issues.length
                                ? "You have already told us what it is doing. If there is something else - when it started, what you have tried - the office reads this before deciding who to send."
                                : "What happens, and when it started. This is what the office reads before deciding who to send."}
                        </Lede>

                        {/*
                           * The box is the card, rather than a box inside one.
                           *
                           * A bordered field on an open page is a form. The
                           * same words on a sheet of paper with the languages
                           * printed along the bottom is somebody being invited
                           * to write - and this is the one answer on the whole
                           * flow that the office actually reads in full.
                           */}
                        <View style={s.writing}>
                            <TextInput
                                value={description}
                                onChangeText={(t) => { setDescription(t); setError(""); }}
                                placeholder="It trips the switch every time the compressor starts, since Sunday…"
                                placeholderTextColor={colors.inkFaint}
                                style={s.writingInput}
                                multiline
                                textAlignVertical="top"
                            />

                            <View style={s.writingFoot}>
                                <Icon name="globe" size={14} color={colors.inkFaint} />
                                <Small style={{ flex: 1 }}>
                                    Odia, Hindi or English - whichever you think in
                                </Small>
                                <Small style={s.count}>
                                    {description.trim().length ? description.trim().length : ""}
                                </Small>
                            </View>
                        </View>
                    </>
                ) : null}

                {current === "when" ? (
                    <>
                        <Display style={{ marginTop: space.sm }}>When suits you?</Display>
                        <Lede style={{ marginTop: space.sm }}>
                            Most people want somebody as soon as we can send one. If you would
                            rather we came on a particular day, say so and the office holds
                            the job for it.
                        </Lede>

                        <View style={{ gap: space.sm, marginTop: space.xl }}>
                            <Row onPress={() => { setWhen(null); setWindow(""); }}>
                                <View style={[s.language, !when ? s.languageOn : null]}>
                                    <View style={{ flex: 1 }}>
                                        <Display style={{ fontSize: 22, lineHeight: 28 }}>
                                            As soon as you can
                                        </Display>
                                        <Small style={{ marginTop: 2 }}>
                                            We start looking the moment you book
                                        </Small>
                                    </View>


                                </View>
                            </Row>
                        </View>

                        <Small style={s.pick}>Or pick a day</Small>

                        <View style={s.chips}>
                            {daysFromToday().map((day) => {
                                const on = when?.key === day.key;

                                return (
                                    <Row key={day.key} onPress={() => { setWhen(day); setWindow(""); }}>
                                        <View style={[s.day, on ? s.dayOn : null]}>
                                            <Small style={[s.dayLabel, on ? s.dayInkOn : null]}>
                                                {day.label}
                                            </Small>
                                            <Small style={[s.dayNote, on ? s.dayInkOn : null]}>
                                                {day.note}
                                            </Small>
                                        </View>
                                    </Row>
                                );
                            })}
                        </View>

                        {when ? (
                            <>
                                <Small style={s.pick}>
                                    What time on {when.label.toLowerCase()}?
                                </Small>

                                <View style={s.chips}>
                                    {WINDOWS.map((slot) => {
                                        const on = window === slot;

                                        return (
                                            <Row key={slot} onPress={() => setWindow(slot)}>
                                                <View style={[s.window, on ? s.windowOn : null]}>
                                                    <Small style={on ? s.dayInkOn : null}>{slot}</Small>
                                                </View>
                                            </Row>
                                        );
                                    })}
                                </View>
                            </>
                        ) : null}
                    </>
                ) : null}

                {current === "language" ? (
                    <>
                        <Display style={{ marginTop: space.sm }}>Preferred language</Display>
                        <Lede style={{ marginTop: space.sm }}>
                            The assistant rings you after this booking and answers on WhatsApp
                            while the job runs - both in whichever language you pick here.
                        </Lede>

                        <View style={s.aside}>
                            <View style={s.asideIcon}>
                                <Icon name="info" size={15} color={colors.accent} />
                            </View>
                            <Small style={{ flex: 1 }}>
                                The engineer who comes speaks the local language. This sets the
                                assistant, not the person at your door.
                            </Small>
                        </View>

                        <View style={{ gap: space.sm, marginTop: space.xl }}>
                            {LANGUAGES.map((item) => {
                                const chosen = language === item.key;

                                return (
                                    <Row key={item.key} onPress={() => setLanguage(item.key)}>
                                        <View style={[s.language, chosen ? s.languageOn : null]}>
                                            {/*
                                              * The script itself as the mark.
                                              *
                                              * Somebody who reads Odia more
                                              * comfortably than English finds
                                              * their row by the shape of the
                                              * letters, not by the word next
                                              * to them - which is the whole
                                              * point of asking.
                                              */}
                                            <View style={[s.script, chosen ? s.scriptOn : null]}>
                                                <Body style={[s.scriptText, chosen ? s.scriptTextOn : null]}>
                                                    {item.mark}
                                                </Body>
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <Body style={s.languageName}>{item.label}</Body>
                                                <Small style={{ marginTop: 1 }}>{item.note}</Small>
                                            </View>


                                        </View>
                                    </Row>
                                );
                            })}
                        </View>
                    </>
                ) : null}

                {current === "confirm" ? (
                    <>
                        <Display style={{ marginTop: space.sm }}>Review summary</Display>
                        <Lede style={{ marginTop: space.sm }}>
                            Nothing is charged now. The office finds somebody near you and the
                            price is agreed at your door before any work starts.
                        </Lede>

                        {/*
                          * The trade, the picture and what it usually comes to
                          * - the card the reference kit opens this screen with.
                          *
                          * The figures under it are the only honest version of
                          * its price table. That mockup shows Amount, Tax and a
                          * Total as though the job were already priced; here
                          * nothing has been quoted yet, because nobody has
                          * looked at the machine. So the same three lines say
                          * what is actually known: the usual range, whether GST
                          * applies, and that the real total is agreed in front
                          * of the customer.
                          */}
                        <View style={s.review}>
                            <View style={s.reviewHead}>
                                <IconArt
                                    src={service.image}
                                    icon={SERVICE_ICON[service.key] || "tool"}
                                    tint="sky"
                                    tr="w-240"
                                    height={72}
                                    chip={false}
                                    style={{ width: 72 }}
                                />

                                <View style={{ flex: 1 }}>
                                    <View style={s.reviewChip}>
                                        <Small style={s.reviewChipText}>
                                            {service.worker || "Home service"}
                                        </Small>
                                    </View>

                                    <Body style={s.reviewName} numberOfLines={2}>
                                        {service.display || service.label}
                                    </Body>

                                    <PriceRange range={range} size="sm" />
                                </View>
                            </View>

                            <View style={s.reviewRule} />

                            <View style={s.reviewLine}>
                                <Small style={s.reviewKey}>Booking</Small>
                                <Small style={s.reviewValue}>
                                    {when ? when.label : "As soon as somebody is free"}
                                    {window ? " · " + window : ""}
                                </Small>
                            </View>

                            <View style={s.reviewLine}>
                                <Small style={s.reviewKey}>Customer</Small>
                                <Small style={s.reviewValue}>{customer?.name || "You"}</Small>
                            </View>

                            <View style={s.reviewLine}>
                                <Small style={s.reviewKey}>Usual range</Small>
                                <Small style={s.reviewValue}>
                                    {range.single
                                        ? "₹" + range.from
                                        : "₹" + range.from + " – ₹" + range.to}
                                </Small>
                            </View>

                            <View style={s.reviewLine}>
                                <Small style={s.reviewKey}>GST</Small>
                                <Small style={s.reviewValue}>Shown as its own line on the bill</Small>
                            </View>

                            <View style={s.reviewDashed} />

                            <View style={s.reviewLine}>
                                <Body style={s.reviewTotalKey}>To pay now</Body>
                                <Body style={s.reviewTotalValue}>Nothing</Body>
                            </View>
                        </View>

                        <View style={s.summary}>
                            <SummaryRow
                                icon="tool"
                                tone="accent"
                                label="Service"
                                value={(service.display || service.label)
                                    + (appliance
                                        ? " \u00b7 " + ((service.appliances.find((a) => a.key === appliance)?.display) || appliance)
                                        : "")}
                                note={[
                                    issues.length
                                        ? issues.length + " reported fault" + (issues.length === 1 ? "" : "s")
                                        : null,
                                    running
                                        ? null
                                        : "Assistant in "
                                            + (LANGUAGES.find((l) => l.key === language)?.label || "English"),
                                ].filter(Boolean).join(" \u00b7 ")}
                            />

                            {description.trim() ? (
                                <SummaryRow
                                    icon="message-square"
                                    label="What you said"
                                    value={description.trim()}
                                />
                            ) : null}

                            <Pressable onPress={() => setPicking(true)}>
                                <SummaryRow
                                    icon="map-pin"
                                    label="Address"
                                    value={
                                        (chosen ? (chosen.label ? chosen.label : "Your address") : "")
                                        || "Your address"
                                    }
                                    note={
                                        (chosen ? oneLine(chosen) : "")
                                        || customer?.address
                                        || (Number.isFinite(customer?.lat) ? "The pin you saved" : "Not set")
                                    }
                                    action="Change"
                                />
                            </Pressable>

                            <SummaryRow
                                icon="clock"
                                label="When"
                                value={when
                                    ? when.label + ", " + when.note
                                    : "As soon as we can"}
                                note={when
                                    ? (window || "The office will confirm the time")
                                    : "We start looking the moment you book"}
                            />
                        </View>

                        {/*
                          * What it is likely to come to, on the screen where
                          * somebody commits.
                          *
                          * The figure is on the catalogue card and on the
                          * service's own page, and then it disappeared for the
                          * whole of the booking - so the last thing before
                          * "Book it" was the only screen with no money on it
                          * at all. That is the screen a person hesitates on.
                          */}
                        <View style={s.estimate}>
                            <View style={{ flex: 1 }}>
                                <Small style={s.estimateLabel}>{range.label}</Small>
                                <PriceRange range={range} />
                            </View>

                            <Small style={s.estimateNote}>
                                {range.estimated
                                    ? "Indicative. The engineer confirms before starting."
                                    : "From the company price list. Parts extra."}
                            </Small>
                        </View>

                        {/*
                          * What the company will actually hold itself to.
                          *
                          * The design this came from promised a zero visiting
                          * fee here. This business has a visit charge - it is
                          * one of the four ways money moves through it - so
                          * printing "₹0" over a booking would be a promise the
                          * office has to break at the door. Every line below
                          * is something the product already enforces in code.
                          */}
                        <View style={s.promise}>
                            <View style={s.promiseHead}>
                                <Icon name="shield" size={16} color={colors.accent} />
                                <Body style={s.promiseTitle}>No surprise at the door</Body>
                            </View>

                            {[
                                "The engineer inspects, then tells you the price before starting.",
                                "Work begins only once you read out your first code.",
                                "Every line of the bill is built in front of you.",
                            ].map((line) => (
                                <View key={line} style={s.promiseLine}>
                                    <Icon name="check" size={13} color={colors.ok} />
                                    <Small style={{ flex: 1 }}>{line}</Small>
                                </View>
                            ))}
                        </View>

                        {!hasAddress ? (
                            <View style={{ marginTop: space.lg }}>
                                <Notice tone="warn">
                                    We cannot send anybody without knowing where to go.
                                </Notice>
                                <Button tone="quiet" icon="navigation" busy={locating} onPress={locate}>
                                    Use my current location
                                </Button>
                            </View>
                        ) : null}
                    </>
                ) : null}

                <View style={{ marginTop: space.xl }}>
                    <Notice>{error}</Notice>
                </View>
            </ScrollView>

            {/*
              * The way on, docked, with the way back beside it.
              *
              * It used to sit at the foot of the scrolling page, so on the
              * step with six faults on it the button was below the fold and
              * the flow appeared to have no exit. A booking is a corridor -
              * the door at the end of it should be visible from anywhere in
              * the room.
              */}
            <View style={[s.dock, { paddingBottom: insets.bottom + space.md }]}>
                {step > 0 ? (
                    <Pressable
                        onPress={back}
                        style={s.dockBack}
                        android_ripple={null}
                        accessibilityLabel="Back a step"
                    >
                        <Icon name="arrow-left" size={19} color={colors.ink} />
                    </Pressable>
                ) : null}

                {/*
                  * What it is likely to come to, beside the button that starts
                  * it - the shape the reference kit uses on its own booking
                  * bar, and the right one: nobody should press a final button
                  * without a figure in view. Only on the last step, where the
                  * job is actually being committed to, and only when the
                  * office has a real price rather than a guess.
                  */}
                {current === "confirm" && !range.estimated ? (
                    <View style={s.dockPrice}>
                        <Small style={s.dockLabel}>USUALLY</Small>
                        <PriceRange range={range} size="sm" />
                    </View>
                ) : null}

                <View style={{ flex: 1 }}>
                    {current === "confirm" ? (
                        <Button icon="check" busy={busy} disabled={!hasAddress} onPress={book}>
                            {when ? "Book it \u00b7 " + when.label : "Book it"}
                        </Button>
                    ) : (
                        <Button icon="arrow-right" onPress={next}>
                            {(current === "issues" && !issues.length)
                                || (current === "describe" && issues.length && !description.trim())
                                ? "Skip this"
                                : "Continue"}
                        </Button>
                    )}
                </View>
            </View>

            <AddressPicker
                open={picking}
                items={addressBook.items}
                chosenId={chosen?._id}
                onPick={setChosenId}
                onClose={() => setPicking(false)}
                onManage={() => { setPicking(false); router.push("/addresses"); }}
            />
        </View>
    );
}

/**
 * Which address this job goes to.
 *
 * A sheet rather than a screen, because choosing is a two second decision in
 * the middle of booking and pushing a page loses the half-filled form behind
 * it. Managing the list - adding, editing, removing - is a screen of its own,
 * reached from the bottom of this one.
 */
const AddressPicker = ({ open, items, chosenId, onPick, onClose, onManage }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    return (
        <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.sheetBack} onPress={onClose} />

            <View style={[s.sheet, { backgroundColor: colors.canvas }]}>
                <View style={s.grabber} />

                <Greeting>Send somebody to</Greeting>

                <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                    {items.map((a) => {
                        const picked = String(a._id) === String(chosenId);

                        return (
                            <Pressable
                                key={a._id}
                                onPress={() => { onPick(a._id); onClose(); }}
                                style={[s.choice, picked && { borderColor: colors.accent }]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Body style={{ fontFamily: font.semibold }}>
                                        {a.label || "Address"}
                                    </Body>
                                    <Small numberOfLines={2}>{oneLine(a)}</Small>
                                </View>

                                {picked ? (
                                    <Icon name="check" size={18} color={colors.accent} />
                                ) : null}
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <Button tone="quiet" icon="map-pin" onPress={onManage} style={{ marginTop: space.md }}>
                    Manage addresses
                </Button>
            </View>
        </Modal>
    );
};

/**
 * One line of the booking, read back as a receipt reads.
 *
 * Label above value rather than beside it, and the label in small capitals:
 * on a summary card that is not a form's typography, it is a receipt's, and a
 * receipt is exactly what somebody is checking here before they commit.
 */
const SummaryRow = ({ icon, tone, label, value, note, action }) => {
    const s = useThemedStyles(makeStyles);
    const colors = useColors();

    return (
        <View style={s.summaryRow}>
            <View style={[s.summaryIcon, tone === "accent" ? s.summaryIconOn : null]}>
                <Icon
                    name={icon}
                    size={16}
                    color={tone === "accent" ? colors.accent : colors.inkSoft}
                />
            </View>

            <View style={{ flex: 1 }}>
                <Small style={s.summaryLabel}>{String(label).toUpperCase()}</Small>
                <Body style={s.summaryValue}>{value}</Body>
                {note ? <Small style={{ marginTop: 1 }}>{note}</Small> : null}
            </View>

            {/* Only where the row leads somewhere. A word rather than an icon,
                because "Change" says what happens and a chevron does not. */}
            {action ? (
                <Small style={{ color: colors.accent, fontFamily: font.semibold }}>{action}</Small>
            ) : null}
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    counts: {
        marginTop: space.xl,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },
    countRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    countDivided: { borderTopWidth: 1, borderTopColor: colors.hairline },
    countIcon: {
        width: 42, height: 42,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.iconSurface,
        alignItems: "center", justifyContent: "center",
    },
    countName: { fontFamily: font.semibold, fontSize: 14 },
    countNote: { fontSize: 11.5, marginTop: 1 },

    stepper: { flexDirection: "row", alignItems: "center", gap: space.md },
    step: {
        width: 30, height: 30, borderRadius: 15,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.hairlineStrong,
    },
    stepOff: { borderColor: colors.hairline },
    stepOn: { backgroundColor: colors.field, borderColor: colors.field },
    stepCount: { minWidth: 16, textAlign: "center", fontFamily: font.bold, fontSize: 15 },

    review: {
        marginTop: space.xl,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    reviewHead: { flexDirection: "row", gap: space.md },
    reviewChip: {
        alignSelf: "flex-start",
        paddingHorizontal: space.sm + 2,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: colors.accentTint,
    },
    reviewChipText: { fontFamily: font.semibold, fontSize: 10.5, color: colors.accentDeep },
    reviewName: { fontFamily: font.semibold, fontSize: 15, marginTop: 4, marginBottom: 2 },

    reviewRule: { height: 1, backgroundColor: colors.hairline, marginVertical: space.lg },
    reviewLine: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: space.lg,
        paddingVertical: 5,
    },
    reviewKey: { width: 104, fontSize: 12.5, color: colors.inkFaint },
    reviewValue: { flex: 1, fontSize: 12.5, textAlign: "right", color: colors.ink },

    // Dashed, as the reference draws the line above a total - it reads as a
    // tear-off rather than as another divider.
    reviewDashed: {
        height: 1,
        marginVertical: space.md,
        borderBottomWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.hairlineStrong,
    },
    reviewTotalKey: { flex: 1, fontFamily: font.semibold, fontSize: 14 },
    reviewTotalValue: { fontFamily: font.bold, fontSize: 14, color: colors.ok },

    top: {
        paddingBottom: space.lg,
        gap: space.lg,
    },
    steps: { paddingHorizontal: space.lg, gap: space.lg },
    stepRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
    stepNumber: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: colors.field,
        alignItems: "center", justifyContent: "center",
    },
    stepNumberText: { fontFamily: font.bold, fontSize: 11.5, color: colors.fieldInk },
    stepName: { flex: 1, fontFamily: font.semibold, fontSize: 13.5 },
    stepCount: { fontSize: 12, color: colors.inkFaint },
    back: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
        backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.hairline,
    },
    progress: { flex: 1, flexDirection: "row", gap: 6 },
    pip: { flex: 1, height: 5, borderRadius: 3 },

    // The line that introduces the day chips and then the time chips. It was
    // set in tracked capitals, which on a screen already carrying a question
    // in 34 point display type is a second heading shouting over the first.
    pick: { marginTop: space.xl, fontFamily: font.semibold, color: colors.inkSoft },


    // Two points of border rather than one, and the padding gives a point
    // back - so a tile does not grow by a pixel at the moment it is chosen
    // and nudge the one beside it.



    tick: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: colors.accentDeep,
        alignItems: "center", justifyContent: "center",
    },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xl },

    dock: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        backgroundColor: colors.canvas,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
    },
    dockPrice: { paddingRight: space.sm },
    dockLabel: {
        fontFamily: font.bold,
        fontSize: 9.5,
        letterSpacing: 0.6,
        color: colors.inkFaint,
    },

    dockBack: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: colors.sunken,
        alignItems: "center", justifyContent: "center",
    },

    summaryIcon: {
        width: 36, height: 36,
        borderRadius: radius.sm,
        backgroundColor: colors.sunken,
        alignItems: "center", justifyContent: "center",
    },
    summaryIconOn: { backgroundColor: colors.accentTint },
    summaryValue: { fontFamily: font.semibold, fontSize: 16, marginTop: 2 },

    estimate: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: space.lg,
        marginTop: space.lg,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    estimateLabel: { fontFamily: font.semibold, fontSize: 11.5, color: colors.inkFaint, marginBottom: 3 },
    estimateNote: { flex: 1, textAlign: "right", fontSize: 11.5 },

    promise: {
        marginTop: space.lg,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.sunkenSoft,
        gap: space.sm,
    },
    promiseHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
    promiseTitle: { fontFamily: font.semibold, fontSize: 15 },
    promiseLine: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },

    /*
     * The machine's name over its faults.
     *
     * Set as a heading rather than as another pill: it is not something to
     * press, and a row of pressable-looking things with one dead one among
     * them is the kind of detail that makes somebody tap twice and then doubt
     * the screen.
     */
    faultHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        marginTop: space.xl,
    },
    faultHeadIcon: {
        width: 26, height: 26,
        borderRadius: radius.sm,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },
    faultHeadText: { flex: 1, fontFamily: font.semibold, fontSize: 15 },
    faultHeadCount: { fontSize: 12, color: colors.inkFaint },

    faults: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: space.md,
        marginTop: space.xl,
    },

    // The gap above belongs to the heading once there is one, or the name
    // floats away from the faults it is naming.
    faultsUnderHead: { marginTop: space.md },
    fault: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        minHeight: 48,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.sunken,
    },
    faultOn: { backgroundColor: colors.field },
    faultText: { flex: 1, fontSize: 13.5, lineHeight: 17 },
    faultTextOn: { color: colors.fieldInk, fontFamily: font.semibold },

    aside: {
        flexDirection: "row",
        gap: space.md,
        marginTop: space.xl,
        padding: space.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.sunkenSoft,
    },
    asideIcon: {
        width: 34, height: 34,
        borderRadius: radius.sm,
        backgroundColor: colors.accentTint,
        alignItems: "center", justifyContent: "center",
    },

    writing: {
        marginTop: space.xl,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.surface,
        overflow: "hidden",
    },
    writingInput: {
        minHeight: 132,
        padding: space.lg,
        fontFamily: font.body,
        fontSize: 15.5,
        lineHeight: 23,
        color: colors.ink,
    },
    writingFoot: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
        backgroundColor: colors.sunkenSoft,
    },
    count: { fontFamily: font.semibold, color: colors.inkFaint },

    script: {
        width: 46, height: 46,
        borderRadius: radius.sm,
        backgroundColor: colors.sunken,
        alignItems: "center", justifyContent: "center",
    },
    scriptOn: { backgroundColor: colors.accentTint },
    scriptText: { fontFamily: font.bold, fontSize: 15, color: colors.inkSoft },
    scriptTextOn: { color: colors.accent },
    languageName: { fontFamily: font.semibold, fontSize: 16.5 },

    day: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.hairline,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        minWidth: 92,
    },
    dayOn: { backgroundColor: colors.field, borderColor: colors.field },
    dayLabel: { fontFamily: font.semibold, color: colors.ink },
    dayNote: { marginTop: 1 },
    dayInkOn: { color: colors.fieldInk },

    window: {
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.hairline,
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
    },
    windowOn: { backgroundColor: colors.field, borderColor: colors.field },

    language: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
    },
    languageOn: {
        borderColor: colors.field,
        borderWidth: 2,

        // The extra point of border comes out of the padding, so the row does
        // not grow by a pixel at the moment it is chosen.
        paddingHorizontal: space.lg - 1,
        paddingVertical: space.md - 1,
    },
    tick: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: colors.field,
        alignItems: "center", justifyContent: "center",
    },
    tickOff: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.hairlineStrong },

    summary: {
        marginTop: space.xl,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: space.lg,
        gap: space.lg,
    },
    sheetBack: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: {
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        paddingBottom: space.xxl,
    },
    grabber: {
        alignSelf: "center",
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.hairline,
        marginBottom: space.md,
    },
    choice: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        borderWidth: 1,
        borderColor: colors.hairline,
        borderRadius: radius.md,
        padding: space.md,
        marginTop: space.sm,
    },

    summaryRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: space.md,
    },
    // Small capitals, which on a summary card is a receipt's typography
    // rather than a form's - and a receipt is what is being checked here.
    summaryLabel: {
        fontFamily: font.bold,
        fontSize: 10,
        letterSpacing: 1.1,
        color: colors.inkFaint,
    },
});
