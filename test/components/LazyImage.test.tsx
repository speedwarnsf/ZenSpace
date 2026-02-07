/**
 * Tests for LazyImage component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LazyImage } from '../../components/LazyImage';

// Mock IntersectionObserver
let intersectionCallback: (entries: IntersectionObserverEntry[]) => void;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    intersectionCallback = callback;
    this.rootMargin = options?.rootMargin || '0px';
    this.thresholds = options?.threshold ? 
      (Array.isArray(options.threshold) ? options.threshold : [options.threshold]) : 
      [0];
  }

  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
}

describe('LazyImage', () => {
  beforeEach(() => {
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<LazyImage src="test.jpg" alt="Test image" />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <LazyImage 
          src="test.jpg" 
          alt="Test image" 
          className="custom-class" 
        />
      );
      expect(screen.getByRole('img')).toHaveClass('custom-class');
    });

    it('passes additional props to img element', () => {
      render(
        <LazyImage 
          src="test.jpg" 
          alt="Test image" 
          width={200}
          height={150}
        />
      );
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('width', '200');
      expect(img).toHaveAttribute('height', '150');
    });
  });

  describe('Lazy Loading', () => {
    it('shows placeholder initially before intersection', () => {
      const placeholder = 'placeholder.jpg';
      render(
        <LazyImage 
          src="real.jpg" 
          alt="Test" 
          placeholder={placeholder}
        />
      );

      // Before intersection triggers, should show placeholder
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', placeholder);
    });

    it('loads real image when intersection occurs', async () => {
      render(<LazyImage src="real.jpg" alt="Test" />);

      // Simulate intersection
      intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry]);

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', 'real.jpg');
      });
    });
  });

  describe('Accessibility', () => {
    it('has alt text', () => {
      render(<LazyImage src="test.jpg" alt="Descriptive alt text" />);
      expect(screen.getByAltText('Descriptive alt text')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('has opacity transition class', () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('transition-opacity');
    });

    it('starts with opacity-0', () => {
      render(<LazyImage src="test.jpg" alt="Test" />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('opacity-0');
    });
  });

  describe('IntersectionObserver config', () => {
    it('observes the image element', () => {
      render(
        <LazyImage 
          src="test.jpg" 
          alt="Test" 
          threshold={0.5}
        />
      );

      expect(mockObserve).toHaveBeenCalled();
    });

    it('disconnects on unmount', () => {
      const { unmount } = render(
        <LazyImage 
          src="test.jpg" 
          alt="Test" 
          rootMargin="200px"
        />
      );

      unmount();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('Fallback without IntersectionObserver', () => {
    it('loads image immediately when IO not supported', () => {
      // Remove IO from window
      const originalIO = window.IntersectionObserver;
      // @ts-expect-error - intentionally removing for test
      delete window.IntersectionObserver;

      render(<LazyImage src="real.jpg" alt="Test" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'real.jpg');

      // Restore
      window.IntersectionObserver = originalIO;
    });
  });
});
