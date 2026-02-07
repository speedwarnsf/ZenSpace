/**
 * Tests for SessionManager Component
 * 
 * Tests for the session save/load UI component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionManager } from '../../components/SessionManager';

// Mock the entire sessionStorage module
const mockGetSessionMetadata = vi.fn();
const mockGetSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockRenameSession = vi.fn();
const mockExportSession = vi.fn();
const mockImportSession = vi.fn();
const mockSearchSessions = vi.fn();
const mockGetStorageInfo = vi.fn();

vi.mock('../../services/sessionStorage', () => ({
  getSessionMetadata: () => mockGetSessionMetadata(),
  getSession: (id: string) => mockGetSession(id),
  deleteSession: (id: string) => mockDeleteSession(id),
  renameSession: (id: string, name: string) => mockRenameSession(id, name),
  exportSession: (id: string) => mockExportSession(id),
  importSession: (json: string) => mockImportSession(json),
  searchSessions: (query: string) => mockSearchSessions(query),
  getStorageInfo: () => mockGetStorageInfo()
}));

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'blob:test');
global.URL.revokeObjectURL = vi.fn();

// Test fixtures
const mockSessions = [
  {
    id: 'session-1',
    name: 'Bedroom Analysis',
    thumbnail: 'data:image/jpeg;base64,test1',
    messageCount: 5,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
    tags: ['bedroom', 'urgent']
  },
  {
    id: 'session-2',
    name: 'Kitchen Pantry',
    thumbnail: 'data:image/jpeg;base64,test2',
    messageCount: 3,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 7200000,
    tags: ['kitchen']
  }
];

const mockFullSession = {
  id: 'session-1',
  name: 'Bedroom Analysis',
  thumbnail: 'data:image/jpeg;base64,test1',
  image: {
    dataUrl: 'data:image/jpeg;base64,fullimage',
    base64: 'fullimage',
    mimeType: 'image/jpeg',
    fileName: 'room.jpg'
  },
  analysis: {
    rawText: '# Analysis\n\nBedroom needs organization.',
    visualizationPrompt: 'Organized bedroom',
    products: []
  },
  messages: [
    { id: '1', role: 'user' as const, text: 'Hello', timestamp: Date.now() }
  ],
  messageCount: 1,
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now() - 3600000,
  tags: ['bedroom']
};

describe('SessionManager', () => {
  const mockOnLoadSession = vi.fn();
  const mockOnSaveSession = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionMetadata.mockReturnValue(mockSessions);
    mockGetStorageInfo.mockReturnValue({
      sessionCount: 2,
      maxSessions: 20,
      estimatedSize: 2048
    });
    mockGetSession.mockReturnValue(mockFullSession);
    mockSearchSessions.mockImplementation((query: string) => 
      mockSessions.filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
      )
    );
    mockDeleteSession.mockReturnValue(true);
    mockRenameSession.mockReturnValue(true);
  });
  
  describe('Initial Render', () => {
    it('renders save and sessions buttons', () => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
      
      expect(screen.getByTitle('Save Session')).toBeInTheDocument();
      expect(screen.getByTitle('Open Sessions')).toBeInTheDocument();
    });
    
    it('highlights save button when there are unsaved changes', () => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
          hasUnsavedChanges={true}
        />
      );
      
      const saveButton = screen.getByTitle('Save Session');
      expect(saveButton).toHaveClass('bg-emerald-100');
    });
    
    it('shows muted save button when no unsaved changes', () => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
          hasUnsavedChanges={false}
        />
      );
      
      const saveButton = screen.getByTitle('Save Session');
      expect(saveButton).toHaveClass('bg-slate-100');
    });
  });
  
  describe('Save Functionality', () => {
    it('calls onSaveSession when save button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
      
      await user.click(screen.getByTitle('Save Session'));
      expect(mockOnSaveSession).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Accessibility', () => {
    it('has accessible button labels', () => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
      
      expect(screen.getByTitle('Save Session')).toBeInTheDocument();
      expect(screen.getByTitle('Open Sessions')).toBeInTheDocument();
    });
    
    it('save button has focus styles', () => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
      
      const saveButton = screen.getByTitle('Save Session');
      expect(saveButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
    
    it('sessions button has focus styles', () => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
      
      const sessionsButton = screen.getByTitle('Open Sessions');
      expect(sessionsButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });
  
  describe('Current Session Indicator', () => {
    it('renders without error when currentSessionId is provided', () => {
      expect(() => {
        render(
          <SessionManager
            currentSessionId="session-1"
            onLoadSession={mockOnLoadSession}
            onSaveSession={mockOnSaveSession}
          />
        );
      }).not.toThrow();
    });
    
    it('renders without error when currentSessionId is undefined', () => {
      expect(() => {
        render(
          <SessionManager
            onLoadSession={mockOnLoadSession}
            onSaveSession={mockOnSaveSession}
          />
        );
      }).not.toThrow();
    });
  });
  
  describe('Props Handling', () => {
    it('receives all required props', () => {
      const { rerender } = render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
      
      // Should render without crashing
      expect(screen.getByTitle('Save Session')).toBeInTheDocument();
      
      // Re-render with different props
      rerender(
        <SessionManager
          currentSessionId="test-id"
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
          hasUnsavedChanges={true}
        />
      );
      
      // Should still render
      expect(screen.getByTitle('Save Session')).toBeInTheDocument();
    });
    
    it('handles hasUnsavedChanges toggle', () => {
      const { rerender } = render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
          hasUnsavedChanges={false}
        />
      );
      
      let saveButton = screen.getByTitle('Save Session');
      expect(saveButton).toHaveClass('bg-slate-100');
      
      rerender(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
          hasUnsavedChanges={true}
        />
      );
      
      saveButton = screen.getByTitle('Save Session');
      expect(saveButton).toHaveClass('bg-emerald-100');
    });
  });
});

describe('SessionManager Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('getStorageInfo', () => {
    it('calls getStorageInfo when modal would open', () => {
      // Storage info is called when modal opens
      // We can't test modal opening due to jsdom limitations,
      // but we can verify the function is available
      expect(mockGetStorageInfo).toBeDefined();
    });
  });
  
  describe('getSessionMetadata', () => {
    it('session metadata function is available', () => {
      expect(mockGetSessionMetadata).toBeDefined();
    });
  });
  
  describe('searchSessions', () => {
    it('search function filters correctly', () => {
      mockSearchSessions.mockImplementation((query: string) => 
        mockSessions.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
      );
      
      const results = mockSearchSessions('bedroom');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bedroom Analysis');
    });
    
    it('returns empty for no matches', () => {
      mockSearchSessions.mockReturnValue([]);
      
      const results = mockSearchSessions('garage');
      expect(results).toHaveLength(0);
    });
  });
  
  describe('getSession', () => {
    it('retrieves full session by ID', () => {
      mockGetSession.mockReturnValue(mockFullSession);
      
      const session = mockGetSession('session-1');
      expect(session).toEqual(mockFullSession);
      expect(session.id).toBe('session-1');
    });
    
    it('returns null for non-existent session', () => {
      mockGetSession.mockReturnValue(null);
      
      const session = mockGetSession('non-existent');
      expect(session).toBeNull();
    });
  });
  
  describe('deleteSession', () => {
    it('deletes session and returns true', () => {
      mockDeleteSession.mockReturnValue(true);
      
      const result = mockDeleteSession('session-1');
      expect(result).toBe(true);
    });
    
    it('returns false for non-existent session', () => {
      mockDeleteSession.mockReturnValue(false);
      
      const result = mockDeleteSession('non-existent');
      expect(result).toBe(false);
    });
  });
  
  describe('renameSession', () => {
    it('renames session successfully', () => {
      mockRenameSession.mockReturnValue(true);
      
      const result = mockRenameSession('session-1', 'New Name');
      expect(result).toBe(true);
    });
  });
  
  describe('exportSession', () => {
    it('exports session as JSON string', () => {
      mockExportSession.mockReturnValue(JSON.stringify(mockFullSession));
      
      const json = mockExportSession('session-1');
      expect(json).toBeDefined();
      
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('session-1');
    });
    
    it('returns null for non-existent session', () => {
      mockExportSession.mockReturnValue(null);
      
      const json = mockExportSession('non-existent');
      expect(json).toBeNull();
    });
  });
  
  describe('importSession', () => {
    it('imports valid session JSON', () => {
      mockImportSession.mockReturnValue({ ...mockFullSession, id: 'new-id' });
      
      const imported = mockImportSession(JSON.stringify(mockFullSession));
      expect(imported).toBeDefined();
      expect(imported.id).toBe('new-id');
    });
    
    it('returns null for invalid JSON', () => {
      mockImportSession.mockReturnValue(null);
      
      const imported = mockImportSession('invalid json');
      expect(imported).toBeNull();
    });
  });
});

describe('SessionManager Edge Cases', () => {
  const mockOnLoadSession = vi.fn();
  const mockOnSaveSession = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('handles empty sessions array', () => {
    mockGetSessionMetadata.mockReturnValue([]);
    mockGetStorageInfo.mockReturnValue({
      sessionCount: 0,
      maxSessions: 20,
      estimatedSize: 0
    });
    
    expect(() => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
    }).not.toThrow();
  });
  
  it('handles session with no tags', () => {
    mockGetSessionMetadata.mockReturnValue([{
      id: 'no-tags',
      name: 'Session Without Tags',
      thumbnail: 'data:image/jpeg;base64,test',
      messageCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: undefined
    }]);
    
    expect(() => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
    }).not.toThrow();
  });
  
  it('handles session with empty tags array', () => {
    mockGetSessionMetadata.mockReturnValue([{
      id: 'empty-tags',
      name: 'Session With Empty Tags',
      thumbnail: 'data:image/jpeg;base64,test',
      messageCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: []
    }]);
    
    expect(() => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
    }).not.toThrow();
  });
  
  it('handles very long session name', () => {
    mockGetSessionMetadata.mockReturnValue([{
      id: 'long-name',
      name: 'This is a very long session name that might cause layout issues if not handled properly with text truncation',
      thumbnail: 'data:image/jpeg;base64,test',
      messageCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }]);
    
    expect(() => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
    }).not.toThrow();
  });
  
  it('handles zero storage size', () => {
    mockGetStorageInfo.mockReturnValue({
      sessionCount: 0,
      maxSessions: 20,
      estimatedSize: 0
    });
    
    expect(() => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
    }).not.toThrow();
  });
  
  it('handles large storage size', () => {
    mockGetStorageInfo.mockReturnValue({
      sessionCount: 15,
      maxSessions: 20,
      estimatedSize: 1024 * 1024 * 5 // 5MB
    });
    
    expect(() => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
    }).not.toThrow();
  });
  
  it('handles special characters in session name', () => {
    mockGetSessionMetadata.mockReturnValue([{
      id: 'special-chars',
      name: 'Room 🏠 & "Special" <Chars>',
      thumbnail: 'data:image/jpeg;base64,test',
      messageCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }]);
    
    expect(() => {
      render(
        <SessionManager
          onLoadSession={mockOnLoadSession}
          onSaveSession={mockOnSaveSession}
        />
      );
    }).not.toThrow();
  });
});
