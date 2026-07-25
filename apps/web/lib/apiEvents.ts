export type ApiErrorPayload = { message: string; status?: number; details?: unknown[] };

const target = new EventTarget();

export const apiEvents = {
  onError: (cb: (payload: ApiErrorPayload) => void) => {
    const handler = (e: Event) => cb((e as CustomEvent<ApiErrorPayload>).detail);
    target.addEventListener('api:error', handler);
    return () => target.removeEventListener('api:error', handler);
  },
  emitError: (payload: ApiErrorPayload) => {
    target.dispatchEvent(new CustomEvent('api:error', { detail: payload }));
  },
};
