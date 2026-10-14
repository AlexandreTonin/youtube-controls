const NOTIFICATION_COUNT = /^\(\d+\)\s+/;

export function isYouTubeWindowFor(windowTitle, mediaTitle) {
    if (!mediaTitle)
        return false;

    return windowTitle
        .replace(NOTIFICATION_COUNT, '')
        .startsWith(`${mediaTitle} - YouTube - `);
}
