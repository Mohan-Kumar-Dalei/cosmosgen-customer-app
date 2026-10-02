import * as ImagePicker from "expo-image-picker";
import { api, errorFrom } from "./api";

/**
 * Taking a picture, and getting it onto ImageKit.
 *
 * Two places need this and they are the only two: a customer's own profile
 * picture, and the photographs somebody attaches to a rating. Both go up
 * through the server rather than straight to ImageKit, because the upload key
 * belongs on the server and an app that carries one is an app anybody can pull
 * it out of.
 *
 * The camera and the gallery are both offered because both are right depending
 * on the moment: a finished kitchen is photographed there and then, and a
 * profile picture is almost always one somebody already has.
 */

/** Asks, and says plainly when the answer is no. */
const allowed = async (fromCamera) => {
    const ask = fromCamera
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;

    const res = await ask();
    return res.granted;
};

/**
 * Opens the camera or the gallery and returns a local file, or nothing.
 *
 * Squared and shrunk before it leaves the phone. A modern handset takes a
 * four megabyte photograph and none of these are ever shown larger than a
 * phone's width - sending the original would cost the customer their data for
 * detail nobody sees.
 */
export const pickPhoto = async ({ camera = false, square = false } = {}) => {
    if (!(await allowed(camera))) {
        return { ok: false, message: camera
            ? "The camera is not allowed for this app. Turn it on in Settings."
            : "Photos are not allowed for this app. Turn it on in Settings." };
    }

    const open = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;

    const res = await open({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: square ? [1, 1] : undefined,
        quality: 0.7,
    });

    if (res.canceled || !res.assets?.length) return { ok: false, cancelled: true };

    return { ok: true, asset: res.assets[0] };
};

/**
 * Sends one local file to the server, which puts it on ImageKit and hands back
 * the address.
 *
 * `FormData` with a file part rather than base64: a base64 body is a third
 * bigger than the file it carries, and the server already has multer in front
 * of this route for exactly this shape.
 */
export const uploadPhoto = async (asset, { path = "/customer/photo", field = "photo" } = {}) => {
    try {
        const body = new FormData();

        body.append(field, {
            uri: asset.uri,
            name: (asset.fileName || "photo") + (asset.uri.endsWith(".png") ? ".png" : ".jpg"),
            type: asset.mimeType || "image/jpeg",
        });

        const res = await api.post(path, body, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return { ok: true, url: res.data?.data?.photoUrl || res.data?.data?.url || "" };
    } catch (err) {
        return { ok: false, message: errorFrom(err, "Could not send that picture.") };
    }
};

/** The whole thing in one call, for the screens that want a single button. */
export const takeAndUpload = async (options = {}) => {
    const picked = await pickPhoto(options);
    if (!picked.ok) return picked;

    return uploadPhoto(picked.asset, options);
};
