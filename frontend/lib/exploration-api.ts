import { api } from "./api";
import { handleAuthError } from "./auth-error-handler";

export interface SymbolCoreMeaning {
  headline: string;
  description: string;
}

export interface SymbolScenario {
  scenario: string;
  meaning: string;
}

export interface SymbolContent {
  core_meaning: SymbolCoreMeaning;
  personal_connection: string;
  common_scenarios: SymbolScenario[];
  self_reflection_questions: string[];
  emotion_associations: string[];
  why_you_dream_this: string;
  related_symbols: string[];
}

export interface Symbol {
  id: string;
  slug: string;
  name: string;
  category: string;
  content: SymbolContent;
  created_at: string;
}

export interface SymbolListItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  created_at: string;
}

export interface SymbolListResponse {
  total: number;
  page: number;
  page_size: number;
  items: SymbolListItem[];
}

export interface ArticleContent {
  title: string;
  body: string;
  expandable?: boolean;
}

export interface Article {
  id: string;
  module: string;
  section: string;
  order_index: number;
  content: ArticleContent;
  created_at: string;
}

export interface ArticleListResponse {
  module: string;
  items: Article[];
}

export type ExplorationModule = "science" | "nightmare" | "improvement" | "lucid" | "psychology" | "phenomena";

class ExplorationAPIService {
  async getCategories(): Promise<string[]> {
    try {
      const res = await api.get<string[]>("/exploration/symbols/categories");
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async listSymbols(params?: {
    category?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<SymbolListResponse> {
    try {
      const res = await api.get<SymbolListResponse>("/exploration/symbols", { params });
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async getSymbol(slug: string): Promise<Symbol> {
    try {
      const res = await api.get<Symbol>(`/exploration/symbols/${slug}`);
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }

  async getArticles(module: ExplorationModule): Promise<ArticleListResponse> {
    try {
      const res = await api.get<ArticleListResponse>(`/exploration/articles/${module}`);
      return res.data;
    } catch (error) {
      throw handleAuthError(error);
    }
  }
}

export const explorationAPI = new ExplorationAPIService();
