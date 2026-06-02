export interface ChatRequestPayload {
  message: string;
  userId: string;
  conversationId: string;
  currentScreen: string;
  currentRoute: string;
  appVersion: string;
  selectedFeature?: string;
}

export interface UserMemoryItem {
  id: string;
  user_id: string;
  memory_type: string;
  content: string;
  importance: number;
}

export interface AppKnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  importance: number;
}

export interface AppFeatureItem {
  id: string;
  feature_name: string;
  description: string;
  status: 'active' | 'inactive' | 'in_development';
  route: string | null;
  frontend_component: string | null;
  backend_module: string | null;
}

export interface AiFeedbackItem {
  id: string;
  conversation_id: string;
  issue_detected: string;
  bad_behavior: string;
  expected_behavior: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}
