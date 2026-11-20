/**
 * A small stand-in for Facebook's Reels page with the parts the extension relies on
 * (verified on facebook.com): cards with `data-video-id`, a <video> per card,
 * "Next Card" / "Previous Card" buttons, and pushState navigation reported via the Navigation API.
 */
export interface FakeVideo extends HTMLVideoElement {
    /** Simulates the browser finishing playback. */
    finish(): void;
    playCalls: number;
}

interface FakeVideoOptions {
    /** Makes play() reject like Chrome's autoplay policy does. */
    blockPlay?: boolean;
}

export function createFakeVideo(doc: Document, options: FakeVideoOptions = {}): FakeVideo {
    const video = doc.createElement('video') as FakeVideo;
    let paused = true;
    let muted = true;
    let currentTime = 0;
    video.playCalls = 0;

    Object.defineProperties(video, {
        paused: { get: () => paused },
        ended: { get: () => false },
        duration: { get: () => 10 },
        readyState: { get: () => 4 },
        muted: { get: () => muted, set: (value: boolean) => (muted = value) },
        currentTime: { get: () => currentTime, set: (value: number) => (currentTime = value) },
    });
    video.play = async () => {
        video.playCalls++;
        if (options.blockPlay) throw new DOMException('Needs user gesture', 'NotAllowedError');
        paused = false;
        video.dispatchEvent(new Event('play'));
        video.dispatchEvent(new Event('playing'));
    };
    video.pause = () => {
        paused = true;
        video.dispatchEvent(new Event('pause'));
    };
    video.finish = () => {
        currentTime = 10;
        paused = true;
        video.dispatchEvent(new Event('pause'));
        video.dispatchEvent(new Event('ended'));
    };
    // Like Facebook: a finished Reel is replayed from a listener that runs after the extension's.
    video.addEventListener('ended', () => {
        currentTime = 0;
        video.play().catch(() => {});
    });
    return video;
}

export interface FakeReelsPage {
    videos: FakeVideo[];
    nextButton: HTMLElement;
    nextClicks: number;
    /** When true, Facebook (the fake) starts the new Reel itself, as it does in a visible tab. */
    autoplayOnNavigate: boolean;
    /** When true, clicking Next does nothing, like a broken page. */
    brokenNavigation: boolean;
    /** Facebook's own mute state, changed only by its Mute / Unmute button and applied to every new Reel. */
    facebookMuted: boolean;
}

export function createFakeReelsPage(doc: Document, reelIds: string[], options: FakeVideoOptions = {}): FakeReelsPage {
    const view = doc.defaultView!;
    const navigation = new EventTarget();
    Object.defineProperty(view, 'navigation', { configurable: true, value: navigation });

    doc.body.innerHTML = '';
    const videos = reelIds.map(id => {
        const card = doc.createElement('div');
        card.setAttribute('data-video-id', id);
        const video = createFakeVideo(doc, options);
        card.append(video);
        doc.body.append(card);
        return video;
    });

    const page: FakeReelsPage = {
        videos,
        nextButton: doc.createElement('div'),
        nextClicks: 0,
        autoplayOnNavigate: false,
        brokenNavigation: false,
        facebookMuted: true,
    };

    const goTo = (index: number) => {
        const id = reelIds[index];
        if (id === undefined) return;
        view.history.pushState({}, '', `/reel/${id}`);
        navigation.dispatchEvent(new Event('navigatesuccess'));
        if (!page.autoplayOnNavigate) return;
        // Like Facebook in a visible tab: it starts the new Reel and shortly after applies its own mute state.
        void videos[index]?.play();
        setTimeout(() => {
            const video = videos[index];
            if (video) video.muted = page.facebookMuted;
        }, 30);
    };
    const currentIndex = () => reelIds.findIndex(id => view.location.pathname === `/reel/${id}`);

    page.nextButton.setAttribute('role', 'button');
    page.nextButton.setAttribute('aria-label', 'Next Card');
    page.nextButton.addEventListener('click', () => {
        page.nextClicks++;
        if (!page.brokenNavigation) goTo(currentIndex() + 1);
    });

    const previousButton = doc.createElement('div');
    previousButton.setAttribute('role', 'button');
    previousButton.setAttribute('aria-label', 'Previous Card');
    previousButton.addEventListener('click', () => goTo(currentIndex() - 1));

    const muteButton = doc.createElement('div');
    muteButton.setAttribute('role', 'button');
    muteButton.setAttribute('aria-label', 'Unmute');
    muteButton.addEventListener('click', () => {
        page.facebookMuted = !page.facebookMuted;
        muteButton.setAttribute('aria-label', page.facebookMuted ? 'Unmute' : 'Mute');
        const current = videos[currentIndex()];
        if (current) current.muted = page.facebookMuted;
    });

    doc.body.append(page.nextButton, previousButton, muteButton);
    view.history.replaceState({}, '', `/reel/${reelIds[0]}`);
    return page;
}
