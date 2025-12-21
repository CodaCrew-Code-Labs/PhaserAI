// API Client for PhaserAI RDS Backend
// Replaces Supabase client with direct API calls

import type { User, Language, Word, Translation, Etymology, Violation } from './database';

const API_URL =
  import.meta.env.VITE_API_URL || 'https://en7b8h3pbb.execute-api.us-east-1.amazonaws.com/prod';

interface ApiError {
  error?: string;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = (await response.json().catch(() => ({}))) as T & ApiError;

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  // Users
  async getUser(userId: string): Promise<User | null> {
    try {
      return await this.request<User>(`/users/${userId}`);
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('not found') || error.message?.includes('404')) return null;
      throw e;
    }
  }

  async createUser(user: { user_id: string; email: string; username: string }): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  // Languages
  async getLanguages(userId: string): Promise<Language[]> {
    return this.request<Language[]>(`/users/${userId}/languages`);
  }

  async getLanguage(languageId: string): Promise<Language> {
    return this.request<Language>(`/languages/${languageId}`);
  }

  async createLanguage(language: Omit<Language, 'id' | 'created_at'>): Promise<Language> {
    return this.request<Language>('/languages', {
      method: 'POST',
      body: JSON.stringify(language),
    });
  }

  async updateLanguage(
    languageId: string,
    data: Partial<Omit<Language, 'id' | 'created_at'>>
  ): Promise<Language> {
    return this.request<Language>(`/languages/${languageId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLanguage(languageId: string): Promise<void> {
    return this.request<void>(`/languages/${languageId}`, {
      method: 'DELETE',
    });
  }

  // Words
  async getWords(languageId: string): Promise<Word[]> {
    return this.request<Word[]>(`/languages/${languageId}/words`);
  }

  async getWord(wordId: string): Promise<Word> {
    return this.request<Word>(`/words/${wordId}`);
  }

  async createWord(word: Omit<Word, 'id' | 'created_at'>): Promise<Word> {
    return this.request<Word>('/words', {
      method: 'POST',
      body: JSON.stringify(word),
    });
  }

  async updateWord(wordId: string, data: Partial<Omit<Word, 'id' | 'created_at'>>): Promise<Word> {
    return this.request<Word>(`/words/${wordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWord(wordId: string): Promise<void> {
    return this.request<void>(`/words/${wordId}`, {
      method: 'DELETE',
    });
  }

  async getWordCount(languageId: string): Promise<number> {
    const words = await this.getWords(languageId);
    return words.length;
  }

  // Translations (handled via words endpoint)
  async getTranslations(wordId: string): Promise<Translation[]> {
    const word = await this.getWord(wordId);
    return word?.translations || [];
  }

  // Etymology (handled via words endpoint)
  async getEtymology(wordId: string): Promise<Etymology | null> {
    const word = await this.getWord(wordId);
    return word?.etymology || null;
  }

  // Violations (handled via words endpoint)
  async getViolations(wordId: string): Promise<Violation[]> {
    const word = await this.getWord(wordId);
    return word?.violations || [];
  }
}

export const api = new ApiClient();
