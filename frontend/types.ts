export type PersonStage = 'Lead' | 'Qualified' | 'Negotiation' | 'Closed' | 'Lost' | string;
export type LeadType = 'Prospect' | 'Cold Lead' | 'Warm Lead' | 'Hot Lead' | 'Client' | string;
export type LeadSource = string;

export type EntityType = 'person' | 'company' | 'opportunity' | 'task' | 'note' | 'activity' | 'report';

export interface Person {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  phone: string;
  city: string;
  linkedin?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  conversionRate?: number; // 0-100
  stage?: PersonStage;
  lastAction?: string;
  recommendedAction?: string;
  leadType?: LeadType;
  leadSource?: LeadSource;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  employees: string;
  location: string;
  linkedin?: string;
  createdAt: string;
  owner: string;
  createdBy?: string;
  arr: string;
  icp?: boolean;
  lastAction?: string;
  recommendedAction?: string;
}

export type OpportunityStage = 'Screening' | 'Meeting' | 'Proposal' | 'Customer' | string;

export interface Opportunity {
  id: string;
  name: string;
  value: number;
  companyName: string;
  companyId?: string;
  contactName: string;
  contactId?: string;
  stage: OpportunityStage;
  createdAt: string;
  createdBy?: string;
}

export type TaskStatus = 'Todo' | 'In Progress' | 'Done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string;
  relatedPersonId?: string;
  relatedCompanyId?: string;
  personName?: string;
  companyName?: string;
  assignee?: string;
  assigneeId?: string;
  createdBy?: string;
  createdAt: string;
  description?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  relatedPersonId?: string;
  relatedCompanyId?: string;
  personName?: string;
  companyName?: string;
  createdAt: string;
  createdBy?: string;
}

export type ActivityType = 'email' | 'call' | 'meeting' | 'msg' | 'update' | 'note';
export type Channel = 'email' | 'linkedin' | 'whatsapp' | 'system';
export type Direction = 'received' | 'sent' | 'system';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  channel?: Channel; // For identifying the platform
  direction?: Direction; // For chat UI alignment
  title?: string; // Short summary
  content: string; // The actual message body or update text
  date: string;
  relatedPersonId?: string;
  relatedCompanyId?: string;
  userId?: string; // "You" or "System" or "Contact Name"
  createdBy?: string;
  personName?: string;
  companyName?: string;
  personEmail?: string;
  personPhone?: string;
  personStage?: string;
  personLeadType?: string;
  personLeadSource?: string;
  personConversionRate?: number;
  personLastAction?: string;
}

// Custom View Types
export type FilterOperator = 'contains' | 'doesNotContain' | 'is' | 'isNot' | 'isEmpty' | 'isNotEmpty' | 'isBefore' | 'isAfter';

export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface SortRule {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
}

export interface Column {
  key: string;
  label: string;
  width: string;
  icon: any;
  visible: boolean;
  pinned?: boolean;
  type: 'text' | 'select' | 'date' | 'person' | 'phone' | 'status' | 'relation' | 'stage' | 'currency' | 'number' | 'action' | 'assignee';
}

export interface CustomView {
  id: string;
  name: string;
  entityType: EntityType;
  filterRules: FilterRule[];
  sortRules: SortRule[];
  visibleColumns: string[];
  isDefault?: boolean;
}

export interface Report {
  id: string;
  name: string;
  data: Person[];
  createdBy: string;
  createdAt: string;
  isShared: boolean;
  filters?: FilterRule[];
  sorts?: SortRule[];
}

export interface AppUpdate {
  id: string;
  title: string;
  icon: string;
  description: string;
  image_text?: string;
  primary_action_label: string;
  primary_action_link: string;
  primary_action_is_internal: boolean;
  secondary_action_label?: string;
  secondary_action_link?: string;
  secondary_action_is_internal: boolean;
  order: number;
}

export interface MyAccess {
  role: {
    id: string;
    name: string;
    system_key?: string | null;
  } | null;
  permissions: string[];
  hidden_fields: Record<string, string[]>;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  is_verified?: boolean;
  must_verify_email?: boolean;
  is_onboarding_completed?: boolean;
  is_active?: boolean;
  verification_resend_count?: number;
  last_verification_resend_at?: string;
  google_email?: string;
  role?: {
    id: string;
    name: string;
    system_key?: string | null;
  } | null;
  permissions?: string[];
  organization?: {
    id: string;
    name: string;
  } | null;
}

export interface FieldOption {
  label: string;
  color: string;
}

export interface InteractionType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface InteractionLog {
  id: string;
  interaction_type: string;
  interaction_type_name: string;
  interaction_type_color?: string;
  notes?: string;
  date: string;
  activity_log?: string;
  activity_log_details?: {
    id: string;
    title?: string;
    type?: string;
    channel?: string;
  };
  related_person?: string;
  related_company?: string;
  person_name?: string;
  company_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}
