import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Person,
  Company,
  Opportunity,
  Task,
  Note,
  ActivityLog,
  CustomView,
  FilterRule,
  SortRule,
  Report,
  User,
  MyAccess,
  Column,
  AppUpdate,
  FieldOption,
  InteractionLog,
  InteractionType,
} from "./types";
import * as api from "./lib/api";
import { toast } from "sonner";
import posthog from "posthog-js";
import { translations } from "./src/i18n/translations";

let interactionTypesRequest: Promise<void> | null = null;
let currentUserRequest: Promise<void> | null = null;

const mapPersonIdentities = (identities: any[] | undefined) =>
  (identities || []).map((identity: any) => ({
    id: String(identity.id),
    person: String(identity.person),
    platform: identity.platform,
    externalId: identity.external_id,
    username: identity.username,
    displayName: identity.display_name,
    avatar: identity.avatar,
    account: identity.account ? String(identity.account) : null,
    metadata: identity.metadata || {},
    lastSeenAt: identity.last_seen_at,
  }));

interface DrawerItem {
  id: string;
  type: EntityType;
  activeTab?: string;
}

type EntityType =
  | "person"
  | "company"
  | "opportunity"
  | "task"
  | "note"
  | "activity";

interface AppState {
  people: Person[];
  companies: Company[];
  opportunities: Opportunity[];
  tasks: Task[];
  notes: Note[];
  activities: ActivityLog[];
  interactionTypes: InteractionType[];
  interactions: InteractionLog[];
  interactionsPagination: {
    next: string | null;
    previous: string | null;
  };
  activitiesPagination: {
    next: string | null;
    previous: string | null;
  };
  peoplePagination: {
    next: string | null;
    previous: string | null;
  };
  companiesPagination: {
    next: string | null;
    previous: string | null;
  };
  tasksPagination: {
    next: string | null;
    previous: string | null;
  };
  notesPagination: {
    next: string | null;
    previous: string | null;
  };
  opportunitiesPagination: {
    next: string | null;
    previous: string | null;
  };
  reports: Report[];
  appUpdates: AppUpdate[];
  views: CustomView[];
  orgUsers: User[];
  myAccess: MyAccess | null;
  counts: Record<EntityType | "report", number>;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  dashboardConfigs: Record<string, any>;

  activeColumns: Column[];
  setActiveColumns: (cols: Column[]) => void;

  // Drawer Stack State for Navigation
  drawerStack: DrawerItem[];
  isDrawerOpen: boolean;
  isCommandMenuOpen: boolean;
  isSidebarCollapsed: boolean;
  isMobileDrawerOpen: boolean;
  isProModalOpen: boolean;
  isOnboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;

  // Theme
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  language: "en" | "ar";
  setLanguage: (lang: "en" | "ar") => void;
  peopleExpanded: boolean;
  tasksExpanded: boolean;
  opportunitiesExpanded: boolean;
  insightsExpanded: boolean;
  group3Expanded: boolean;
  betaExpanded: boolean;
  toolsExpanded: boolean;
  analyticsExpanded: boolean;

  // Loading States
  loading: Record<EntityType | "report" | "all", boolean>;
  setLoading: (type: EntityType | "report" | "all", isLoading: boolean) => void;

  // Selection State
  selectedIds: string[];
  selectionType: EntityType | null;
  toggleSelection: (id: string, type: EntityType) => void;
  setSelection: (ids: string[], type: EntityType) => void;
  clearSelection: () => void;

  // Drawer Actions
  openDrawer: (item: DrawerItem) => void;
  pushDrawer: (item: DrawerItem, currentTab?: string) => void;
  popDrawer: () => void;
  closeDrawer: () => void;
  openCommandMenu: () => void;
  closeCommandMenu: () => void;
  toggleCommandMenu: () => void;
  tourStep: number | null;
  setTourStep: (step: number | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  setProModalOpen: (open: boolean) => void;
  togglePeopleExpanded: () => void;
  toggleTasksExpanded: () => void;
  toggleOpportunitiesExpanded: () => void;
  toggleInsightsExpanded: () => void;
  toggleGroup3Expanded: () => void;
  toggleBetaExpanded: () => void;
  toggleToolsExpanded: () => void;
  toggleAnalyticsExpanded: () => void;
  setPeopleExpanded: (expanded: boolean) => void;
  setTasksExpanded: (expanded: boolean) => void;
  setOpportunitiesExpanded: (expanded: boolean) => void;
  setInsightsExpanded: (expanded: boolean) => void;
  setGroup3Expanded: (expanded: boolean) => void;
  setBetaExpanded: (expanded: boolean) => void;
  setToolsExpanded: (expanded: boolean) => void;
  setAnalyticsExpanded: (expanded: boolean) => void;
  fetchFunnelAnalytics: (timeframe?: string, countMode?: "unique" | "total") => Promise<any[] | null>;
  fetchChannelAnalytics: (timeframe?: string, countMode?: "unique" | "total") => Promise<any | null>;
  fetchActivityDetailAnalytics: (interactionTypeId: string, timeframe?: string) => Promise<any | null>;

  // Custom Options for Dropdowns
  customStages: FieldOption[];
  customLeadTypes: FieldOption[];
  customLeadSources: FieldOption[];
  customChannels: string[];
  fetchCRMConfig: () => Promise<void>;
  addCustomStage: (stage: FieldOption) => Promise<void>;
  updateCustomStage: (oldLabel: string, newOption: FieldOption) => Promise<void>;
  deleteCustomStage: (label: string) => Promise<void>;
  addCustomLeadType: (type: FieldOption) => Promise<void>;
  updateCustomLeadType: (oldLabel: string, newOption: FieldOption) => Promise<void>;
  deleteCustomLeadType: (label: string) => Promise<void>;
  addCustomLeadSource: (source: FieldOption) => Promise<void>;
  updateCustomLeadSource: (oldLabel: string, newOption: FieldOption) => Promise<void>;
  deleteCustomLeadSource: (label: string) => Promise<void>;
  addCustomChannel: (channel: string) => void;

  // Data Actions
  addPerson: (person: Person) => Promise<Person | undefined>;
  updatePerson: (
    id: string,
    data: Partial<Person>,
  ) => Promise<Response | undefined>;
  deletePeople: (ids: string[]) => Promise<void>;

  addCompany: (company: Company) => Promise<Company | undefined>;
  updateCompany: (
    id: string,
    data: Partial<Company>,
  ) => Promise<Response | undefined>;
  deleteCompanies: (ids: string[]) => Promise<void>;

  addOpportunity: (opp: Opportunity) => Promise<Opportunity | undefined>;
  updateOpportunityStage: (
    id: string,
    newStage: Opportunity["stage"],
  ) => Promise<Response | undefined>;
  updateOpportunity: (
    id: string,
    data: Partial<Opportunity>,
  ) => Promise<Response | undefined>;
  deleteOpportunities: (ids: string[]) => Promise<void>;

  addTask: (task: Task) => Promise<Task | undefined>;
  updateTask: (
    id: string,
    data: Partial<Task>,
  ) => Promise<Response | undefined>;
  deleteTasks: (ids: string[]) => Promise<void>;

  addNote: (note: Note) => Promise<Note | undefined>;
  updateNote: (
    id: string,
    data: Partial<Note>,
  ) => Promise<Response | undefined>;
  deleteNotes: (ids: string[]) => Promise<void>;
  fetchNotes: (params?: any, append?: boolean) => Promise<{ next: string | null; previous: string | null } | undefined>;
  fetchPeople: (params?: any, append?: boolean) => Promise<{ next: string | null; previous: string | null } | undefined>;
  fetchPersonById: (id: string) => Promise<Person | undefined>;
  exportPersonData: (id: string, scope: 'messages' | 'partial' | 'full') => Promise<string | null>;
  fetchCompanies: (params?: any, append?: boolean) => Promise<{ next: string | null; previous: string | null } | undefined>;
  fetchCompanyById: (id: string) => Promise<Company | undefined>;
  fetchTasks: (params?: any, append?: boolean) => Promise<{ next: string | null; previous: string | null } | undefined>;
  fetchOpportunities: (params?: any, append?: boolean) => Promise<{ next: string | null; previous: string | null } | undefined>;
  fetchOpportunityById: (id: string) => Promise<Opportunity | undefined>;
  fetchActivities: (params?: any, append?: boolean) => Promise<{ next: string | null; previous: string | null } | undefined>;
  fetchActivityById: (id: string) => Promise<ActivityLog | undefined>;
  fetchInteractionTypes: () => Promise<void>;
  addInteractionType: (data: { name: string; description?: string; color?: string; icon?: string }) => Promise<void>;
  updateInteractionType: (id: string, data: Partial<{ name: string; description: string; color: string; icon: string }>) => Promise<void>;
  deleteInteractionType: (id: string) => Promise<void>;
  fetchInteractions: (params?: any, append?: boolean) => Promise<{ next: string | null; previous: string | null } | undefined>;
  addInteraction: (interaction: { interaction_type: string; related_person?: string; related_company?: string; notes?: string; date?: string; activity_log?: string }) => Promise<InteractionLog | undefined>;
  updateInteraction: (id: string, data: Partial<{ interaction_type: string; related_person: string | null; related_company: string | null; notes: string; date: string; activity_log: string | null }>) => Promise<Response | undefined>;
  deleteInteractions: (ids: string[]) => Promise<void>;
  fetchAppUpdates: (params?: any) => Promise<void>;
  fetchOrgUsers: () => Promise<void>;
  fetchDashboardConfig: (chartId: string) => Promise<any>;
  saveDashboardConfig: (chartId: string, config: any) => Promise<void>;

  addActivity: (activity: ActivityLog) => Promise<ActivityLog | undefined>;
  updateActivity: (
    id: string,
    data: Partial<ActivityLog>,
  ) => Promise<Response | undefined>;
  deleteActivities: (ids: string[]) => Promise<void>;

  importData: (
    type: EntityType,
    data: any[] | { data: any[]; auto_create?: any },
  ) => Promise<any>;

  // Report Actions
  fetchReports: (params?: any) => Promise<void>;
  addReport: (report: Report) => Promise<Report | undefined>;
  updateReport: (id: string, data: Partial<Report>) => Promise<void>;
  deleteReports: (ids: string[]) => Promise<void>;

  // View Actions
  updateView: (id: string, data: Partial<CustomView>) => void;
  initViews: () => void;

  // Confirm Dialog State
  confirmDialog: {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  };
  confirm: (options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;

  // Auth Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  fetchCurrentUser: () => Promise<void>;
  fetchMyAccess: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      people: [],
      companies: [],
      opportunities: [],
      tasks: [],
      notes: [],
      activities: [],
      interactionTypes: [],
      interactions: [],
      interactionsPagination: {
        next: null,
        previous: null,
      },
      activitiesPagination: {
        next: null,
        previous: null,
      },
      peoplePagination: {
        next: null,
        previous: null,
      },
      companiesPagination: {
        next: null,
        previous: null,
      },
      tasksPagination: {
        next: null,
        previous: null,
      },
      notesPagination: {
        next: null,
        previous: null,
      },
      opportunitiesPagination: {
        next: null,
        previous: null,
      },
      reports: [],
      appUpdates: [],
      orgUsers: [],
      myAccess: null,
      views: [
        {
          id: "all-people",
          name: "All People",
          entityType: "person",
          filterRules: [],
          sortRules: [],
          visibleColumns: [],
          isDefault: true,
        },
        {
          id: "leads",
          name: "Leads",
          entityType: "person",
          filterRules: [
            { id: "1", field: "leadType", operator: "isNot", value: "Client" },
          ],
          sortRules: [],
          visibleColumns: [],
        },
        {
          id: "clients",
          name: "Clients",
          entityType: "person",
          filterRules: [
            { id: "1", field: "leadType", operator: "is", value: "Client" },
          ],
          sortRules: [],
          visibleColumns: [],
        },
        {
          id: "logs-v3",
          name: "All Logs",
          entityType: "activity",
          filterRules: [],
          sortRules: [],
          visibleColumns: [
            "personName",
            "personLastAction",
            "content",
            "channel",
            "date",
            "personConversionRate",
            "personStage",
            "personLeadType",
            "personPhone",
            "personEmail",
          ],
        },
        {
          id: "companies",
          name: "Companies",
          entityType: "company",
          filterRules: [],
          sortRules: [],
          visibleColumns: [],
          isDefault: true,
        },
        {
          id: "opportunities",
          name: "Opportunities",
          entityType: "opportunity",
          filterRules: [],
          sortRules: [],
          visibleColumns: [],
          isDefault: true,
        },
        {
          id: "tasks",
          name: "Tasks",
          entityType: "task",
          filterRules: [],
          sortRules: [],
          visibleColumns: [],
          isDefault: true,
        },
        {
          id: "tasks-assigned",
          name: "Assigned to Me",
          entityType: "task",
          filterRules: [
            { id: "1", field: "assignee", operator: "is", value: "Me" },
          ],
          sortRules: [],
          visibleColumns: [],
        },
        {
          id: "notes",
          name: "Notes",
          entityType: "note",
          filterRules: [],
          sortRules: [],
          visibleColumns: [],
          isDefault: true,
        },
      ],

      counts: {
        person: 0,
        company: 0,
        opportunity: 0,
        task: 0,
        note: 0,
        activity: 0,
        report: 0,
      },

      activeColumns: [],
      setActiveColumns: (cols) => set({ activeColumns: cols }),

      user: null, // Start with no user
      accessToken: null,
      refreshToken: null,
      dashboardConfigs: {},

      drawerStack: [],
      isDrawerOpen: false,
      isCommandMenuOpen: false,
      isSidebarCollapsed: false,
      isMobileDrawerOpen: false,
      isProModalOpen: false,
      isOnboardingOpen: false,
      setOnboardingOpen: (open) => set({ isOnboardingOpen: open }),
      peopleExpanded: true,
      tasksExpanded: false,
      opportunitiesExpanded: false,
      insightsExpanded: false,
      group3Expanded: false,
      betaExpanded: false,
      toolsExpanded: false,
      analyticsExpanded: false,

      customStages: [
        { label: "Lead", color: "bg-gray-800 text-gray-400" },
        { label: "Qualified", color: "bg-indigo-900/40 text-indigo-400" },
        { label: "Negotiation", color: "bg-yellow-900/40 text-yellow-400" },
        { label: "Closed", color: "bg-green-900/40 text-green-400" },
        { label: "Lost", color: "bg-red-900/40 text-red-400" },
      ],
      customLeadTypes: [
        { label: "Prospect", color: "bg-blue-900/40 text-blue-400" },
        { label: "Cold Lead", color: "bg-cyan-900/40 text-cyan-400" },
        { label: "Warm Lead", color: "bg-orange-900/40 text-orange-400" },
        { label: "Hot Lead", color: "bg-red-900/40 text-red-500" },
        { label: "Client", color: "bg-green-900/40 text-green-400" },
      ],
      customLeadSources: [
        { label: "Inbound", color: "bg-green-900/40 text-green-400" },
        { label: "Outbound", color: "bg-purple-900/40 text-purple-400" },
      ],
      customChannels: ["email", "linkedin", "whatsapp"],

      fetchCRMConfig: async () => {
        try {
          const response = await api.getCRMConfig();
          if (response.ok) {
            const data = await response.json();

            // Map for legacy default colors
            const LEGACY_COLORS: Record<string, string> = {
              // Stages
              "Lead": "bg-gray-800 text-gray-400",
              "Qualified": "bg-indigo-900/40 text-indigo-400",
              "Negotiation": "bg-yellow-900/40 text-yellow-400",
              "Closed": "bg-green-900/40 text-green-400",
              "Lost": "bg-red-900/40 text-red-400",
              // Lead Types
              "Prospect": "bg-blue-900/40 text-blue-400",
              "Cold Lead": "bg-cyan-900/40 text-cyan-400",
              "Warm Lead": "bg-orange-900/40 text-orange-400",
              "Hot Lead": "bg-red-900/40 text-red-500",
              "Client": "bg-green-900/40 text-green-400",
              // Lead Sources
              "Inbound": "bg-green-900/40 text-green-400",
              "Outbound": "bg-purple-900/40 text-purple-400",
            };

            // Handle legacy format (list of strings) or new format (list of objects)
            // Also REPAIR: If a standard item has the *generic* default color instead of its *specific* color
            // (which happens if it was saved during the 'all blue' bug), fix it.
            const GENERIC_STAGE_COLOR = "bg-gray-800 text-gray-400";
            const GENERIC_LEAD_TYPE_COLOR = "bg-blue-900/40 text-blue-400";

            const mapToOption = (item: any, defaultColor: string) => {
              if (typeof item === 'string') {
                return { label: item, color: LEGACY_COLORS[item] || defaultColor };
              }
              // It's an object. Check if it needs repair.
              // If it's a known legacy label, and its color matches the GENERIC default (and not its specific legacy color),
              // then it was likely corrupted. Restore the legacy color.
              if (LEGACY_COLORS[item.label] && item.color === defaultColor && item.color !== LEGACY_COLORS[item.label]) {
                return { ...item, color: LEGACY_COLORS[item.label] };
              }
              return item;
            };

            const stages = (data.pipeline_stages || []).map((s: any) => mapToOption(s, "bg-gray-800 text-gray-400"));
            const leadTypes = (data.lead_types || []).map((t: any) => mapToOption(t, "bg-blue-900/40 text-blue-400"));
            const leadSources = (data.lead_sources || []).map((s: any) => mapToOption(s, "bg-green-900/40 text-green-400"));

            set({
              customStages: stages.length > 0 ? stages : [
                { label: "Lead", color: "bg-gray-800 text-gray-400" },
                { label: "Qualified", color: "bg-indigo-900/40 text-indigo-400" },
                { label: "Negotiation", color: "bg-yellow-900/40 text-yellow-400" },
                { label: "Closed", color: "bg-green-900/40 text-green-400" },
                { label: "Lost", color: "bg-red-900/40 text-red-400" },
              ],
              customLeadTypes: leadTypes.length > 0 ? leadTypes : [
                { label: "Prospect", color: "bg-blue-900/40 text-blue-400" },
                { label: "Cold Lead", color: "bg-cyan-900/40 text-cyan-400" },
                { label: "Warm Lead", color: "bg-orange-900/40 text-orange-400" },
                { label: "Hot Lead", color: "bg-red-900/40 text-red-500" },
                { label: "Client", color: "bg-green-900/40 text-green-400" },
              ],
              customLeadSources: leadSources.length > 0 ? leadSources : [
                { label: "Inbound", color: "bg-green-900/40 text-green-400" },
                { label: "Outbound", color: "bg-purple-900/40 text-purple-400" },
              ]
            });
          }
        } catch (err) {
          console.error("Failed to fetch CRM config:", err);
        }
      },

      addCustomStage: async (stageOption) => {
        const { customStages } = useStore.getState();
        const exists = customStages.find(s => s.label === stageOption.label);
        if (exists) return;

        const newStages = [...customStages, stageOption];
        set({ customStages: newStages });

        try {
          await api.updateCRMConfig({ pipeline_stages: newStages });
        } catch (err) {
          console.error("Failed to save custom stage:", err);
        }
      },

      updateCustomStage: async (oldLabel, newOption) => {
        const { customStages, people, opportunities } = useStore.getState();
        const newStages = customStages.map(s => s.label === oldLabel ? newOption : s);

        // Optimistically update people and opportunities in local state
        const updatedPeople = people.map(p => p.stage === oldLabel ? { ...p, stage: newOption.label } : p);
        const updatedOpps = opportunities.map(o => o.stage === oldLabel ? { ...o, stage: newOption.label } : o);

        set({
          customStages: newStages,
          people: updatedPeople,
          opportunities: updatedOpps
        });

        try {
          await api.updateCRMConfig({
            pipeline_stages: newStages,
            rename_stage: { old: oldLabel, new: newOption.label }
          });
        } catch (err) { console.error(err); }
      },

      // this is the api call/func of the delte btn you asked for
      deleteCustomStage: async (label) => {
        const { customStages } = useStore.getState();
        const newStages = customStages.filter(s => s.label !== label);
        set({ customStages: newStages });
        try {
          console.log("perforing the api call for the endpoint /api/config/mine/");
          const payload = { pipeline_stages: newStages };
          const response = await api.updateCRMConfig(payload);
          console.log(`payload sent ${JSON.stringify(payload)} serverrepons ${response.status}`);
        } catch (err) {
          console.error(err);
        }
      },

      addCustomLeadType: async (typeOption) => {
        const { customLeadTypes } = useStore.getState();
        const exists = customLeadTypes.find(t => t.label === typeOption.label);
        if (exists) return;

        const newTypes = [...customLeadTypes, typeOption];
        set({ customLeadTypes: newTypes });

        try {
          await api.updateCRMConfig({ lead_types: newTypes });
        } catch (err) {
          console.error("Failed to save custom lead type:", err);
        }
      },

      updateCustomLeadType: async (oldLabel, newOption) => {
        const { customLeadTypes, people } = useStore.getState();
        const newTypes = customLeadTypes.map(t => t.label === oldLabel ? newOption : t);

        // Optimistically update people in local state
        const updatedPeople = people.map(p => p.leadType === oldLabel ? { ...p, leadType: newOption.label } : p);

        set({
          customLeadTypes: newTypes,
          people: updatedPeople
        });

        try {
          await api.updateCRMConfig({
            lead_types: newTypes,
            rename_lead_type: { old: oldLabel, new: newOption.label }
          });
        } catch (err) { console.error(err); }
      },

      deleteCustomLeadType: async (label) => {
        const { customLeadTypes } = useStore.getState();
        const newTypes = customLeadTypes.filter(t => t.label !== label);
        set({ customLeadTypes: newTypes });
        try {
          console.log("perforing the api call for the endpoint /api/config/mine/");
          const payload = { lead_types: newTypes };
          const response = await api.updateCRMConfig(payload);
          console.log(`payload sent ${JSON.stringify(payload)} serverrepons ${response.status}`);
        } catch (err) {
          console.error(err);
        }
      },

      addCustomLeadSource: async (sourceOption) => {
        const { customLeadSources } = useStore.getState();
        const exists = customLeadSources.find(s => s.label === sourceOption.label);
        if (exists) return;

        const newSources = [...customLeadSources, sourceOption];
        set({ customLeadSources: newSources });

        try {
          await api.updateCRMConfig({ lead_sources: newSources });
        } catch (err) {
          console.error("Failed to save custom lead source:", err);
        }
      },

      updateCustomLeadSource: async (oldLabel, newOption) => {
        const { customLeadSources, people } = useStore.getState();
        const newSources = customLeadSources.map(s => s.label === oldLabel ? newOption : s);

        const updatedPeople = people.map(p => p.leadSource === oldLabel ? { ...p, leadSource: newOption.label } : p);

        set({
          customLeadSources: newSources,
          people: updatedPeople
        });

        try {
          await api.updateCRMConfig({
            lead_sources: newSources,
            rename_lead_source: { old: oldLabel, new: newOption.label }
          });
        } catch (err) { console.error(err); }
      },

      deleteCustomLeadSource: async (label) => {
        const { customLeadSources } = useStore.getState();
        const newSources = customLeadSources.filter(s => s.label !== label);
        set({ customLeadSources: newSources });
        try {
          console.log("perforing the api call for the endpoint /api/config/mine/");
          const payload = { lead_sources: newSources };
          const response = await api.updateCRMConfig(payload);
          console.log(`payload sent ${JSON.stringify(payload)} serverrepons ${response.status}`);
        } catch (err) {
          console.error(err);
        }
      },

      addCustomChannel: (channel) =>
        set((state) => ({
          customChannels: state.customChannels.includes(channel)
            ? state.customChannels
            : [...state.customChannels, channel],
        })),

      selectedIds: [],
      selectionType: null,

      toggleSelection: (id, type) =>
        set((state) => {
          // If switching types, reset selection to just this new item
          if (state.selectionType !== type) {
            return { selectionType: type, selectedIds: [id] };
          }

          const newIds = state.selectedIds.includes(id)
            ? state.selectedIds.filter((i) => i !== id)
            : [...state.selectedIds, id];

          return {
            selectedIds: newIds,
            selectionType: newIds.length === 0 ? null : type,
          };
        }),

      setSelection: (ids, type) =>
        set({ selectedIds: ids, selectionType: type }),
      clearSelection: () => set({ selectedIds: [], selectionType: null }),

      openDrawer: (item) => set({ drawerStack: [item], isDrawerOpen: true }),
      pushDrawer: (item, currentTab) =>
        set((state) => {
          const newStack = [...state.drawerStack];
          if (newStack.length > 0 && currentTab) {
            newStack[newStack.length - 1].activeTab = currentTab;
          }
          return { drawerStack: [...newStack, item] };
        }),
      popDrawer: () =>
        set((state) => {
          const newStack = [...state.drawerStack];
          newStack.pop();
          return { drawerStack: newStack, isDrawerOpen: newStack.length > 0 };
        }),
      closeDrawer: () => set({ isDrawerOpen: false, drawerStack: [] }),
      openCommandMenu: () => set({ isCommandMenuOpen: true }),
      closeCommandMenu: () => set({ isCommandMenuOpen: false }),
      toggleCommandMenu: () =>
        set((state) => ({ isCommandMenuOpen: !state.isCommandMenuOpen })),
      tourStep: null,
      setTourStep: (step) => set({ tourStep: step }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),
      toggleMobileDrawer: () =>
        set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),
      closeMobileDrawer: () => set({ isMobileDrawerOpen: false }),
      setProModalOpen: (open) => set({ isProModalOpen: open }), togglePeopleExpanded: () =>
        set((state) => ({ peopleExpanded: !state.peopleExpanded })),
      toggleTasksExpanded: () =>
        set((state) => ({ tasksExpanded: !state.tasksExpanded })),
      toggleOpportunitiesExpanded: () =>
        set((state) => ({
          opportunitiesExpanded: !state.opportunitiesExpanded,
        })),
      toggleInsightsExpanded: () =>
        set((state) => ({ insightsExpanded: !state.insightsExpanded })),
      toggleGroup3Expanded: () =>
        set((state) => ({ group3Expanded: !state.group3Expanded })),
      toggleBetaExpanded: () =>
        set((state) => ({ betaExpanded: !state.betaExpanded })),
      setPeopleExpanded: (expanded) => set({ peopleExpanded: expanded }),
      setTasksExpanded: (expanded) => set({ tasksExpanded: expanded }),
      setOpportunitiesExpanded: (expanded) =>
        set({ opportunitiesExpanded: expanded }),
      setInsightsExpanded: (expanded) => set({ insightsExpanded: expanded }),
      setGroup3Expanded: (expanded) => set({ group3Expanded: expanded }),
      setBetaExpanded: (expanded) => set({ betaExpanded: expanded }),
      setToolsExpanded: (expanded) => set({ toolsExpanded: expanded }),
      setAnalyticsExpanded: (expanded) => set({ analyticsExpanded: expanded }),
      toggleToolsExpanded: () =>
        set((state) => ({ toolsExpanded: !state.toolsExpanded })),
      toggleAnalyticsExpanded: () =>
        set((state) => ({ analyticsExpanded: !state.analyticsExpanded })),

      fetchFunnelAnalytics: async (timeframe: string = "month", countMode: "unique" | "total" = "unique") => {
        const { interactionTypes } = get();
        if (interactionTypes.length === 0) {
          await get().fetchInteractionTypes();
        }

        const types = get().interactionTypes;
        const today = new Date().toISOString().split("T")[0];

        const getTimeframeDate = (tf: string) => {
          const now = new Date();
          if (tf === 'month') now.setDate(now.getDate() - 30);
          else if (tf === 'quarter') now.setDate(now.getDate() - 90);
          else if (tf === 'year') now.setDate(now.getDate() - 365);
          else if (tf === 'all') return null;
          return now.toISOString().split('T')[0];
        };

        const funnelDateGte = getTimeframeDate(timeframe);

        const getInteractionCount = async (params: Record<string, any>) => {
          const response = await api.getInteractions(params);
          const data = await response.json();
          return data.count || 0;
        };

        try {
          const funnelResults = await Promise.all(types.map(async (type) => {
            const funnelParams: any = {
              interaction_type: type.id,
              limit: 1,
              distinct: countMode === "unique" ? "true" : "false"
            };
            if (funnelDateGte) funnelParams.date__gte = funnelDateGte;
            const [value, todayCount] = await Promise.all([
              getInteractionCount(funnelParams),
              getInteractionCount({
                interaction_type: type.id,
                date__date: today,
                limit: 1,
                distinct: countMode === "unique" ? "true" : "false"
              }),
            ]);

            return {
              id: type.id,
              name: type.name,
              value,
              todayCount,
              color: type.color || '#8884d8',
              icon: type.icon
            };
          }));

          return funnelResults;
        } catch (error) {
          console.error("Failed to fetch funnel analytics:", error);
          return null;
        }
      },

      fetchDashboardConfig: async (chartId: string) => {
        try {
          const res = await api.getDashboardConfig(chartId);
          if (res.ok) {
            const data = await res.json();
            set((state) => ({
              dashboardConfigs: {
                ...state.dashboardConfigs,
                [chartId]: data.config || {},
              },
            }));
            return data.config || {};
          }
        } catch (err) {
          console.error(`Failed to fetch dashboard config for ${chartId}:`, err);
        }
        return {};
      },

      saveDashboardConfig: async (chartId: string, config: any) => {
        // Optimistic update
        set((state) => ({
          dashboardConfigs: {
            ...state.dashboardConfigs,
            [chartId]: config,
          },
        }));

        try {
          await api.updateDashboardConfig(chartId, config);
          toast.success("Chart configuration saved");
        } catch (err) {
          console.error(`Failed to save dashboard config for ${chartId}:`, err);
          toast.error("Failed to save configuration");
        }
      },

      fetchChannelAnalytics: async (timeframe: string = 'month', countMode: "unique" | "total" = 'unique') => {
        const { interactionTypes, dashboardConfigs } = get();
        if (interactionTypes.length === 0) {
          await get().fetchInteractionTypes();
        }

        const config = dashboardConfigs['channel-chart'] || {};
        const types = get().interactionTypes;

        // Default columns if none configured
        const defaultColumns = [
          {
            id: 'outreach',
            name: 'Outreach',
            color: '#22c55e',
            typeIds: types.filter(t => t.name.toLowerCase().includes('outreach')).map(t => t.id)
          },
          {
            id: 'responses',
            name: 'Responses',
            color: '#3b82f6',
            typeIds: types.filter(t => t.name.toLowerCase().includes('responded') || t.name.toLowerCase().includes('replied')).map(t => t.id)
          },
          {
            id: 'booked',
            name: 'Booked Calls',
            color: '#ec4899',
            typeIds: types.filter(t => t.name.toLowerCase().includes('booked') || t.name.toLowerCase().includes('meeting')).map(t => t.id)
          }
        ];

        const columns = config.columns && config.columns.length > 0 ? config.columns : defaultColumns;

        const getTimeframeDate = (tf: string) => {
          const now = new Date();
          if (tf === 'month') now.setDate(now.getDate() - 30);
          else if (tf === 'quarter') now.setDate(now.getDate() - 90);
          else if (tf === 'year') now.setDate(now.getDate() - 365);
          else if (tf === 'all') return null;
          return now.toISOString().split('T')[0];
        };

        const channelDateGte = getTimeframeDate(timeframe);

        const fetchCategoryCount = async (typeIds: string[], channel: string | null) => {
          if (typeIds.length === 0) return 0;

          const counts = await Promise.all(
            typeIds.map(async (id) => {
              const params: any = {
                interaction_type: id,
                limit: 1,
                distinct: countMode === "unique" ? "true" : "false"
              };
              if (channelDateGte) params.date__gte = channelDateGte;
              if (channel === 'other') {
                params.activity_log__isnull = 'true';
              } else if (channel) {
                params.activity_log__channel = channel;
              }

              const res = await api.getInteractions(params);
              const data = await res.json();
              return data.count || 0;
            }),
          );

          return counts.reduce((total, count) => total + count, 0);
        };

        try {
          const channels = ['email', 'linkedin', 'whatsapp', 'other'];
          const channelResults = await Promise.all(channels.map(async (ch) => {
            const columnData: any = {
              name: ch.charAt(0).toUpperCase() + ch.slice(1)
            };

            const counts = await Promise.all(
              columns.map(async (col) => [col.id, await fetchCategoryCount(col.typeIds, ch)] as const),
            );

            counts.forEach(([columnId, count]) => {
              columnData[columnId] = count;
            });

            return columnData;
          }));

          return {
            columns,
            data: channelResults
          };
        } catch (error) {
          console.error("Failed to fetch channel analytics:", error);
          return null;
        }
      },

      fetchActivityDetailAnalytics: async (interactionTypeId: string, timeframe: string = 'month') => {
        const getTimeframeConfig = (tf: string) => {
          const now = new Date();
          const currentStart = new Date();
          const prevStart = new Date();

          if (tf === 'week') {
            currentStart.setDate(now.getDate() - 7);
            prevStart.setDate(now.getDate() - 14);
          } else if (tf === 'month') {
            currentStart.setDate(now.getDate() - 30);
            prevStart.setDate(now.getDate() - 60);
          } else if (tf === 'quarter') {
            currentStart.setDate(now.getDate() - 90);
            prevStart.setDate(now.getDate() - 180);
          } else if (tf === 'year') {
            currentStart.setDate(now.getDate() - 365);
            prevStart.setDate(now.getDate() - 730);
          } else {
            return null;
          }

          return {
            currentRange: { gte: currentStart.toISOString().split('T')[0] },
            prevRange: { gte: prevStart.toISOString().split('T')[0], lt: currentStart.toISOString().split('T')[0] }
          };
        };

        const config = getTimeframeConfig(timeframe);
        if (!config) return null;

        try {
          const getInteractionsData = async (params: Record<string, any>) => {
            const response = await api.getInteractions(params);
            return response.json();
          };

          const [
            currentData,
            prevData,
            totalData,
            firstData,
          ] = await Promise.all([
            getInteractionsData({
              interaction_type: interactionTypeId,
              date__gte: config.currentRange.gte,
              limit: 1
            }),
            getInteractionsData({
              interaction_type: interactionTypeId,
              date__gte: config.prevRange.gte,
              date__lt: config.prevRange.lt,
              limit: 1
            }),
            getInteractionsData({
              interaction_type: interactionTypeId,
              limit: 1
            }),
            getInteractionsData({
              interaction_type: interactionTypeId,
              ordering: 'date',
              limit: 1
            }),
          ]);

          const currentCount = currentData.count || 0;
          const prevCount = prevData.count || 0;
          const totalCount = totalData.count || 0;

          // 4. Calculate Score (simple percentage change)
          let scoreIncrease = 0;
          if (prevCount > 0) {
            scoreIncrease = Math.round(((currentCount - prevCount) / prevCount) * 100);
          } else if (currentCount > 0) {
            scoreIncrease = 100;
          }

          const firstItem = Array.isArray(firstData) ? firstData[0] : (firstData.results?.[0]);

          let startDateStr = config.currentRange.gte; // Default if none found
          if (firstItem) {
            startDateStr = firstItem.date.split('T')[0];
          }

          const allInteractionsRes = await api.getInteractions({
            interaction_type: interactionTypeId,
            date__gte: startDateStr,
            limit: 3000 // Large limit to get full history
          });
          const allInteractionsData = await allInteractionsRes.json();
          const interactions = Array.isArray(allInteractionsData) ? allInteractionsData : (allInteractionsData.results || []);

          const dailyMap: Record<string, number> = {};
          interactions.forEach((i: any) => {
            const date = i.date.split('T')[0];
            dailyMap[date] = (dailyMap[date] || 0) + 1;
          });

          // Generate date sequence for timeframe
          const dailyResults = [];
          const startDate = new Date(startDateStr);
          const endDate = new Date();
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dailyResults.push({
              date: dateStr,
              count: dailyMap[dateStr] || 0
            });
          }
          const dailyData = dailyResults.map(r => ({ date: r.date, count: r.count }));

          // EWMA Score Calculation (from Loop Habit Tracker)
          // Frequency = numerator / denominator
          let numerator = 1;
          let denominator = 1;
          const freq = numerator / denominator;

          if (freq < 1.0) {
            numerator *= 2;
            denominator *= 2;
          }

          let currentScore = 0;
          let rollingSum = 0;
          const pointsWithScore = [];
          const values = dailyResults.map(r => r.count > 0 ? 1 : 0);

          for (let i = 0; i < dailyResults.length; i++) {
            const val = values[i];
            rollingSum += val;
            if (i >= denominator) {
              rollingSum -= values[i - denominator];
            }

            const percentageCompleted = Math.min(1.0, rollingSum / numerator);
            const multiplier = Math.pow(0.5, Math.sqrt(freq) / 13.0);
            currentScore = (currentScore * multiplier) + (percentageCompleted * (1 - multiplier));

            pointsWithScore.push({
              date: dailyResults[i].date,
              count: dailyResults[i].count,
              score: Math.round(currentScore * 100)
            });
          }

          const scoreToday = pointsWithScore[pointsWithScore.length - 1]?.score || 0;

          // Calculate Diffs
          const getScoreAtDayAgo = (daysAgo: number) => {
            const targetIndex = pointsWithScore.length - 1 - daysAgo;
            return targetIndex >= 0 ? pointsWithScore[targetIndex].score : 0;
          };

          const scoreMonthDiff = scoreToday - getScoreAtDayAgo(30);
          const scoreYearDiff = scoreToday - getScoreAtDayAgo(365);

          return {
            currentCount,
            prevCount,
            totalCount,
            scoreIncrease: scoreMonthDiff, // Reusing this for the "Month" diff in UI or clarifying
            scoreToday,
            scoreMonthDiff,
            scoreYearDiff,
            chartData: pointsWithScore
          };
        } catch (error) {
          console.error("Failed to fetch activity detail analytics:", error);
          return null;
        }
      },


      // Ensure default views exist (useful for migration/updates)
      initViews: () => {
        set((state) => {
          const hasAssigned = state.views.some(v => v.id === 'tasks-assigned');
          if (!hasAssigned) {
            return {
              views: [...state.views, {
                id: "tasks-assigned",
                name: "Assigned to Me",
                entityType: "task",
                filterRules: [
                  { id: "1", field: "assignee", operator: "is", value: "Me" },
                ],
                sortRules: [],
                visibleColumns: [],
              }]
            };
          }
          return state;
        });
      },

      loading: {
        person: false,
        company: false,
        opportunity: false,
        task: false,
        note: false,
        activity: false,
        report: false,
        all: false,
      },
      setLoading: (type, isLoading) =>
        set((state) => ({
          loading: { ...state.loading, [type]: isLoading },
        })),

      addPerson: async (person) => {
        try {
          const response = await api.createPerson({
            name: person.name,
            email: person.email,
            phone: person.phone,
            job_title: person.jobTitle,
            avatar: person.avatar,
            city: person.city,
            linkedin: person.linkedin,
            conversion_rate: person.conversionRate,
            stage: person.stage,
            last_action: person.lastAction,
            lead_type: person.leadType,
            lead_source: person.leadSource,
            company: person.companyId || null,
          });
          if (response.ok) {
            const p = await response.json();
            const mapped: Person = {
              id: String(p.id),
              name: p.name,
              avatar: p.avatar,
              email: p.email,
              jobTitle: p.job_title,
              companyId: p.company ? String(p.company) : "",
              companyName: p.company_name || "",
              phone: p.phone || "",
              city: p.city || "",
              linkedin: p.linkedin,
              createdAt: p.created_at,
              createdBy: p.created_by_name,
              conversionRate: p.conversion_rate,
              stage: p.stage,
              lastAction: p.last_action,
              leadType: p.lead_type,
              leadSource: p.lead_source,
            };
            set((state) => ({ people: [...state.people, mapped] }));
            return mapped;
          }
        } catch (err) {
          console.error("Add person error:", err);
        }
        return undefined;
      },

      updatePerson: async (id, data) => {
        try {
          const payload: any = {};
          if (data.name !== undefined) payload.name = data.name;
          if (data.email !== undefined) payload.email = data.email;
          if (data.phone !== undefined) payload.phone = data.phone;
          if (data.jobTitle !== undefined) payload.job_title = data.jobTitle;
          if (data.avatar !== undefined) payload.avatar = data.avatar;
          if (data.city !== undefined) payload.city = data.city;
          if (data.linkedin !== undefined) payload.linkedin = data.linkedin;
          if (data.conversionRate !== undefined)
            payload.conversion_rate = data.conversionRate;
          if (data.stage !== undefined) payload.stage = data.stage;
          if (data.lastAction !== undefined)
            payload.last_action = data.lastAction;
          if (data.recommendedAction !== undefined)
            payload.recommended_action = data.recommendedAction;
          if (data.leadType !== undefined) payload.lead_type = data.leadType;
          if (data.leadSource !== undefined) payload.lead_source = data.leadSource;
          if (data.companyId !== undefined)
            payload.company = data.companyId || null;

          const response = await api.updatePerson(id, payload);
          if (response.ok) {
            const p = await response.json();
            set((state) => ({
              people: state.people.map((old) =>
                old.id === id
                  ? {
                    ...old,
                    name: p.name,
                    avatar: p.avatar,
                    email: p.email,
                    jobTitle: p.job_title,
                    companyId: p.company ? String(p.company) : "",
                    companyName: p.company_name || "",
                    phone: p.phone || "",
                    city: p.city || "",
                    linkedin: p.linkedin,
                    conversionRate: p.conversion_rate,
                    stage: p.stage,
                    lastAction: p.last_action,
                    recommendedAction: p.recommended_action,
                    leadType: p.lead_type,
                    leadSource: p.lead_source,
                  }
                  : old,
              ),
            }));
          }
          return response;
        } catch (err) {
          console.error("Update person error:", err);
        }
        return undefined;
      },

      deletePeople: async (ids) => {
        try {
          await Promise.all(ids.map((id) => api.deletePerson(id)));
          const { fetchPeople } = useStore.getState();
          fetchPeople();
        } catch (err) {
          console.error("Delete people error:", err);
        }
      },

      addCompany: async (company) => {
        try {
          const response = await api.createCompany({
            name: company.name,
            domain: company.domain,
            employees: company.employees,
            location: company.location,
            linkedin: company.linkedin,
            arr: company.arr,
            icp: company.icp,
          });
          if (response.ok) {
            const c = await response.json();
            const mapped: Company = {
              id: String(c.id),
              name: c.name,
              domain: c.domain || "",
              employees: c.employees || "",
              location: c.location || "",
              linkedin: c.linkedin,
              createdAt: c.created_at,
              owner: c.owner_details?.username || "Unknown",
              createdBy: c.created_by_name,
              arr: c.arr || "",
              icp: c.icp || false,
            };
            set((state) => ({ companies: [...state.companies, mapped] }));
            return mapped;
          }
        } catch (err) {
          console.error("Add company error:", err);
        }
        return undefined;
      },

      updateCompany: async (id, data) => {
        try {
          const payload: any = {};
          if (data.name !== undefined) payload.name = data.name;
          if (data.domain !== undefined) payload.domain = data.domain;
          if (data.employees !== undefined) payload.employees = data.employees;
          if (data.location !== undefined) payload.location = data.location;
          if (data.linkedin !== undefined) payload.linkedin = data.linkedin;
          if (data.arr !== undefined) payload.arr = data.arr;
          if (data.icp !== undefined) payload.icp = data.icp;

          const response = await api.updateCompany(id, payload);
          if (response.ok) {
            const c = await response.json();
            set((state) => ({
              companies: state.companies.map((old) =>
                old.id === id
                  ? {
                    ...old,
                    name: c.name,
                    domain: c.domain || "",
                    employees: c.employees || "",
                    location: c.location || "",
                    linkedin: c.linkedin,
                    arr: c.arr || "",
                    icp: c.icp || false,
                  }
                  : old,
              ),
            }));
          }
          return response;
        } catch (err) {
          console.error("Update company error:", err);
        }
        return undefined;
      },

      deleteCompanies: async (ids) => {
        try {
          await Promise.all(ids.map((id) => api.deleteCompany(id)));
          const { fetchCompanies } = useStore.getState();
          fetchCompanies();
        } catch (err) {
          console.error("Delete companies error:", err);
        }
      },

      addOpportunity: async (opp) => {
        try {
          const response = await api.createOpportunity({
            name: opp.name,
            value: opp.value,
            stage: opp.stage,
            // Assuming company and contact IDs might be needed if available
            // In the current mock they are strings like "companyName"
            // Let's stick to name if that's what backend expects for now or check model
          });
          if (response.ok) {
            const o = await response.json();
            const mapped: Opportunity = {
              id: String(o.id),
              name: o.name,
              value: parseFloat(o.value),
              companyName: o.company_name || "",
              contactName: o.contact_name || "",
              stage: o.stage,
              createdAt: o.created_at,
              createdBy: o.created_by_name,
            };
            set((state) => ({
              opportunities: [...state.opportunities, mapped],
            }));
            return mapped;
          }
        } catch (err) {
          console.error("Add opportunity error:", err);
        }
        return undefined;
      },

      updateOpportunityStage: async (id, newStage) => {
        try {
          const response = await api.updateOpportunity(id, { stage: newStage });
          if (response.ok) {
            set((state) => ({
              opportunities: state.opportunities.map((op) =>
                op.id === id ? { ...op, stage: newStage } : op,
              ),
            }));
          }
          return response;
        } catch (err) {
          console.error("Update opportunity stage error:", err);
        }
        return undefined;
      },

      updateOpportunity: async (id, data) => {
        try {
          const payload: any = {};
          if (data.name !== undefined) payload.name = data.name;
          if (data.value !== undefined) payload.value = data.value;
          if (data.stage !== undefined) payload.stage = data.stage;
          // Map relationships if they exist in data

          const response = await api.updateOpportunity(id, payload);
          if (response.ok) {
            const o = await response.json();
            set((state) => ({
              opportunities: state.opportunities.map((op) =>
                op.id === id
                  ? {
                    ...op,
                    name: o.name,
                    value: parseFloat(o.value),
                    companyName: o.company_name || "",
                    contactName: o.contact_name || "",
                    stage: o.stage,
                  }
                  : op,
              ),
            }));
          }
          return response;
        } catch (err) {
          console.error("Update opportunity error:", err);
        }
        return undefined;
      },

      deleteOpportunities: async (ids) => {
        try {
          await Promise.all(ids.map((id) => api.deleteOpportunity(id)));
          const { fetchOpportunities } = useStore.getState();
          fetchOpportunities();
        } catch (err) {
          console.error("Delete opportunities error:", err);
        }
      },

      addTask: async (task) => {
        try {
          const response = await api.createTask({
            title: task.title,
            status: task.status,
            due_date: task.dueDate || null,
            description: task.description,
            related_person: task.relatedPersonId,
            related_company: task.relatedCompanyId,
            assignee: task.assigneeId,
          });
          if (response.ok) {
            const t = await response.json();
            const mapped: Task = {
              id: String(t.id),
              title: t.title,
              status: t.status,
              dueDate: t.due_date,
              relatedPersonId: t.related_person
                ? String(t.related_person)
                : undefined,
              relatedCompanyId: t.related_company
                ? String(t.related_company)
                : undefined,
              personName: t.person_name,
              companyName: t.company_name,
              assignee: t.assignee_details?.full_name || t.assignee_details?.username,
              assigneeId: t.assignee ? String(t.assignee) : undefined,
              createdBy: t.created_by_name,
              createdAt: t.created_at,
              description: t.description,
            };
            set((state) => ({ tasks: [...state.tasks, mapped] }));
            return mapped;
          }
        } catch (err) {
          console.error("Add task error:", err);
        }
        return undefined;
      },

      updateTask: async (id, data) => {
        try {
          const payload: any = {};
          if (data.title !== undefined) payload.title = data.title;
          if (data.status !== undefined) payload.status = data.status;
          if (data.dueDate !== undefined)
            payload.due_date = data.dueDate || null;
          if (data.description !== undefined)
            payload.description = data.description;
          if (data.relatedPersonId !== undefined)
            payload.related_person = data.relatedPersonId;
          if (data.relatedCompanyId !== undefined)
            payload.related_company = data.relatedCompanyId;
          if (data.assigneeId !== undefined)
            payload.assignee = data.assigneeId || null;

          const response = await api.updateTask(id, payload);
          if (response.ok) {
            const t = await response.json();
            set((state) => ({
              tasks: state.tasks.map((old) =>
                old.id === id
                  ? {
                    ...old,
                    title: t.title,
                    status: t.status,
                    dueDate: t.due_date,
                    relatedPersonId: t.related_person
                      ? String(t.related_person)
                      : undefined,
                    relatedCompanyId: t.related_company
                      ? String(t.related_company)
                      : undefined,
                    personName: t.person_name,
                    companyName: t.company_name,
                    assignee: t.assignee_details?.full_name || t.assignee_details?.username,
                    assigneeId: t.assignee ? String(t.assignee) : undefined,
                    description: t.description,
                  }
                  : old,
              ),
            }));
          }
          return response;
        } catch (err) {
          console.error("Update task error:", err);
        }
        return undefined;
      },

      deleteTasks: async (ids) => {
        try {
          await Promise.all(ids.map((id) => api.deleteTask(id)));
          const { fetchTasks } = useStore.getState();
          fetchTasks();
        } catch (err) {
          console.error("Delete tasks error:", err);
        }
      },

      addNote: async (note) => {
        try {
          // Backend expects snake_case but our frontend Note type has CamelCase
          // DRF with default settings expects what the serializer specifies.
          // Note model: title, content, related_person, related_company
          const response = await api.createNote({
            title: note.title,
            content: note.content,
            relatedPerson: note.relatedPersonId,
            relatedCompany: note.relatedCompanyId,
          });
          if (response.ok) {
            const newNote = await response.json();
            // Map backend response back to frontend type if needed
            const mappedNote: Note = {
              id: String(newNote.id),
              title: newNote.title,
              content: newNote.content,
              relatedPersonId: newNote.related_person
                ? String(newNote.related_person)
                : undefined,
              relatedCompanyId: newNote.related_company
                ? String(newNote.related_company)
                : undefined,
              personName: newNote.person_name,
              companyName: newNote.company_name,
              createdAt: newNote.created_at,
              createdBy: newNote.created_by_name,
            };
            set((state) => ({ notes: [...state.notes, mappedNote] }));
            return mappedNote;
          }
        } catch (err) {
          console.error("Add note error:", err);
          // Fallback to local only if API fails? For now just log.
        }
        return undefined;
      },

      updateNote: async (id, data) => {
        try {
          const response = await api.updateNote(id, {
            title: data.title,
            content: data.content,
            relatedPerson: data.relatedPersonId,
            relatedCompany: data.relatedCompanyId,
          });
          if (response.ok) {
            const updatedNote = await response.json();
            set((state) => ({
              notes: state.notes.map((n) =>
                n.id === id
                  ? {
                    ...n,
                    title: updatedNote.title,
                    content: updatedNote.content,
                    relatedPersonId: updatedNote.related_person
                      ? String(updatedNote.related_person)
                      : undefined,
                    relatedCompanyId: updatedNote.related_company
                      ? String(updatedNote.related_company)
                      : undefined,
                    personName: updatedNote.person_name,
                    companyName: updatedNote.company_name,
                  }
                  : n,
              ),
            }));
          }
          return response;
        } catch (err) {
          console.error("Update note error:", err);
        }
        return undefined;
      },

      deleteNotes: async (ids) => {
        try {
          // Promise.all for multiple deletes
          await Promise.all(ids.map((id) => api.deleteNote(id)));
          const { fetchNotes } = useStore.getState();
          fetchNotes();
        } catch (err) {
          console.error("Delete notes error:", err);
        }
      },

      fetchNotes: async (params, append = false) => {
        set((state) => ({ loading: { ...state.loading, note: true } }));
        try {
          let response;
          if (typeof params === "string" && params.startsWith("http")) {
            const url = new URL(params);
            const endpoint = url.pathname + url.search;
            response = await api.apiFetch(endpoint);
          } else {
            response = await api.getNotes(params);
          }

          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const count = Array.isArray(data) ? data.length : data.count || 0;
            const next = data.next || null;
            const previous = data.previous || null;

            const mappedNotes: Note[] = results.map((n: any) => ({
              id: String(n.id),
              title: n.title,
              content: n.content,
              relatedPersonId: n.related_person
                ? String(n.related_person)
                : undefined,
              relatedCompanyId: n.related_company
                ? String(n.related_company)
                : undefined,
              personName: n.person_name,
              companyName: n.company_name,
              createdAt: n.created_at,
              createdBy: n.created_by_name,
            }));

            set((state) => {
              const existingIds = new Set(state.notes.map((n) => n.id));
              const newNotes = mappedNotes.filter((n) => !existingIds.has(n.id));
              return {
                notes: append ? [...state.notes, ...newNotes] : mappedNotes,
                notesPagination: { next, previous },
                counts: { ...state.counts, note: count },
              };
            });
            return { next, previous };
          }
        } catch (err) {
          console.error("Fetch notes error:", err);
        } finally {
          set((state) => ({ loading: { ...state.loading, note: false } }));
        }
      },

      fetchPeople: async (params, append = false) => {
        set((state) => ({ loading: { ...state.loading, person: true } }));
        try {
          let response;
          if (typeof params === "string" && params.startsWith("http")) {
            const url = new URL(params);
            const endpoint = url.pathname + url.search;
            response = await api.apiFetch(endpoint);
          } else {
            response = await api.getPeople(params);
          }

          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const count = Array.isArray(data) ? data.length : data.count || 0;
            const next = data.next || null;
            const previous = data.previous || null;

            const mappedPeople: Person[] = results.map((p: any) => ({
              id: String(p.id),
              name: p.name,
              avatar: p.avatar,
              email: p.email,
              jobTitle: p.job_title,
              companyId: p.company ? String(p.company) : "",
              companyName: p.company_name || "",
              phone: p.phone || "",
              city: p.city || "",
              linkedin: p.linkedin,
              createdAt: p.created_at,
              createdBy: p.created_by_name,
              updatedAt: p.updated_at,
              conversionRate: p.conversion_rate,
              stage: p.stage,
              lastAction: p.last_action,
              recommendedAction: p.recommended_action,
              leadType: p.lead_type,
              leadSource: p.lead_source,
              identities: mapPersonIdentities(p.identities),
            }));

            set((state) => {
              const existingIds = new Set(state.people.map((p) => p.id));
              const newPeople = mappedPeople.filter((p) => !existingIds.has(p.id));
              return {
                people: append ? [...state.people, ...newPeople] : mappedPeople,
                peoplePagination: { next, previous },
                counts: { ...state.counts, person: count },
              };
            });
            return { next, previous };
          }
        } catch (err) {
          console.error("Fetch people error:", err);
        } finally {
          set((state) => ({ loading: { ...state.loading, person: false } }));
        }
      },

      fetchPersonById: async (id) => {
        try {
          const response = await api.getPerson(id);
          if (response.ok) {
            const p = await response.json();
            const mapped: Person = {
              id: String(p.id),
              name: p.name,
              avatar: p.avatar,
              email: p.email,
              jobTitle: p.job_title,
              companyId: p.company ? String(p.company) : "",
              companyName: p.company_name || "",
              phone: p.phone || "",
              city: p.city || "",
              linkedin: p.linkedin,
              createdAt: p.created_at,
              createdBy: p.created_by_name,
              updatedAt: p.updated_at,
              conversionRate: p.conversion_rate,
              stage: p.stage,
              lastAction: p.last_action,
              recommendedAction: p.recommended_action,
              leadType: p.lead_type,
              leadSource: p.lead_source,
              identities: mapPersonIdentities(p.identities),
            };
            set((state) => {
              const existingIds = new Set(state.people.map((person) => person.id));
              if (!existingIds.has(mapped.id)) {
                return { people: [...state.people, mapped] };
              }
              return {
                people: state.people.map((person) => (person.id === mapped.id ? mapped : person)),
              };
            });
            return mapped;
          }
        } catch (err) {
          console.error("Fetch person by id error:", err);
        }
        return undefined;
      },

      exportPersonData: async (id, scope) => {
        try {
          const res = await api.apiFetch(`/api/people/${id}/export/?scope=${scope}`);
          if (!res.ok) throw new Error("Failed to export");
          const data = await res.json();
          return data.text;
        } catch (error) {
          toast.error("Failed to fetch export data");
          return null;
        }
      },

      fetchCompanies: async (params, append = false) => {
        set((state) => ({ loading: { ...state.loading, company: true } }));
        try {
          let response;
          if (typeof params === "string" && params.startsWith("http")) {
            const url = new URL(params);
            const endpoint = url.pathname + url.search;
            response = await api.apiFetch(endpoint);
          } else {
            response = await api.getCompanies(params);
          }

          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const count = Array.isArray(data) ? data.length : data.count || 0;
            const next = data.next || null;
            const previous = data.previous || null;

            const mappedCompanies: Company[] = results.map((c: any) => ({
              id: String(c.id),
              name: c.name,
              domain: c.domain || "",
              employees: c.employees || "",
              location: c.location || "",
              linkedin: c.linkedin,
              createdAt: c.created_at,
              owner: c.owner_details?.username || "Unknown",
              createdBy: c.created_by_name,
              arr: c.arr || "",
              icp: c.icp || false,
            }));

            set((state) => {
              const existingIds = new Set(state.companies.map((c) => c.id));
              const newCompanies = mappedCompanies.filter((c) => !existingIds.has(c.id));
              return {
                companies: append ? [...state.companies, ...newCompanies] : mappedCompanies,
                companiesPagination: { next, previous },
                counts: { ...state.counts, company: count },
              };
            });
            return { next, previous };
          }
        } catch (err) {
          console.error("Fetch companies error:", err);
        } finally {
          set((state) => ({ loading: { ...state.loading, company: false } }));
        }
      },

      fetchCompanyById: async (id) => {
        try {
          const response = await api.getCompany(id);
          if (response.ok) {
            const c = await response.json();
            const mapped: Company = {
              id: String(c.id),
              name: c.name,
              domain: c.domain || "",
              employees: c.employees || "",
              location: c.location || "",
              linkedin: c.linkedin,
              createdAt: c.created_at,
              owner: c.owner_details?.username || "Unknown",
              createdBy: c.created_by_name,
              arr: c.arr || "",
              icp: c.icp || false,
            };
            set((state) => {
              const existingIds = new Set(state.companies.map((comp) => comp.id));
              if (!existingIds.has(mapped.id)) {
                return { companies: [...state.companies, mapped] };
              }
              return {
                companies: state.companies.map((comp) => (comp.id === mapped.id ? mapped : comp)),
              };
            });
            return mapped;
          }
        } catch (err) {
          console.error("Fetch company by id error:", err);
        }
        return undefined;
      },

      fetchTasks: async (params, append = false) => {
        set((state) => ({ loading: { ...state.loading, task: true } }));
        try {
          let response;
          if (typeof params === "string" && params.startsWith("http")) {
            const url = new URL(params);
            const endpoint = url.pathname + url.search;
            response = await api.apiFetch(endpoint);
          } else {
            response = await api.getTasks(params);
          }

          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const count = Array.isArray(data) ? data.length : data.count || 0;
            const next = data.next || null;
            const previous = data.previous || null;

            const mappedTasks: Task[] = results.map((t: any) => ({
              id: String(t.id),
              title: t.title,
              status: t.status,
              dueDate: t.due_date,
              relatedPersonId: t.related_person
                ? String(t.related_person)
                : undefined,
              relatedCompanyId: t.related_company
                ? String(t.related_company)
                : undefined,
              personName: t.person_name,
              companyName: t.company_name,
              assignee: t.assignee_details?.full_name || t.assignee_details?.username,
              assigneeId: t.assignee ? String(t.assignee) : undefined,
              createdBy: t.created_by_name,
              createdAt: t.created_at,
              description: t.description,
            }));

            set((state) => {
              const existingIds = new Set(state.tasks.map((t) => t.id));
              const newTasks = mappedTasks.filter((t) => !existingIds.has(t.id));
              return {
                tasks: append ? [...state.tasks, ...newTasks] : mappedTasks,
                tasksPagination: { next, previous },
                counts: { ...state.counts, task: count },
              };
            });
            return { next, previous };
          }
        } catch (err) {
          console.error("Fetch tasks error:", err);
        } finally {
          set((state) => ({ loading: { ...state.loading, task: false } }));
        }
      },

      fetchOpportunities: async (params, append = false) => {
        set((state) => ({ loading: { ...state.loading, opportunity: true } }));
        try {
          let response;
          if (typeof params === "string" && params.startsWith("http")) {
            const url = new URL(params);
            const endpoint = url.pathname + url.search;
            response = await api.apiFetch(endpoint);
          } else {
            response = await api.getOpportunities(params);
          }

          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const count = Array.isArray(data) ? data.length : data.count || 0;
            const next = data.next || null;
            const previous = data.previous || null;

            const mappedOpps: Opportunity[] = results.map((o: any) => ({
              id: String(o.id),
              name: o.name,
              value: parseFloat(o.value),
              companyName: o.company_name || "",
              contactName: o.contact_name || "",
              stage: o.stage,
              createdAt: o.created_at,
              createdBy: o.created_by_name,
            }));

            set((state) => {
              const existingIds = new Set(state.opportunities.map((o) => o.id));
              const newOpps = mappedOpps.filter((o) => !existingIds.has(o.id));
              return {
                opportunities: append ? [...state.opportunities, ...newOpps] : mappedOpps,
                opportunitiesPagination: { next, previous },
                counts: { ...state.counts, opportunity: count },
              };
            });
            return { next, previous };
          }
        } catch (err) {
          console.error("Fetch opportunities error:", err);
        } finally {
          set((state) => ({
            loading: { ...state.loading, opportunity: false },
          }));
        }
      },

      fetchOpportunityById: async (id) => {
        try {
          const response = await api.getOpportunity(id);
          if (response.ok) {
            const o = await response.json();
            const mapped: Opportunity = {
              id: String(o.id),
              name: o.name,
              value: parseFloat(o.value),
              companyName: o.company_name || "",
              contactName: o.contact_name || "",
              stage: o.stage,
              createdAt: o.created_at,
              createdBy: o.created_by_name,
            };
            set((state) => {
              const existingIds = new Set(state.opportunities.map((opp) => opp.id));
              if (!existingIds.has(mapped.id)) {
                return { opportunities: [...state.opportunities, mapped] };
              }
              return {
                opportunities: state.opportunities.map((opp) => (opp.id === mapped.id ? mapped : opp)),
              };
            });
            return mapped;
          }
        } catch (err) {
          console.error("Fetch opportunity by id error:", err);
        }
        return undefined;
      },

      fetchActivities: async (params, append = false) => {
        set((state) => ({ loading: { ...state.loading, activity: true } }));
        try {
          let response;
          if (typeof params === "string" && params.startsWith("http")) {
            // It's a pagination URL
            const url = new URL(params);
            const endpoint = url.pathname + url.search;
            response = await api.apiFetch(endpoint);
          } else {
            response = await api.getActivities(params);
          }

          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const count = Array.isArray(data) ? data.length : data.count || 0;
            const next = data.next || null;
            const previous = data.previous || null;

            const mappedActivities: ActivityLog[] = results.map((a: any) => ({
              id: String(a.id),
              type: a.type,
              channel: a.channel,
              direction: a.direction,
              title: a.title,
              content: a.content,
              date: a.date,
              relatedPersonId: a.related_person
                ? String(a.related_person)
                : undefined,
              relatedCompanyId: a.related_company
                ? String(a.related_company)
                : undefined,
              conversationId: a.conversation
                ? String(a.conversation)
                : undefined,
              userId: a.user_name,
              personName: a.person_name,
              companyName: a.company_name,
              personEmail: a.person_email,
              personPhone: a.person_phone,
              personStage: a.person_stage,
              personLeadType: a.person_lead_type,
              personLeadSource: a.person_lead_source,
              personConversionRate: a.person_conversion_rate,
              personLastAction: a.person_last_action,
            }));

            set((state) => {
              // Avoid duplicates
              const existingIds = new Set(state.activities.map((a) => a.id));
              const newActivities = mappedActivities.filter(
                (a) => !existingIds.has(a.id),
              );
              return {
                activities: append
                  ? [...state.activities, ...newActivities]
                  : mappedActivities,
                activitiesPagination: { next, previous },
                counts: { ...state.counts, activity: count },
              };
            });
            return { next, previous };
          }
        } catch (err) {
          console.error("Fetch activities error:", err);
        } finally {
          set((state) => ({ loading: { ...state.loading, activity: false } }));
        }
        return undefined;
      },
      fetchActivityById: async (id) => {
        try {
          const response = await api.getActivity(id);
          if (response.ok) {
            const a = await response.json();
            const mapped: ActivityLog = {
              id: String(a.id),
              type: a.type,
              channel: a.channel,
              direction: a.direction,
              title: a.title,
              content: a.content,
              date: a.date,
              relatedPersonId: a.related_person ? String(a.related_person) : undefined,
              relatedCompanyId: a.related_company ? String(a.related_company) : undefined,
              conversationId: a.conversation ? String(a.conversation) : undefined,
              userId: a.user_name,
              personName: a.person_name,
              companyName: a.company_name,
              personEmail: a.person_email,
              personPhone: a.person_phone,
              personStage: a.person_stage,
              personLeadType: a.person_lead_type,
              personLeadSource: a.person_lead_source,
              personConversionRate: a.person_conversion_rate,
              personLastAction: a.person_last_action,
            };
            set((state) => {
              const existingIds = new Set(state.activities.map((act) => act.id));
              if (!existingIds.has(mapped.id)) {
                return { activities: [...state.activities, mapped] };
              }
              return {
                activities: state.activities.map((act) => (act.id === mapped.id ? mapped : act)),
              };
            });
            return mapped;
          }
        } catch (err) {
          console.error("Fetch activity by id error:", err);
        }
        return undefined;
      },

      addActivity: async (activity) => {
        try {
          const response = await api.createActivity({
            type: activity.type,
            channel: activity.channel,
            direction: activity.direction,
            title: activity.title,
            content: activity.content,
            related_person: activity.relatedPersonId,
            related_company: activity.relatedCompanyId,
          });
          if (response.ok) {
            const a = await response.json();
            const mapped: ActivityLog = {
              id: String(a.id),
              type: a.type,
              channel: a.channel,
              direction: a.direction,
              title: a.title,
              content: a.content,
              date: a.date,
              relatedPersonId: a.related_person
                ? String(a.related_person)
                : undefined,
              relatedCompanyId: a.related_company
                ? String(a.related_company)
                : undefined,
              conversationId: a.conversation
                ? String(a.conversation)
                : undefined,
              userId: a.user_name,
              personName: a.person_name,
              companyName: a.company_name,
              personEmail: a.person_email,
              personPhone: a.person_phone,
              personStage: a.person_stage,
              personLeadType: a.person_lead_type,
              personLeadSource: a.person_lead_source,
              personConversionRate: a.person_conversion_rate,
              personLastAction: a.person_last_action,
            };
            set((state) => ({ activities: [...state.activities, mapped] }));
            return mapped;
          }
        } catch (err) {
          console.error("Add activity error:", err);
        }
        return undefined;
      },

      updateActivity: async (id, data) => {
        try {
          const payload: any = {};
          if (data.type !== undefined) payload.type = data.type;
          if (data.channel !== undefined) payload.channel = data.channel;
          if (data.direction !== undefined) payload.direction = data.direction;
          if (data.title !== undefined) payload.title = data.title;
          if (data.content !== undefined) payload.content = data.content;
          if (data.date !== undefined) payload.date = data.date;
          if (data.relatedPersonId !== undefined)
            payload.related_person = data.relatedPersonId;
          if (data.relatedCompanyId !== undefined)
            payload.related_company = data.relatedCompanyId;

          const response = await api.apiFetch(`/api/activities/${id}/`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const a = await response.json();
            set((state) => ({
              activities: state.activities.map((old) =>
                old.id === id
                  ? {
                    ...old,
                    type: a.type,
                    channel: a.channel,
                    direction: a.direction,
                    title: a.title,
                    content: a.content,
                    date: a.date,
                    relatedPersonId: a.related_person
                      ? String(a.related_person)
                      : undefined,
                    relatedCompanyId: a.related_company
                      ? String(a.related_company)
                      : undefined,
                    conversationId: a.conversation
                      ? String(a.conversation)
                      : undefined,
                    userId: a.user_name,
                    personName: a.person_name,
                    companyName: a.company_name,
                    personEmail: a.person_email,
                    personPhone: a.person_phone,
                    personStage: a.person_stage,
                    personLeadType: a.person_lead_type,
                    personLeadSource: a.person_lead_source,
                    personConversionRate: a.person_conversion_rate,
                    personLastAction: a.person_last_action,
                  }
                  : old,
              ),
            }));
          }
          return response;
        } catch (err) {
          console.error("Update activity error:", err);
        }
        return undefined;
      },

      deleteActivities: async (ids) => {
        try {
          await Promise.all(ids.map((id) => api.deleteActivity(id)));
          set((state) => ({
            activities: state.activities.filter((a) => !ids.includes(a.id)),
          }));
        } catch (err) {
          console.error("Delete activities error:", err);
          throw err;
        }
      },

      fetchInteractionTypes: async () => {
        const { interactionTypes } = get();
        if (interactionTypes.length > 0) {
          return;
        }

        if (interactionTypesRequest) {
          await interactionTypesRequest;
          return;
        }

        interactionTypesRequest = (async () => {
          try {
            const response = await api.getInteractionTypes();
            const data = await response.json();
            const results = Array.isArray(data) ? data : (data.results || []);

            if (Array.isArray(results)) {
              const mapped: InteractionType[] = results.map((t: any) => ({
                id: String(t.id),
                name: t.name,
                description: t.description,
                color: t.color,
                icon: t.icon,
                created_at: t.created_at,
                updated_at: t.updated_at,
              }));
              set({ interactionTypes: mapped });
            }
          } catch (error) {
            console.error("Error fetching interaction types:", error);
          } finally {
            interactionTypesRequest = null;
          }
        })();

        await interactionTypesRequest;
      },
      addInteractionType: async (data) => {
        try {
          const response = await api.createInteractionType(data);
          if (response.ok) {
            await get().fetchInteractionTypes();
            toast.success("Interaction type created successfully");
          } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.name?.[0] || errorData.detail || errorData.message || "Failed to create interaction type";
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error("Error creating interaction type:", error);
          throw error;
        }
      },
      updateInteractionType: async (id, data) => {
        try {
          const response = await api.updateInteractionType(id, data);
          if (response.ok) {
            await get().fetchInteractionTypes();
            toast.success("Interaction type updated successfully");
          } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.name?.[0] || errorData.detail || errorData.message || "Failed to update interaction type";
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error("Error updating interaction type:", error);
          throw error;
        }
      },
      deleteInteractionType: async (id) => {
        try {
          const response = await api.deleteInteractionType(id);
          if (response.ok) {
            await get().fetchInteractionTypes();
            toast.success("Interaction type deleted successfully");
          }
        } catch (error) {
          console.error("Error deleting interaction type:", error);
        }
      },

      fetchInteractions: async (params, append = false) => {
        try {
          let response;
          if (typeof params === "string" && params.startsWith("http")) {
            const url = new URL(params);
            const endpoint = url.pathname + url.search;
            response = await api.apiFetch(endpoint);
          } else {
            response = await api.getInteractions(params);
          }

          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const next = data.next || null;
            const previous = data.previous || null;

            const mappedInteractions: InteractionLog[] = results.map((i: any) => ({
              id: String(i.id),
              interaction_type: i.interaction_type,
              interaction_type_name: i.interaction_type_name,
              interaction_type_color: i.interaction_type_color,
              notes: i.notes,
              date: i.date,
              activity_log: i.activity_log,
              activity_log_details: i.activity_log_details,
              related_person: i.related_person,
              related_company: i.related_company,
              person_name: i.person_name,
              company_name: i.company_name,
              created_by: i.created_by,
              created_by_name: i.created_by_name,
              created_at: i.created_at,
              updated_at: i.updated_at,
            }));

            set((state) => {
              const existingIds = new Set(state.interactions.map((i) => i.id));
              const newInteractions = mappedInteractions.filter((i) => !existingIds.has(i.id));
              return {
                interactions: append ? [...state.interactions, ...newInteractions] : mappedInteractions,
                interactionsPagination: { next, previous },
              };
            });
            return { next, previous };
          }
        } catch (err) {
          console.error("Fetch interactions error:", err);
        }
      },

      addInteraction: async (interaction) => {
        try {
          const response = await api.createInteraction({
            interaction_type: interaction.interaction_type,
            related_person: interaction.related_person,
            related_company: interaction.related_company,
            notes: interaction.notes,
            date: interaction.date,
            activity_log: interaction.activity_log,
          });
          if (response.ok) {
            const i = await response.json();
            const mapped: InteractionLog = {
              id: String(i.id),
              interaction_type: i.interaction_type,
              interaction_type_name: i.interaction_type_name,
              interaction_type_color: i.interaction_type_color,
              notes: i.notes,
              date: i.date,
              activity_log: i.activity_log,
              activity_log_details: i.activity_log_details,
              related_person: i.related_person,
              related_company: i.related_company,
              person_name: i.person_name,
              company_name: i.company_name,
              created_by: i.created_by,
              created_by_name: i.created_by_name,
              created_at: i.created_at,
              updated_at: i.updated_at,
            };
            set((state) => ({ interactions: [...state.interactions, mapped] }));
            return mapped;
          }
        } catch (err) {
          console.error("Add interaction error:", err);
        }
        return undefined;
      },

      updateInteraction: async (id, data) => {
        try {
          const response = await api.updateInteraction(id, data);
          if (response.ok) {
            const i = await response.json();
            set((state) => ({
              interactions: state.interactions.map((old) =>
                old.id === id
                  ? {
                    ...old,
                    interaction_type: i.interaction_type,
                    interaction_type_name: i.interaction_type_name,
                    interaction_type_color: i.interaction_type_color,
                    notes: i.notes,
                    date: i.date,
                    activity_log: i.activity_log,
                    activity_log_details: i.activity_log_details,
                    related_person: i.related_person,
                    related_company: i.related_company,
                    person_name: i.person_name,
                    company_name: i.company_name,
                  }
                  : old,
              ),
            }));
          }
          return response;
        } catch (err) {
          console.error("Update interaction error:", err);
        }
        return undefined;
      },

      deleteInteractions: async (ids) => {
        try {
          await Promise.all(ids.map((id) => api.deleteInteraction(id)));
          set((state) => ({
            interactions: state.interactions.filter((i) => !ids.includes(i.id)),
          }));
        } catch (err) {
          console.error("Delete interactions error:", err);
          throw err;
        }
      },

      importData: async (type, data) => {
        try {
          const response = await api.importData(type, data);
          if (response.ok) {
            const length = Array.isArray(data) ? data.length : data.data.length;
            toast.success(`Successfully imported ${length} records`);
            const {
              fetchPeople,
              fetchCompanies,
              fetchTasks,
              fetchNotes,
              fetchActivities,
              fetchOpportunities,
            } = useStore.getState();
            switch (type) {
              case "person":
                fetchPeople();
                break;
              case "company":
                fetchCompanies();
                break;
              case "task":
                fetchTasks();
                break;
              case "note":
                fetchNotes();
                break;
              case "activity":
                fetchActivities();
                break;
              case "opportunity":
                fetchOpportunities();
                break;
            }
            return { success: true };
          } else if (response.status === 400) {
            const errors = await response.json();
            return { success: false, errors };
          }
          return { success: false, error: "Unknown error" };
        } catch (err) {
          console.error("Import error:", err);
          return { success: false, error: err };
        }
      },

      fetchReports: async (params) => {
        set((state) => ({ loading: { ...state.loading, report: true } }));
        try {
          const response = await api.getReports(params);
          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const count = Array.isArray(data) ? data.length : data.count || 0;
            const mappedReports: Report[] = results.map((r: any) => ({
              id: String(r.id),
              name: r.name,
              data: r.data || [],
              createdBy: r.created_by_name,
              createdAt: r.created_at,
              isShared: r.is_shared,
              filters: r.filters,
              sorts: r.sorts,
            }));
            set((state) => ({
              reports: mappedReports,
              counts: { ...state.counts, report: count },
            }));
          }
        } catch (err) {
          console.error("Fetch reports error:", err);
        } finally {
          set((state) => ({ loading: { ...state.loading, report: false } }));
        }
      },

      fetchAppUpdates: async (params) => {
        try {
          const response = await api.getAppUpdates(params);
          if (response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : data.results || [];
            const mapped: AppUpdate[] = results.map((u: any) => ({
              id: String(u.id),
              title: u.title,
              icon: u.icon,
              description: u.description,
              image_text: u.image_text,
              primary_action_label: u.primary_action_label,
              primary_action_link: u.primary_action_link,
              primary_action_is_internal: u.primary_action_is_internal,
              secondary_action_label: u.secondary_action_label,
              secondary_action_link: u.secondary_action_link,
              secondary_action_is_internal: u.secondary_action_is_internal,
              order: u.order,
            }));
            set({ appUpdates: mapped });
          }
        } catch (err) {
          console.error("Fetch app updates error:", err);
        }
      },

      fetchOrgUsers: async () => {
        try {
          const response = await api.getOrgUsers();
          if (response.ok) {
            const data = await response.json();
            set({ orgUsers: data });
          }
        } catch (err) {
          console.error("Fetch org users error:", err);
        }
      },

      addReport: async (report) => {
        try {
          const response = await api.createReport({
            name: report.name,
            is_shared: report.isShared,
            filters: report.filters || [],
            sorts: report.sorts || [],
            data: report.data, // Send the snapshot data
          });
          if (response.ok) {
            const r = await response.json();
            const mapped: Report = {
              id: String(r.id),
              name: r.name,
              data: r.data || [],
              createdBy: r.created_by_name,
              createdAt: r.created_at,
              isShared: r.is_shared,
              filters: r.filters,
              sorts: r.sorts,
            };
            set((state) => ({ reports: [mapped, ...state.reports] }));
            return mapped;
          }
        } catch (err) {
          console.error("Add report error:", err);
        }
        return undefined;
      },

      updateReport: async (id, data) => {
        try {
          const payload: any = {};
          if (data.name !== undefined) payload.name = data.name;
          if (data.isShared !== undefined) payload.is_shared = data.isShared;
          if (data.filters !== undefined) payload.filters = data.filters;
          if (data.sorts !== undefined) payload.sorts = data.sorts;
          // Usually we don't update data snapshot, but if needed:
          if (data.data !== undefined) payload.data = data.data;

          const response = await api.updateReport(id, payload);
          if (response.ok) {
            const r = await response.json();
            set((state) => ({
              reports: state.reports.map((old) =>
                old.id === id
                  ? {
                    ...old,
                    name: r.name,
                    data: r.data || [],
                    isShared: r.is_shared,
                    filters: r.filters,
                    sorts: r.sorts,
                  }
                  : old,
              ),
            }));
          }
        } catch (err) {
          console.error("Update report error:", err);
        }
      },

      deleteReports: async (ids) => {
        try {
          await Promise.all(ids.map((id) => api.deleteReport(id)));
          set((state) => ({
            reports: state.reports.filter((r) => !ids.includes(r.id)),
          }));
        } catch (err) {
          console.error("Delete reports error:", err);
        }
      },

      updateView: (id, data) =>
        set((state) => ({
          views: state.views.map((v) => (v.id === id ? { ...v, ...data } : v)),
        })),

      confirmDialog: {
        isOpen: false,
        title: "",
        description: "",
        confirmText: translations.common.confirm.en,
        cancelText: translations.common.cancel.en,
        onConfirm: () => { },
      },

      confirm: (options) =>
        set((state) => ({
          confirmDialog: {
            isOpen: true,
            title: options.title,
            description: options.description,
            confirmText: options.confirmText || translations.common.confirm[state.language],
            cancelText: options.cancelText || translations.common.cancel[state.language],
            onConfirm: options.onConfirm,
          },
        })),

      closeConfirm: () =>
        set((state) => ({
          confirmDialog: { ...state.confirmDialog, isOpen: false },
        })),

      setUser: (user) => {
        set({ user });
      },
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      fetchCurrentUser: async () => {
        if (currentUserRequest) {
          await currentUserRequest;
          return;
        }

        currentUserRequest = (async () => {
          try {
            const response = await api.getUserDetails();
            
            if (response.ok) {
              const userData = await response.json();
              set({ user: userData });
            } else {
              const errorData = await response.json().catch(() => ({}));
              
              // If the server says inactive via error message, update the state
              if (response.status === 403 && (
                errorData.detail?.toLowerCase().includes("inactive") || 
                errorData.code === "user_inactive"
              )) {
                set((state) => ({
                  user: state.user ? { ...state.user, is_active: false } : { is_active: false } as any
                }));
              }
            }
          } catch (err) {
            console.error("Fetch current user error:", err);
          } finally {
            currentUserRequest = null;
          }
        })();
        await currentUserRequest;
      },

      fetchMyAccess: async () => {
        try {
          const response = await api.getMyRolePermissions();
          if (response.ok) {
            const data = await response.json();
            set({ myAccess: data });
          }
        } catch (err) {
          console.error("Fetch my access error:", err);
        }
      },

      resendVerificationEmail: async () => {
        try {
          const response = await api.resendVerificationEmail();
          if (response.ok) {
            toast.success("Verification email sent! Please check your inbox.");
          }
        } catch (err) {
          console.error("Resend verification error:", err);
        }
      },
        logout: () => {
        posthog.reset();
        set({ user: null, accessToken: null, refreshToken: null });
      },
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      language: "en",
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: "founderstack-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        views: state.views,
        isSidebarCollapsed: state.isSidebarCollapsed,
        peopleExpanded: state.peopleExpanded,
        tasksExpanded: state.tasksExpanded,
        opportunitiesExpanded: state.opportunitiesExpanded,
        insightsExpanded: state.insightsExpanded,
        group3Expanded: state.group3Expanded,
        betaExpanded: state.betaExpanded,
        customStages: state.customStages,
        customLeadTypes: state.customLeadTypes,
        customLeadSources: state.customLeadSources,
        customChannels: state.customChannels,
        theme: state.theme,
        language: state.language,
      }),
    },
  ),
);
