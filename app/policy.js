import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageHeader } from "../src/PageHeader";
import { font, space, useThemedStyles } from "../src/theme";
import { Body, Title } from "../src/ui";

/**
 * What the company commits to in writing.
 *
 * One screen for both documents because they are read in the same situation -
 * somebody looking for the rule that applies to the thing that just happened -
 * and the reference kit puts them on one page for the same reason. Which
 * heading it opens on comes from the link that got here.
 *
 * Written out properly rather than filled with placeholder prose. A policy
 * screen carrying lorem ipsum is worse than no policy screen: it looks like
 * there are terms when there are none, and the first person to read it closely
 * is somebody already unhappy.
 *
 * These describe what the product actually does today. When Mohan has a lawyer
 * write the real ones they replace the bodies here and nothing else changes.
 */
const SECTIONS = [
    {
        key: "cancellation",
        title: "Cancellation",
        paras: [
            "A job can be cancelled from Your jobs at any time before an engineer has accepted "
            + "it. Nothing has been committed by then and nothing is charged.",

            "Once an engineer has accepted, they may already be on their way. Cancelling from "
            + "that point asks the office rather than ending the job outright, and the office "
            + "decides - if somebody has travelled to your door, a visit charge may apply to "
            + "cover the trip.",

            "The office can cancel a job at any point, and tells you why when it does.",
        ],
    },
    {
        key: "privacy",
        title: "Privacy",
        paras: [
            "The company holds your name, your phone number, the addresses you save and the "
            + "history of jobs booked on the account. That is what is needed to send somebody "
            + "to your door and to bill you for the work.",

            "Your address and number are given to the engineer assigned to your job, and to "
            + "nobody else. They are not sold, and they are not shared with any other company.",

            "Your location is read only while you are choosing where a job should go, and while "
            + "a job is running so you can watch the engineer approach. It is not recorded when "
            + "the app is closed.",

            "A rating you leave is read by the office and shown on the trade's page without your "
            + "full name - a first name and a month, and nothing that identifies your household.",

            "Ask the office to delete your account and everything above goes with it, apart from "
            + "the invoices the company is required to keep.",
        ],
    },
    {
        key: "terms",
        title: "Terms and conditions",
        paras: [
            "Prices shown in the app before a visit are indicative. The figure that counts is the "
            + "itemised bill the engineer raises in front of you, and no work starts until you "
            + "have agreed to it.",

            "Every engineer sent is approved by this company. They carry the company's own "
            + "identity and are named to you before they set off.",

            "A job starts and closes on two codes read out from your phone. Do not give either "
            + "code to anybody before the work they cover has actually been done.",

            "Cosmosgen will never telephone you to ask for a sign-in code or a door code. Type "
            + "them into the app and nowhere else.",

            "Payment is due when the work is finished, in cash or online as the bill was raised. "
            + "GST is charged where it applies and is shown as its own line.",
        ],
    },
];

export default function Policy() {
    const { at } = useLocalSearchParams();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    // Opened from "Terms and conditions" rather than from "Privacy policy", so
    // the heading somebody tapped is the one at the top.
    const ordered = at === "terms"
        ? [...SECTIONS].sort((a, b) => (a.key === "terms" ? -1 : b.key === "terms" ? 1 : 0))
        : SECTIONS;

    return (
        <View style={s.page}>
            <PageHeader title={at === "terms" ? "Terms and conditions" : "Privacy policy"} />

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: space.lg,
                    paddingBottom: insets.bottom + space.xxl,
                }}
                showsVerticalScrollIndicator={false}
            >
                {ordered.map((section) => (
                    <View key={section.key} style={{ marginBottom: space.xl }}>
                        <Title style={s.heading}>{section.title}</Title>

                        {section.paras.map((para, i) => (
                            <Body key={i} style={s.para}>{para}</Body>
                        ))}
                    </View>
                ))}

                <Body style={s.foot}>
                    These are the rules the product runs by today. If any of it changes you will
                    be told in the app before it applies to a job you have booked.
                </Body>
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    heading: { fontSize: 18, marginTop: space.lg, marginBottom: space.sm },
    para: {
        fontSize: 13.5,
        lineHeight: 21,
        color: colors.inkSoft,
        marginTop: space.md,
    },
    foot: {
        fontSize: 12.5,
        lineHeight: 19,
        color: colors.inkFaint,
        fontFamily: font.medium,
        marginTop: space.lg,
    },
});
