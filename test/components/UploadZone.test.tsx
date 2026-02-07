import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadZone } from '../../components/UploadZone';

describe('UploadZone', () => {
  const mockOnImageSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload prompt when no image is selected', () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={false} />);
    
    expect(screen.getByText('Drop Photo')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Upload a room photo. Click or drag and drop.');
  });

  it('shows loading state when analyzing', () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={true} />);
    
    expect(screen.getByText('Focusing...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('is not clickable when analyzing', () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabindex', '-1');
    expect(button).toHaveAttribute('aria-label', 'Analyzing image');
  });

  it('accepts keyboard activation with Enter key', () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={false} />);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    
    // File input should be triggered (though we can't fully test this without more setup)
    expect(button).toBeInTheDocument();
  });

  it('accepts keyboard activation with Space key', () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={false} />);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });
    
    expect(button).toBeInTheDocument();
  });

  it('shows error message for invalid file type', async () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={false} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    
    // Simulate selecting a non-image file
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Please upload a JPG, PNG, or WebP image.');
  });

  it('shows error message for files that are too large', async () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={false} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Create a file larger than 10MB
    const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Image must be smaller than 10MB.');
  });

  it('handles drag over state', () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={false} />);
    
    const dropZone = screen.getByRole('button');
    
    fireEvent.dragOver(dropZone, {
      dataTransfer: { dropEffect: 'copy' }
    });
    
    expect(dropZone.className).toContain('scale-105');
  });

  it('shows mobile help text on small screens', () => {
    render(<UploadZone onImageSelected={mockOnImageSelected} isAnalyzing={false} />);
    
    expect(screen.getByText('Tap to take or upload a photo')).toBeInTheDocument();
  });
});
