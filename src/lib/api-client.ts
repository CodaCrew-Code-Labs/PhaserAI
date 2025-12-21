// API Client for PhaserAI RDS Backend
// Replaces Supabase client with direct API calls

const API_URL = import.meta.env.VITE_API_URL || 'https://en7b8h3pbb.execute-api.us-east-1.amazonaws.com/prod';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  // Users
  async getUser(userId: string) {
    try {
      return await this.request<any>(`/users/${userId}`);
    } catch (e: any) {
      if (e.message?.includes('not found') || e.message?.includes('404')) return null;
      throw e;
    }
  }

  async createUser(user: { user_id: string; email: string; username: string }) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  // Languages
  async getLanguages(userId: string) {
    return this.request<any[]>(`/users/${userId}/languages`);
  }

  async getLanguage(languageId: string) {
    return this.request<any>(`/languages/${languageId}`);
  }

  async createLanguage(language: any) {
    return this.request<any>('/languages', {
      method: 'POST',
      body: JSON.stringify(language),
    });
  }

  async updateLanguage(languageId: string, data: any) {
    return this.request<any>(`/languages/${languageId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLanguage(languageId: string) {
    return this.request<any>(`/languages/${languageId}`, {
      method: 'DELETE',
    });
  }

  // Words
  async getWords(languageId: string) {
    return this.request<any[]>(`/languages/${languageId}/words`);
  }

  async getWord(wordId: string) {
    return this.request<any>(`/words/${wordId}`);
  }

  async createWord(word: any) {
    return this.request<any>('/words', {
      method: 'POST',
      body: JSON.stringify(word),
    });
  }

  async updateWord(wordId: string, data: any) {
    return this.request<any>(`/words/${wordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWord(wordId: string) {
    return this.request<any>(`/words/${wordId}`, {
      method: 'DELETE',
    });
  }

  async getWordCount(languageId: string): Promise<number> {
    const words = await this.getWords(languageId);
    return words.length;
  }

  // Translations (handled via words endpoint)
  async getTranslations(wordId: string) {
    const word = await this.getWord(wordId);
    return word?.translations || [];
  }

  // Etymology (handled via words endpoint)
  async getEtymology(wordId: string) {
    const word = await this.getWord(wordId);
    return word?.etymology || null;
  }

  // Violations (handled via words endpoint)
  async getViolations(wordId: string) {
    const word = await this.getWord(wordId);
    return word?.violations || [];
  }
}

export const api = new ApiClient();
