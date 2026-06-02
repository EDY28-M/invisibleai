export interface ProfileTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  base_role: string;
  base_personality: string;
  base_instructions: string;
  sort_order: number;
}

export interface ProfileModifier {
  id: string;
  template_id: string | null;
  category: string;
  name: string;
  icon: string;
  extra_instructions: string;
  sort_order: number;
}

export interface ActiveProfileConfig {
  template_id: string | null;
  selected_modifiers: string[];
  custom_notes: string;
}
