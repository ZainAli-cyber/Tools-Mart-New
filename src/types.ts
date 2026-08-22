export type ToolCategory =
  | 'text'
  | 'keyword'
  | 'meta'
  | 'website'
  | 'backlink'
  | 'image'
  | 'developer'
  | 'utility';

export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  description: string;
  iconName: string;
  color: string;
  badge: string;
}

export interface ToolItem {
  id: string;
  name: string;
  slug: string;
  category: ToolCategory;
  shortDesc: string;
  fullDesc: string;
  iconName: string;
  isPopular?: boolean;
  isNew?: boolean;
  isAiPowered?: boolean;
  howToUseSteps: string[];
  whyUseFeatures: { title: string; desc: string }[];
  faqs: { question: string; answer: string }[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
}

export interface ToolExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
  textResult?: string;
  metrics?: Record<string, any>;
  tableData?: Array<Record<string, any>>;
}
