export interface GuideChoice {
  value: number;
  label: string;
}

export interface GuideField {
  key: string;
  label?: string;
  icon?: string;
  hint?: string;
  inputs?: Record<string, string>;
  choices?: GuideChoice[];
  inputMin?: Record<string, number | null>;
  inputChoices?: Record<string, GuideChoice[]>;
  readOnly?: boolean;
  hostOnly?: boolean;
  manualPoints?: boolean;
}

export interface GuideGroup {
  title: string;
  icon?: string;
  hint?: string;
  fields: GuideField[];
}

export interface GameGuide {
  edition: string;
  summary: string;
  groups: GuideGroup[];
  sources?: string[];
  companion?: { label: string; url: string; hint?: string };
  limitations?: string[];
  minTemplateVersion?: number;
  requiredKeys?: string[];
}
