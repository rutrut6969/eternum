type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

const handlers = new Map<string, Set<EventHandler>>();

export const eventBus = {
  publish<T>(eventName: string, payload: T) {
    const listeners = handlers.get(eventName);
    if (!listeners) return;
    for (const handler of listeners) {
      void handler(payload);
    }
  },
  subscribe<T>(eventName: string, handler: EventHandler<T>) {
    const listeners = handlers.get(eventName) ?? new Set<EventHandler>();
    listeners.add(handler as EventHandler);
    handlers.set(eventName, listeners);
    return () => {
      listeners.delete(handler as EventHandler);
    };
  }
};
