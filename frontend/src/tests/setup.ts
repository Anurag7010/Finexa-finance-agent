import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IntersectionObserver (not implemented in jsdom)
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock scrollIntoView — jsdom does not implement scroll APIs.
// ChatPanel calls bottomRef.current?.scrollIntoView() which throws without this.
window.HTMLElement.prototype.scrollIntoView = vi.fn();
