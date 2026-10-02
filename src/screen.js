import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJobs } from "./jobs";
import { TAB_BAR_SPACE } from "./TabBar";
import { space, useColors } from "./theme";
import { Display, Greeting, Lede, Notice } from "./ui";

/**
 * The scrolling body of a tab, under a bar that does not scroll with it.
 *
 * `bar` is a TopBar, and it sits outside the scroller on purpose: where the
 * company is standing and the way back to your own account should not have to
 * be scrolled back up to. Everything else - the heading, the lede, the page -
 * moves under it.
 *
 * What this also carries is the pull-to-refresh, which is the manual way back
 * to the truth whenever the socket missed something.
 */
export const Screen = ({ bar, bleed = false, eyebrow, title, lede, right, onRefresh, children, style }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const { reload, error } = useJobs();
    const [refreshing, setRefreshing] = useState(false);

    const refresh = async () => {
        setRefreshing(true);
        await Promise.all([reload(), onRefresh?.()]);
        setRefreshing(false);
    };

    return (
        <View style={{ flex: 1 }}>
            {/*
              * `bleed` is for a bar that is a filled block rather than a row
              * of controls - the home screen's coloured band, which has to run
              * to both edges and up under the status bar to read as the top of
              * the page instead of as the first card on it. It handles its own
              * top inset; everything else is still given one here.
              */}
            {bar
                ? (bleed ? bar : <View style={{ paddingTop: insets.top + space.sm }}>{bar}</View>)
                : null}

            <ScrollView
                style={{ flex: 1, backgroundColor: "transparent" }}
                contentContainerStyle={[
                    {
                        paddingHorizontal: space.lg,
                        paddingTop: bar ? space.sm : insets.top + space.lg,

                        // The bar floats over the page rather than sitting
                        // under it, so the last card ends above where the bar
                        // starts - measured from the bar itself rather than
                        // guessed
                        paddingBottom: insets.bottom + TAB_BAR_SPACE + space.lg,
                    },
                    style,
                ]}
                /*
                 * Pull down to read it all again.
                 *
                 * The grey ring Android draws by default is what Mohan saw
                 * sitting on the home screen looking like a button somebody
                 * had left there. It is the platform's own control and it
                 * cannot be replaced, but it can be told what to look like:
                 * the arrow takes the app's blue, the disc behind it takes the
                 * card colour, and it is pulled down far enough to clear the
                 * header band before it appears.
                 */
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        colors={[colors.field]}
                        tintColor={colors.field}
                        progressBackgroundColor={colors.surface}
                        progressViewOffset={24}
                    />
                }
                showsVerticalScrollIndicator={false}

                // A tap while the keyboard is up reaches the control it landed
                // on rather than being spent closing the keyboard - the
                // account screen is a form inside this scroller, and its Save
                // button sits under the thumb the moment somebody stops
                // typing.
                keyboardShouldPersistTaps="handled"

                /*
                 * `removeClippedSubviews` was here and had to go.
                 *
                 * It detaches views that have scrolled out of sight, which
                 * sounds like a saving and on Android leaves them detached
                 * when the tree re-renders underneath it. Switching the phone
                 * from dark to light rebuilds every style in the app, and
                 * after that the page would not scroll to its end - the foot
                 * of it had been clipped away and never came back. That is the
                 * bug where the signature at the bottom could not be reached.
                 */
            >
                {/*
                  * The greeting is spoken, not stamped.
                  *
                  * This line used to be an Eyebrow - nine point, bold,
                  * uppercase, letter-spaced - which is the typography of a
                  * notice board. It said HELLO, MOHAN in the voice a municipal
                  * form uses to say APPLICANT NAME, and it was the first thing
                  * on every screen of the app. Set in plain sentence case it
                  * reads as somebody talking, which is what it always was.
                  */}
                {(eyebrow || right) ? (
                    <View style={HEAD}>
                        <View style={{ flex: 1 }}>
                            <Greeting>{eyebrow}</Greeting>
                        </View>
                        {right}
                    </View>
                ) : null}

                {title ? <Display>{title}</Display> : null}
                {lede ? <Lede style={{ marginTop: space.sm }}>{lede}</Lede> : null}

                <View style={{ marginTop: space.lg }}>
                    <Notice>{error}</Notice>
                    {children}
                </View>
            </ScrollView>
        </View>
    );
};

/*
 * No colours in it, so it is built once rather than per theme.
 *
 * A right-hand control is a tap target, and a tap target is taller than the
 * line of text beside it - so the row is given the height rather than letting
 * the control push the heading down the page.
 */
const HEAD = {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.sm,
    minHeight: 36,
};
