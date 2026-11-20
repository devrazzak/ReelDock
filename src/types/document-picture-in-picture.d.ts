// Document Picture-in-Picture API (Chrome 116+), not yet in TypeScript's DOM lib.
// https://developer.chrome.com/docs/web-platform/document-picture-in-picture

interface DocumentPictureInPictureOptions {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
    preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPicture extends EventTarget {
    readonly window: Window | null;
    requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
}

interface Window {
    readonly documentPictureInPicture?: DocumentPictureInPicture;
}
