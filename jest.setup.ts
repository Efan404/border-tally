import "@testing-library/jest-dom";

/**
 * Jest setup file (test environment bootstrap).
 *
 * Notes:
 * - This file is intentionally lightweight.
 * - If you use Jest (not Vitest), ensure your Jest config references this file
 *   (e.g. `setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"]`).
 * - If you don't use Testing Library, you can remove the import above.
 */

// Next.js sometimes relies on these being defined in jsdom-based tests.
if (typeof window !== "undefined") {
  // MatchMedia is commonly used by UI libs
  if (!window.matchMedia) {
    window.matchMedia = Object.assign(
      (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
      {
        // Keep TS happy: matchMedia is a function with extra props in some environments.
        // We don't add extra props here; this is just a typed fallback.
      },
    ) as typeof window.matchMedia;
  }

  // ResizeObserver is commonly used by charts/layout/components
  if (!("ResizeObserver" in window)) {
    class ResizeObserverStub implements ResizeObserver {
      observe(_target: Element): void {}
      unobserve(_target: Element): void {}
      disconnect(): void {}
    }

    Object.defineProperty(window, "ResizeObserver", {
      value: ResizeObserverStub,
      writable: true,
      configurable: true,
    });
  }

  // Scroll behavior in jsdom
  if (!window.scrollTo) {
    window.scrollTo = () => {};
  }
}
