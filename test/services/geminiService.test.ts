import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock the module before importing the functions
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  const mockCreateChat = vi.fn();
  
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent
      };
      chats = {
        create: mockCreateChat
      };
    },
    Type: {
      STRING: 'string',
      OBJECT: 'object',
      ARRAY: 'array'
    },
    Modality: {
      IMAGE: 'image'
    },
    Chat: class MockChat {}
  };
});

// Import after mocking
import { isApiConfigured, getApiConfigError, GeminiApiError } from '../../services/geminiService';

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isApiConfigured', () => {
    it('returns a boolean', () => {
      const result = isApiConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getApiConfigError', () => {
    it('returns a string', () => {
      const error = getApiConfigError();
      expect(typeof error).toBe('string');
    });
  });

  describe('GeminiApiError', () => {
    it('creates error with correct properties', () => {
      const error = new GeminiApiError('Test error', 'TEST_CODE', true);
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('GeminiApiError');
    });

    it('defaults to UNKNOWN code and non-retryable', () => {
      const error = new GeminiApiError('Test error');
      
      expect(error.code).toBe('UNKNOWN');
      expect(error.isRetryable).toBe(false);
    });

    it('is instanceof Error', () => {
      const error = new GeminiApiError('Test error');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof GeminiApiError).toBe(true);
    });
  });
});

describe('Error handling scenarios', () => {
  it('should identify API_KEY_MISSING as non-retryable', () => {
    const error = new GeminiApiError(
      'API key not configured',
      'API_KEY_MISSING',
      false
    );
    
    expect(error.isRetryable).toBe(false);
  });

  it('should identify RATE_LIMIT as retryable', () => {
    const error = new GeminiApiError(
      'Rate limit exceeded',
      'RATE_LIMIT',
      true
    );
    
    expect(error.isRetryable).toBe(true);
  });

  it('should identify NETWORK_ERROR as retryable', () => {
    const error = new GeminiApiError(
      'Network error',
      'NETWORK_ERROR',
      true
    );
    
    expect(error.isRetryable).toBe(true);
  });
});
