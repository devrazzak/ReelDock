/**
 * Minimal Chrome DevTools Protocol client (Node 22 has WebSocket built in).
 * Playwright is not used on purpose: it forces every page to report itself as visible,
 * which hides exactly the background-tab behaviour these tests need to observe.
 */
export class CdpClient {
    #socket;
    #nextId = 0;
    #pending = new Map();
    #listeners = new Set();

    static async connect(url) {
        const socket = new WebSocket(url);
        await new Promise((resolve, reject) => {
            socket.onopen = resolve;
            socket.onerror = reject;
        });
        return new CdpClient(socket);
    }

    constructor(socket) {
        this.#socket = socket;
        socket.onmessage = event => {
            const message = JSON.parse(event.data);
            if (message.id !== undefined) {
                const pending = this.#pending.get(message.id);
                this.#pending.delete(message.id);
                if (message.error) pending?.reject(new Error(`${message.error.message} (${pending.method})`));
                else pending?.resolve(message.result);
            } else {
                for (const listener of this.#listeners) listener(message);
            }
        };
    }

    send(method, params = {}, sessionId) {
        const id = ++this.#nextId;
        this.#socket.send(JSON.stringify({ id, method, params, sessionId }));
        return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject, method }));
    }

    on(listener) {
        this.#listeners.add(listener);
    }

    async attach(targetId) {
        const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
        return new CdpSession(this, sessionId, targetId);
    }

    close() {
        this.#socket.close();
    }
}

export class CdpSession {
    constructor(client, sessionId, targetId) {
        this.client = client;
        this.sessionId = sessionId;
        this.targetId = targetId;
    }

    send(method, params) {
        return this.client.send(method, params, this.sessionId);
    }

    async evaluate(expression) {
        const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true,
        });
        if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
        return result.value;
    }

    /** A trusted mouse click, which also gives the page user activation (needed for sound). */
    async click(selector, text) {
        const point = await this.evaluate(`(() => {
            const all = [...document.querySelectorAll(${JSON.stringify(selector)})];
            const text = ${JSON.stringify(text ?? null)};
            const element = text === null ? all[0] : all.find(e => e.textContent.trim() === text);
            const rect = element.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        })()`);
        await this.clickAt(point.x, point.y);
    }

    async clickAt(x, y) {
        for (const type of ['mousePressed', 'mouseReleased']) {
            await this.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
        }
    }

    wheel(x, y, deltaY) {
        return this.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY });
    }

    /** A vertical mouse drag, like swiping a Reel. */
    async drag(x, fromY, toY) {
        await this.send('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x,
            y: fromY,
            button: 'left',
            clickCount: 1,
        });
        for (let step = 1; step <= 8; step++) {
            const y = fromY + ((toY - fromY) * step) / 8;
            await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
        }
        await this.send('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x,
            y: toY,
            button: 'left',
            clickCount: 1,
        });
    }
}
