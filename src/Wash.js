import { StyleSheet, View } from "react-native";
import { useColors } from "./theme";

/**
 * The ground every screen sits on: warm paper, and nothing over it.
 *
 * There used to be two soft radial gradients here - the accent blue across the
 * top at thirteen per cent, the brand green low and to the right at nine - put
 * in when the app was flat and lifeless and looked like it had had its design
 * taken off. They were the right idea then and they are wrong now, because the
 * design arrived: warm paper, pristine cards, real type.
 *
 * And they were actively fighting it. Thirteen per cent of a cold blue laid
 * over #faf8f4 turns the top of the page grey, and the green turns the bottom
 * corner of it faintly sour - which is exactly what Mohan saw and called the
 * grey stone. A warm palette only reads as warm if nothing cold is sitting on
 * top of it.
 *
 * It stays a component rather than becoming a background colour on each
 * screen, because every screen already renders one and because the tab
 * navigator draws exactly one of these behind five transparent scenes. One
 * flat view is also the cheapest thing this file has ever been.
 */
export const Wash = () => {
    const colors = useColors();

    return (
        <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }]}
        />
    );
};
