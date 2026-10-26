import type { PointerKind, PointerState } from "./experience";

export type InputState = PointerState;

/** Full-screen scenes own every gesture; embedded scenes leave vertical scrolling to the page. */
export type InputMode = "fullscreen" | "embedded";

interface InputEvent {
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerType: string;
  readonly pointerId: number;
  readonly deltaY: number;
  readonly target: EventTarget | null;
}

export interface InputOptions {
  mode: InputMode;
  target: EventTarget;
  root: { style: { touchAction: string } };
  viewport(): { width: number; height: number };
  schedule(callback: () => void): void;
  onFrame(state: InputState): void;
}

export interface Input {
  read(): InputState;
  dispose(): void;
}

const TOUCH_ACTION: Record<InputMode, string> = {
  fullscreen: "none",
  embedded: "pan-y",
};

function toKind(pointerType: string): PointerKind {
  return pointerType === "touch" || pointerType === "pen"
    ? pointerType
    : "mouse";
}

export function createInput(options: InputOptions): Input {
  const { mode, target, root } = options;
  const state: InputState = {
    x: 0,
    y: 0,
    down: false,
    kind: "mouse",
    active: false,
    wheel: 0,
  };
  let scheduled = false;
  let disposed = false;

  const flush = () => {
    scheduled = false;
    if (disposed) return;
    options.onFrame({ ...state });
    state.wheel = 0;
  };

  const changed = () => {
    if (scheduled) return;
    scheduled = true;
    options.schedule(flush);
  };

  const locate = (event: InputEvent) => {
    const { width, height } = options.viewport();
    state.x = (event.clientX / width) * 2 - 1;
    state.y = 1 - (event.clientY / height) * 2;
    state.kind = toKind(event.pointerType);
    state.active = true;
  };

  const release = (event: InputEvent) => {
    state.kind = toKind(event.pointerType);
    state.down = false;
    if (state.kind !== "mouse") state.active = false;
    changed();
  };

  const handlers: Record<string, (event: InputEvent) => void> = {
    pointerdown(event) {
      locate(event);
      state.down = true;
      if (mode === "fullscreen")
        (event.target as Partial<Element> | null)?.setPointerCapture?.(
          event.pointerId,
        );
      changed();
    },
    pointermove(event) {
      locate(event);
      changed();
    },
    pointerup: release,
    pointercancel: release,
    wheel(event) {
      state.wheel += event.deltaY;
      changed();
    },
  };

  const previousTouchAction = root.style.touchAction;
  root.style.touchAction = TOUCH_ACTION[mode];

  const listeners = Object.entries(handlers).map(([type, handler]) => {
    const listener = (event: Event) => handler(event as unknown as InputEvent);
    target.addEventListener(type, listener, { passive: true });
    return () => target.removeEventListener(type, listener);
  });

  return {
    read: () => ({ ...state }),
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.forEach((remove) => remove());
      root.style.touchAction = previousTouchAction;
    },
  };
}
