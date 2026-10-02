import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, space, useColors, useThemedStyles } from "./theme";

/**
 * A picture that fills the top of the screen and a white sheet that slides up
 * over the bottom of it.
 *
 * Six screens in the reference kit Mohan picked are this one shape - the
 * welcome page, each step of the introduction, the location question, and the
 * screens either side of signing in. Building it once is what keeps the corner
 * radius, the gap and the shadow identical across all of them, which is most
 * of what makes a set of screens look like one app rather than six.
 *
 * The sheet is pulled up over the artwork rather than butted against it. That
 * overlap is the whole trick: a panel that starts where a picture ends reads as
 * two blocks stacked, and one that covers the picture's last few points reads
 * as a card lying on top of it.
 *
 * Nothing here scrolls. Every screen that uses it is a single question with one
 * button, and a page of that shape which scrolls is a page somebody has put too
 * much on.
 */
export const Sheet = ({ art, children, foot, artStyle, style }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    return (
        <View style={[s.page, style]}>
            <View style={[s.art, artStyle]}>{art}</View>

            <View style={[s.sheet, { paddingBottom: insets.bottom + space.xl }]}>
                <View style={{ flex: 1 }}>{children}</View>

                {/* The controls, held at the foot of the sheet rather than
                    left to float wherever the text above them ends. */}
                {foot ? <View style={s.foot}>{foot}</View> : null}
            </View>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas },

    /*
     * The picture takes whatever the sheet does not.
     *
     * Given as a flex share rather than a height so the same screen works on a
     * 5 inch handset and a tablet - on the short one the artwork gives up its
     * room first, which is the right thing to lose.
     */
    art: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },

    sheet: {
        paddingHorizontal: space.xl,
        paddingTop: space.xxl,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        backgroundColor: colors.surface,

        // Pulled up over the artwork. See the note above - this overlap is
        // what makes the sheet read as lying on the picture.
        marginTop: -radius.lg,
    },

    foot: { marginTop: space.xl },
});
