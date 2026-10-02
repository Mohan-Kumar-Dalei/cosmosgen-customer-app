import { useEffect, useRef } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, radius, space, useColors } from "./theme";

/**
 * What a customer sees when the app hits something it cannot draw.
 *
 * Without one of these, a mistake anywhere in a screen takes the whole app with
 * it: React unmounts everything and Android is left showing a white rectangle
 * with no way out but force-stopping it. Nobody reports that as a bug, they
 * report it as "the app stopped working", and it is the same to them whether
 * the fault was in the tracking map or in a date.
 *
 * So it is caught here and answered like a person would answer it: say plainly
 * that this screen could not be shown, give the one button that usually works,
 * and keep the rest of the app alive underneath. Expo Router calls this for any
 * error thrown while rendering - see the ErrorBoundary export in the layout.
 *
 * The message itself is kept out of the customer's way and behind a tap. It is
 * meaningless to them and useful to Mohan when they send a screenshot, which is
 * exactly the balance a crash screen needs.
 *
 * And it is not left to the screenshot. On its way to drawing this, the screen
 * tells the server what it caught, and the server hands it to Sentry along with
 * everything else - so a crash on somebody's phone in Rasulgarh is an email
 * here, rather than something nobody ever hears about. It costs one small
 * request and no package in the app at all.
 */
export const Broke = ({ error, retry }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    /*
     * Once for each fault, not once for each time this is drawn - a crash
     * screen re-renders with the keyboard, the theme, the safe area.
     */
    const told = useRef(false);

    useEffect(() => {
        if (told.current) return;
        told.current = true;

        api.post("/app/error", {
            app: "customer",
            message: String(error?.message || error || "Unknown error"),
            stack: String(error?.stack || ""),
            screen: Platform.OS + " " + String(Platform.Version),
            version: String(Constants.expoConfig?.version || ""),
        }).catch(() => {
            /*
             * Nothing. The one thing a crash reporter must never do is throw
             * from inside the screen that is already apologising for a throw.
             */
        });
    }, [error]);

    return (
        <View style={{
            flex: 1,
            backgroundColor: colors.canvas,
            paddingTop: insets.top + space.xxl,
            paddingBottom: insets.bottom + space.xl,
            paddingHorizontal: space.lg,
        }}>
            <Text style={{
                fontFamily: font.display,
                fontSize: 30,
                lineHeight: 36,
                color: colors.ink,
            }}>
                This screen could not be shown
            </Text>

            <Text style={{
                fontFamily: font.body,
                fontSize: 15,
                lineHeight: 22,
                color: colors.inkSoft,
                marginTop: space.sm,
            }}>
                Your job is safe and nothing has been lost. Try again, and if it
                keeps happening, send us a screenshot of this screen.
            </Text>

            <Pressable
                onPress={retry}
                style={{
                    marginTop: space.xl,
                    backgroundColor: colors.field,
                    borderRadius: radius.pill,
                    paddingVertical: 15,
                    alignItems: "center",
                }}
            >
                <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.fieldInk }}>
                    Try again
                </Text>
            </Pressable>

            {/* The part that is for us rather than for them. */}
            <ScrollView
                style={{
                    marginTop: space.xl,
                    borderRadius: radius.md,
                    backgroundColor: colors.sunken,
                    padding: space.md,
                }}
                contentContainerStyle={{ paddingBottom: space.sm }}
            >
                <Text style={{
                    fontFamily: font.body,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colors.inkFaint,
                }}>
                    {String(error?.message || error || "Unknown error")}
                </Text>
            </ScrollView>
        </View>
    );
};
