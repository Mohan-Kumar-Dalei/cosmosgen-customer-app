import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WHATSAPP_LINK } from "../src/brand";
import { AiMark, WhatsAppMark } from "../src/Marks";
import { PageHeader } from "../src/PageHeader";
import { font, radius, space, useColors, useThemedStyles } from "../src/theme";
import { Body, Empty, Small } from "../src/ui";
import { Icon } from "../src/Icon";

/**
 * The questions people actually ask, and the ways to reach the company.
 *
 * Two tabs, as the reference sets it. Everything on the first is answered from
 * what this product actually does - a question here is a promise, and an answer
 * copied out of a template is the fastest way to make a customer believe
 * something that is not true of this company.
 *
 * On the second tab, Customer Service is listed and says plainly that it is not
 * staffed yet. Mohan's position is that support will be a person in time - "age
 * take over karein customer support toh insaan hin baat karega" - so the row
 * belongs here now and fills in later. What it must not do in the meantime is
 * promise a reply nobody is reading; it points at the assistant, which does
 * answer, and names it as an assistant.
 */
const GROUPS = ["All", "Booking", "The visit", "Money", "Account"];

const FAQS = [
    {
        group: "Booking",
        q: "What if I need to cancel a booking?",
        a: "While nobody has been assigned yet you can cancel it yourself from Your jobs. "
            + "Once an engineer has accepted and is on the way, tap Cancel and the office is "
            + "asked - somebody has already set off by then, so the decision is theirs rather "
            + "than automatic.",
    },
    {
        group: "Booking",
        q: "How soon will somebody come?",
        a: "Book for as soon as possible and the office looks for the nearest engineer who does "
            + "that trade straight away. Book for a day and a window and it is held for that slot. "
            + "You are told who is coming only once they have accepted the job.",
    },
    {
        group: "The visit",
        q: "Do I need to be home during the service?",
        a: "Yes. The job starts and finishes on two codes that are on your phone, and the bill is "
            + "agreed with you at the door - none of that works without somebody there. If you "
            + "cannot be, the person who will be needs your phone to read the codes from.",
    },
    {
        group: "The visit",
        q: "What are the two codes for?",
        a: "One starts the job and one closes it, and you read both out. Nothing can be marked "
            + "started before you are ready and nothing can be marked finished until you say it "
            + "is - that is the whole point of them.",
    },
    {
        group: "The visit",
        q: "Can I see the engineer on the way?",
        a: "Once they have accepted and set off, the job in Your jobs shows them moving on a map "
            + "with their name and number. Before they accept there is nobody to show.",
    },
    {
        group: "Money",
        q: "When do I pay, and how?",
        a: "Nothing is charged when you book. The engineer prices the work in front of you before "
            + "starting, and you pay in cash, online, or part in cash and part online - whichever "
            + "the job was set up as. The bill is itemised and you see every line.",
    },
    {
        group: "Money",
        q: "What if the customer refuses the quote?",
        a: "You can say no after the engineer has looked. A visit charge covers the trip and "
            + "nothing else, and the office confirms the figure before it is billed.",
    },
    {
        group: "Account",
        q: "How can I edit my profile information?",
        a: "Account, then Your profile. Your name and address can be changed at any time. The "
            + "phone number is what the account is, so it cannot be edited - a new number means "
            + "signing in with it.",
    },
    {
        group: "Account",
        q: "Is it safe to use this app?",
        a: "Your number is verified by a code on WhatsApp and nothing else is stored to sign you "
            + "in - there is no password to lose. Cosmosgen will never ring you and ask for that "
            + "code. Type it in the app and nowhere else.",
    },
];

const CONTACTS = [
    {
        key: "service",
        icon: "headphones",
        label: "Customer service",
        body: "A person will answer here once the desk is staffed. Until then the fastest answer "
            + "is the assistant, which knows your jobs and what the company charges.",
        action: { label: "Open Ask AI", to: "/(tabs)/ask" },
    },
    {
        key: "whatsapp",
        mark: WhatsAppMark,
        label: "WhatsApp",
        body: "Message the company directly. Bookings, questions and the door codes all run "
            + "through here.",
        action: { label: "Open WhatsApp", url: WHATSAPP_LINK },
    },
    {
        key: "assistant",
        mark: AiMark,
        label: "Ask AI",
        body: "Describe what the machine is doing and it will tell you what it usually is, what "
            + "it tends to cost, and whether we cover your street.",
        action: { label: "Ask a question", to: "/(tabs)/ask" },
    },
];

export default function Help() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const [tab, setTab] = useState("FAQ");
    const [term, setTerm] = useState("");
    const [group, setGroup] = useState("All");
    const [open, setOpen] = useState(null);

    const query = term.trim().toLowerCase();

    const shown = useMemo(() => FAQS.filter((item) => {
        if (group !== "All" && item.group !== group) return false;
        if (!query) return true;
        return (item.q + " " + item.a).toLowerCase().includes(query);
    }), [group, query]);

    return (
        <View style={s.page}>
            <PageHeader title="Help Centre" />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + space.xxl,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={s.search}>
                    <Icon name="search" size={17} color={colors.inkFaint} />
                    <TextInput
                        value={term}
                        onChangeText={setTerm}
                        placeholder="Search"
                        placeholderTextColor={colors.inkFaint}
                        style={s.searchInput}
                        returnKeyType="search"
                        autoCorrect={false}
                    />
                    {term ? (
                        <Pressable onPress={() => setTerm("")} hitSlop={10}>
                            <Icon name="x-circle" size={16} color={colors.inkFaint} />
                        </Pressable>
                    ) : null}
                </View>

                {/* ---- the two halves ---- */}
                <View style={s.tabs}>
                    {["FAQ", "Contact us"].map((name) => {
                        const on = tab === name;

                        return (
                            <Pressable
                                key={name}
                                onPress={() => { setTab(name); setOpen(null); }}
                                android_ripple={null}
                                style={[s.tab, on ? s.tabOn : null]}
                            >
                                <Body style={[s.tabText, on ? s.tabTextOn : null]}>{name}</Body>
                            </Pressable>
                        );
                    })}
                </View>

                {tab === "FAQ" ? (
                    <>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: space.sm, paddingVertical: space.lg }}
                            style={s.chips}
                        >
                            {GROUPS.map((name) => {
                                const on = group === name;

                                return (
                                    <Pressable
                                        key={name}
                                        onPress={() => { setGroup(name); setOpen(null); }}
                                        android_ripple={null}
                                        style={[s.chip, on ? s.chipOn : null]}
                                    >
                                        <Small style={[s.chipText, on ? s.chipTextOn : null]}>
                                            {name}
                                        </Small>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {!shown.length ? (
                            <Empty
                                icon="search"
                                title="Nothing matches that"
                                hint="Try fewer words, or ask the assistant - it can answer things this list cannot."
                            />
                        ) : (
                            /*
                             * One card, divided by hairlines.
                             *
                             * Every question used to be its own bordered box
                             * with a gap under it, which is eight cards down a
                             * page that is one list - Mohan called it out and
                             * he is right. A divider between rows says "these
                             * are the same kind of thing"; a gap between cards
                             * says "these are separate things", and a set of
                             * questions is not.
                             */
                            <View style={s.card}>
                                {shown.map((item, i) => (
                                    <Fold
                                        key={item.q}
                                        title={item.q}
                                        first={i === 0}
                                        open={open === item.q}
                                        onPress={() => setOpen(open === item.q ? null : item.q)}
                                        s={s}
                                        colors={colors}
                                    >
                                        <Small style={s.answer}>{item.a}</Small>
                                    </Fold>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <View style={[s.card, { marginTop: space.lg }]}>
                        {CONTACTS.map((item, i) => (
                            <Fold
                                key={item.key}
                                title={item.label}
                                icon={item.icon}
                                mark={item.mark}
                                first={i === 0}
                                open={open === item.key}
                                onPress={() => setOpen(open === item.key ? null : item.key)}
                                s={s}
                                colors={colors}
                            >
                                <Small style={s.answer}>{item.body}</Small>

                                <Pressable
                                    onPress={() => (item.action.url
                                        ? Linking.openURL(item.action.url).catch(() => {})
                                        : router.push(item.action.to))}
                                    android_ripple={null}
                                    style={s.go}
                                >
                                    <Small style={s.goText}>{item.action.label}</Small>
                                    <Icon name="arrow-right" size={14} color={colors.field} />
                                </Pressable>
                            </Fold>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

/**
 * A row that opens.
 *
 * The chevron turns rather than swapping to a different glyph - the same mark
 * rotating says "this is the same control, in its other state", where two
 * different arrows say "something has been replaced".
 */
const Fold = ({ title, icon, mark: Mark, first, open, onPress, children, s, colors }) => (
    <View style={[s.fold, first ? null : s.divided, open ? s.foldOpen : null]}>
        <Pressable onPress={onPress} android_ripple={null} style={s.foldHead}>
            {Mark ? (
                <Mark size={18} color={colors.field} />
            ) : icon ? (
                <Icon name={icon} size={17} color={colors.field} />
            ) : null}

            <Body style={s.foldTitle}>{title}</Body>

            <Icon
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.inkSoft}
            />
        </Pressable>

        {open ? <View style={s.foldBody}>{children}</View> : null}
    </View>
);

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    search: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        height: 48,
        paddingHorizontal: space.lg,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    searchInput: {
        flex: 1,
        fontFamily: font.body,
        fontSize: 14,
        color: colors.ink,
        paddingVertical: 0,
    },

    // Underlined rather than filled - these are halves of one page, not two
    // buttons of equal weight.
    tabs: {
        flexDirection: "row",
        marginTop: space.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        paddingBottom: space.md,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabOn: { borderBottomColor: colors.field },
    tabText: { fontSize: 14, color: colors.inkSoft },
    tabTextOn: { fontFamily: font.semibold, color: colors.field },

    chips: { marginHorizontal: -space.lg, flexGrow: 0 },
    chip: {
        height: 36,
        justifyContent: "center",
        paddingHorizontal: space.lg,
        borderRadius: radius.sm + 4,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
    },
    chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
    chipText: { fontSize: 13, fontFamily: font.medium, color: colors.inkSoft },
    chipTextOn: { color: colors.canvas, fontFamily: font.semibold },

    card: {
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        overflow: "hidden",
    },

    fold: {},

    // On the row rather than between them, so the first never draws a line
    // against the card's own top edge.
    divided: { borderTopWidth: 1, borderTopColor: colors.hairline },

    // An open row is tinted rather than outlined - a border inside a card is a
    // box in a box.
    foldOpen: { backgroundColor: colors.sunkenSoft },
    foldHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.lg - 2,
    },
    foldTitle: { flex: 1, fontSize: 13.5, fontFamily: font.medium, lineHeight: 19 },
    foldBody: {
        paddingHorizontal: space.lg,
        paddingBottom: space.lg,
        gap: space.md,
    },
    answer: { fontSize: 13, lineHeight: 20 },

    go: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
    goText: { fontFamily: font.semibold, fontSize: 13, color: colors.field },
});
