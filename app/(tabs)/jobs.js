import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { JobCard } from "../../src/JobCard";
import { useJobs } from "../../src/jobs";
import { Bones, JobCardBone } from "../../src/Skeleton";
import { Screen } from "../../src/screen";
import { PageHeader } from "../../src/PageHeader";
import { font, radius, space, useColors, useThemedStyles } from "../../src/theme";
import { Button, Empty, Small } from "../../src/ui";
import { Icon } from "../../src/Icon";

/**
 * Everything asked for so far: what is running, and what is finished.
 *
 * Both halves arrive in one request, so this never shows half a page while the
 * other half is still coming. The running jobs are first because they are the
 * ones with something to do on them; the finished ones are the record - the
 * invoice, the date, who came - which is what somebody comes back for months
 * later, and why there is a search box above them.
 */

/** Everything about one job that somebody might reasonably type. */
const haystack = (t) => [
    t.ticketNumber,
    t.serviceLabel,
    t.problemDescription,
    t.technician?.name,
    t.bill?.invoiceNumber,
    ...(t.selectedIssues || []),
].filter(Boolean).join(" ").toLowerCase();

/**
 * The three states a customer thinks in.
 *
 * "Upcoming" is anything still moving - booked, assigned, on the way, waiting
 * to be paid. The app's own statuses are finer than that and the customer does
 * not care about the difference until they open the job.
 */
const TABS = ["Upcoming", "Completed", "Cancelled"];

export default function Jobs() {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const { open, closed, loading } = useJobs();

    const [term, setTerm] = useState("");
    const [tab, setTab] = useState(TABS[0]);
    const query = term.trim().toLowerCase();

    /*
     * Filtered here rather than on the server.
     *
     * Every job this customer has is already on the phone - the list arrives
     * whole - so a request per keystroke would be a round trip to find
     * something that is sitting in memory, and would stop working the moment
     * the signal did.
     */
    const [liveJobs, pastJobs] = useMemo(() => {
        if (!query) return [open, closed];
        const match = (t) => haystack(t).includes(query);
        return [open.filter(match), closed.filter(match)];
    }, [query, open, closed]);

    /*
     * Which of the three is on screen.
     *
     * Cancelled jobs arrive inside `closed` - the server's "closed" means
     * "not running" rather than "done" - so they are pulled back out here
     * rather than asked for separately.
     */
    const shown = useMemo(() => {
        if (tab === "Upcoming") return liveJobs;

        const cancelled = (t2) => String(t2.status || "").toLowerCase() === "cancelled";
        return tab === "Cancelled" ? pastJobs.filter(cancelled) : pastJobs.filter((x) => !cancelled(x));
    }, [tab, liveJobs, pastJobs]);

    const nothing = !liveJobs.length && !pastJobs.length;
    const anything = open.length || closed.length;

    return (
        <Screen
            bar={<PageHeader title="My bookings" bare />}
            bleed
            title="My bookings"
            lede="Open one to see who is coming, where they have reached, and what it came to."
        >
            {loading ? (
                <Bones of={JobCardBone} count={3} gap={space.md} />
            ) : !anything ? (
                <Empty
                    icon="briefcase"
                    title="Nothing booked yet"
                    hint="When you book something it appears here, and stays here once it is finished."
                >
                    <Button icon="arrow-right" onPress={() => router.push("/(tabs)/services")}>
                        See what we do
                    </Button>
                </Empty>
            ) : (
                <>
                    {/* ---- finding one job among a year of them ---- */}
                    <View style={s.search}>
                        <Icon name="search" size={16} color={colors.inkFaint} />
                        <TextInput
                            value={term}
                            onChangeText={setTerm}
                            placeholder="Search by service, invoice, engineer…"
                            placeholderTextColor={colors.inkFaint}
                            style={s.input}
                            returnKeyType="search"
                            autoCorrect={false}
                        />
                        {term ? (
                            <Pressable onPress={() => setTerm("")} hitSlop={10} style={s.clear}>
                                <Icon name="x" size={14} color={colors.inkSoft} />
                            </Pressable>
                        ) : null}
                    </View>

                    {query ? (
                        <Small style={{ marginTop: space.sm }}>
                            {liveJobs.length + pastJobs.length} of {open.length + closed.length} jobs
                        </Small>
                    ) : null}

                    {/*
                      * Three tabs rather than two headed lists.
                      *
                      * The reference kit splits bookings into Upcoming,
                      * Completed and Cancelled, and the third is the one that
                      * earns the change: a cancelled job used to sit among the
                      * finished ones under "Finished", which is the wrong word
                      * for it and buries the row somebody is most likely
                      * hunting for.
                      */}
                    <View style={s.tabs}>
                        {TABS.map((name) => {
                            const on = tab === name;

                            return (
                                <Pressable
                                    key={name}
                                    onPress={() => setTab(name)}
                                    android_ripple={null}
                                    style={[s.tab, on ? s.tabOn : null]}
                                >
                                    <Small style={[s.tabText, on ? s.tabTextOn : null]}>
                                        {name}
                                    </Small>
                                </Pressable>
                            );
                        })}
                    </View>

                    {nothing ? (
                        <Empty
                            icon="search"
                            title="Nothing matches that"
                            hint={'No job here mentions "' + term.trim() + '". Try the service name, the invoice number, or who came.'}
                        />
                    ) : (
                        <View style={{ gap: space.md, marginTop: space.lg }}>
                            {shown.length ? (
                                shown.map((ticket) => <JobCard key={ticket.id} ticket={ticket} />)
                            ) : (
                                <Empty
                                    icon={tab === "Cancelled" ? "x-circle" : "clipboard"}
                                    title={tab === "Upcoming"
                                        ? "Nothing running"
                                        : tab === "Completed"
                                            ? "Nothing finished yet"
                                            : "Nothing cancelled"}
                                    hint={tab === "Upcoming"
                                        ? "Book something and it appears here while it is under way."
                                        : "Jobs move here once they are closed off."}
                                />
                            )}
                        </View>
                    )}
                </>
            )}
        </Screen>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    // Underlined rather than filled: these are three views of one list, not
    // three buttons of equal weight.
    tabs: {
        flexDirection: "row",
        marginTop: space.lg,
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
    tabText: { fontSize: 13.5, color: colors.inkSoft },
    tabTextOn: { fontFamily: font.semibold, color: colors.field },

    // The same bar as the one on the home screen: sunken, pill, hairline.
    // Two search boxes in one app that look like two different controls is
    // how an app starts feeling like several apps stitched together.
    search: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        height: 52,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.sunken,
    },
    input: {
        flex: 1,
        height: 52,
        fontFamily: font.body,
        fontSize: 14.5,
        color: colors.ink,
    },
    clear: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: colors.sunken,
        alignItems: "center", justifyContent: "center",
    },
});
