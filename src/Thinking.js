import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { font, space, useColors, useThemedStyles } from "./theme";

/* One unhurried pass of light across the word. */
const SWEEP_MS = 1800;
const WORD_W = 96;

/**
 * What the assistant shows while it is composing.
 *
 * One word with light moving slowly over it, and nothing else. There were
 * three bouncing balls here as well, and a version before that where they
 * swung round a circle - both of which Mohan asked for and then asked to go,
 * which is the right call and a common one: a waiting state has to survive
 * being watched for fifteen seconds without becoming the most interesting
 * thing on the screen, and a word that breathes does that where a juggling
 * act does not.
 *
 * Nothing else is drawn with it. The assistant's mark and its name wait for
 * the reply - a byline belongs over something somebody said, and until the
 * answer lands nothing has been said.
 *
 * The sweep is opacity and transform on the native driver, which is the point
 * rather than a detail. The thread this is meant to reassure somebody about
 * is the JS thread, and an animation that ran on it would stutter at exactly
 * the moment the machine got busy - which is precisely when it is on screen.
 */
export const Thinking = () => {
    const colors = useColors();
    const s = useThemedStyles(makeStyles);
    const sweep = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(sweep, {
                toValue: 1,
                duration: SWEEP_MS,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );

        loop.start();
        return () => loop.stop();
    }, [sweep]);

    return (
        <View style={s.box}>
            {/*
              * The mask is the text itself, so the gradient is only ever
              * visible inside the letterforms - which is what makes it read
              * as the word catching light rather than as a bar sliding past
              * behind it.
              */}
            <MaskedView
                style={s.mask}
                maskElement={<Text style={s.word}>Thinking...</Text>}
            >
                <View style={s.base} />

                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            transform: [{
                                translateX: sweep.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-WORD_W, WORD_W],
                                }),
                            }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={["transparent", colors.ink, "transparent"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </MaskedView>
        </View>
    );
};

const makeStyles = (colors) => StyleSheet.create({
    box: { height: 22, justifyContent: "center", paddingHorizontal: space.xs },

    mask: { width: WORD_W, height: 20 },
    word: {
        fontFamily: font.semibold,
        fontSize: 14,
        lineHeight: 20,

        // Whatever colour this is, only its coverage matters - a mask reads
        // the shape, not the paint.
        color: "#000000",
    },

    // The word at rest, under the light. It has to be legible on its own,
    // because the sweep spends half its cycle off either end.
    base: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.inkFaint },
});
