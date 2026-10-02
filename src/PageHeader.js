import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, space, useColors, useThemedStyles } from "./theme";
import { Icon } from "./Icon";

/**
 * A circled arrow, a centred title, and whatever the screen needs on the right.
 *
 * Nearly every screen in the reference kit that is not the home page wears
 * exactly this: Enter your location, Confirm address, Review summary, My
 * bookings, Cancel booking, Notification, Category, Bookmark, Add address. One
 * component for all of them is what keeps the arrow the same size and the title
 * on the same baseline across a dozen pages, which is most of what makes them
 * look like one app.
 *
 * The filled blue band is deliberately not here. It belongs to the home screen,
 * where it carries the address and the search; Mohan asked for it off
 * everywhere else - "har page main header blue wala dikhane ki zaroorat nehi
 * hai" - and he is right. A colour that means "you are at the top of the app"
 * stops meaning anything if every page has it.
 *
 * The title is optically centred rather than centred between the controls. It
 * sits in the middle of the screen whatever is beside it, so a page with one
 * button on the right and a page with none do not have their headings in
 * slightly different places.
 */
export const PageHeader = ({ title, right, onBack, bare = false }) => {
    const router = useRouter();
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const back = onBack || (() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)");
    });

    return (
        <View style={[s.bar, { paddingTop: insets.top + space.sm }]}>
            <Pressable
                onPress={back}
                hitSlop={10}
                android_ripple={null}
                style={s.circle}
                accessibilityLabel="Back"
            >
                <Icon name="arrow-left" size={19} color={colors.ink} />
            </Pressable>

            {/* Absolute, so the title does not shift when the right-hand side
                gains or loses a control. */}
            {title && !bare ? (
                <View pointerEvents="none" style={s.titleWrap}>
                    <Text style={s.title} numberOfLines={1}>{title}</Text>
                </View>
            ) : null}

            <View style={{ flex: 1 }} />

            {right || null}
        </View>
    );
};

/** The same disc the back arrow sits in, for a control on the right. */
export const HeaderButton = ({ icon, onPress, label, children }) => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);

    return (
        <Pressable
            onPress={onPress}
            hitSlop={10}
            android_ripple={null}
            style={s.circle}
            accessibilityLabel={label}
        >
            {children || <Icon name={icon} size={18} color={colors.ink} />}
        </Pressable>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    bar: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingHorizontal: space.lg,
        paddingBottom: space.md,
    },

    circle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        alignItems: "center", justifyContent: "center",
    },

    titleWrap: {
        position: "absolute",
        left: 0, right: 0, bottom: space.md,
        alignItems: "center",
    },
    title: {
        maxWidth: "62%",
        fontFamily: font.semibold,
        fontSize: 16.5,
        color: colors.ink,
    },
});
