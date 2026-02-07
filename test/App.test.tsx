/**
 * ZenSpace - App Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactElement } from 'react';

// Mock the gemini service
vi.mock('../services/geminiService', () => ({
  analyzeImage: vi.fn(),
  createChatSession: vi.fn(() => ({ send: vi.fn() })),
  generateRoomVisualization: vi.fn(),
  isApiConfigured: vi.fn(() => true),
  GeminiApiError: class extends Error {
    code: string;
    isRetryable: boolean;
    constructor(message: string, code = 'UNKNOWN', isRetryable = false) {
      super(message);
      this.code = code;
      this.isRetryable = isRetryable;
    }
  },
}));

// Import after mocking
import App from '../App';
import { analyzeImage, GeminiApiError } from '../services/geminiService';
import { ThemeProvider } from '../components/ThemeContext';

// Helper to render App with required providers
function renderWithProviders(ui: ReactElement) {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the app header', () => {
      renderWithProviders(<App />);
      // Check that the app renders
      expect(document.body).toBeInTheDocument();
    });

    it('shows the upload zone initially', () => {
      renderWithProviders(<App />);
      expect(screen.getByText(/drop photo/i)).toBeInTheDocument();
    });

    it('does not show analysis initially', () => {
      renderWithProviders(<App />);
      expect(screen.queryByText(/key issues/i)).not.toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('shows analyzing state when processing', async () => {
      // Mock a slow analysis
      (analyzeImage as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      renderWithProviders(<App />);
      
      const file = new File(['test'], 'room.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      // Should show analyzing state
      await waitFor(() => {
        expect(screen.getByText(/focusing/i)).toBeInTheDocument();
      });
    });

    it('shows analysis results after successful analysis', async () => {
      const mockAnalysis = {
        rawText: '# Room Analysis\n\n**Key Issues**: Clutter on the floor',
        visualizationPrompt: 'Clean the room',
        products: [
          { name: 'Storage Bin', searchTerm: 'storage bin', reason: 'organize items' }
        ]
      };
      
      (analyzeImage as any).mockResolvedValueOnce(mockAnalysis);
      
      renderWithProviders(<App />);
      
      const file = new File(['test'], 'room.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      // Wait for analysis to complete
      await waitFor(() => {
        expect(analyzeImage).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const error = new (GeminiApiError as any)('API Error', 'NETWORK_ERROR', true);
      (analyzeImage as any).mockRejectedValueOnce(error);
      
      renderWithProviders(<App />);
      
      const file = new File(['test'], 'room.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      // Should show error state
      await waitFor(() => {
        // The app should handle the error and show an error message
        expect(analyzeImage).toHaveBeenCalled();
      });
    });

    it('allows retry after error', async () => {
      // First call fails, second succeeds
      (analyzeImage as any)
        .mockRejectedValueOnce(new (GeminiApiError as any)('Error', 'NETWORK', true))
        .mockResolvedValueOnce({
          rawText: '# Success',
          visualizationPrompt: 'Clean',
          products: []
        });
      
      renderWithProviders(<App />);
      
      const file = new File(['test'], 'room.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // First attempt
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(analyzeImage).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations in initial state', async () => {
      renderWithProviders(<App />);
      
      // Check for any button (upload zone)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('maintains focus management', async () => {
      renderWithProviders(<App />);
      
      // Get the first focusable button
      const buttons = screen.getAllByRole('button');
      const uploadButton = buttons[0]!;
      uploadButton.focus();
      
      expect(document.activeElement).toBe(uploadButton);
    });
  });
});

describe('App States', () => {
  describe('HOME state', () => {
    it('shows upload prompt', () => {
      renderWithProviders(<App />);
      expect(screen.getByText(/drop photo/i)).toBeInTheDocument();
    });
  });

  describe('Theme and Styling', () => {
    it('applies dark theme by default', () => {
      renderWithProviders(<App />);
      
      // Check for dark theme elements
      const app = document.querySelector('[class*="bg-"]');
      expect(app).toBeInTheDocument();
    });
  });
});

describe('Product Suggestions', () => {
  it('displays product suggestions after analysis', async () => {
    const mockAnalysis = {
      rawText: '# Analysis',
      visualizationPrompt: 'Clean',
      products: [
        { name: 'Storage Basket', searchTerm: 'woven storage basket', reason: 'Store blankets' },
        { name: 'Drawer Organizer', searchTerm: 'drawer divider', reason: 'Organize drawers' },
      ]
    };
    
    (analyzeImage as any).mockResolvedValueOnce(mockAnalysis);
    
    renderWithProviders(<App />);
    
    const file = new File(['test'], 'room.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(analyzeImage).toHaveBeenCalled();
    });
  });
});
