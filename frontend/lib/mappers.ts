// Utility functions to map between backend (snake_case) and frontend (camelCase)

import { Person, Company, Opportunity, Task, Note, ActivityLog, CustomView, Report } from '../types';

// Person mapping
export function mapPersonFromBackend(data: any): Person {
    return {
        id: data.id,
        name: data.name,
        avatar: data.avatar,
        email: data.email,
        jobTitle: data.job_title,
        companyId: data.company,
        companyName: data.company_name || '',
        phone: data.phone || '',
        city: data.city || '',
        linkedin: data.linkedin,
        createdAt: data.created_at,
        createdBy: data.created_by,
        conversionRate: data.conversion_rate,
        stage: data.stage,
        lastAction: data.last_action,
        leadType: data.lead_type,
    };
}

export function mapPersonToBackend(data: Partial<Person>): any {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.email !== undefined) mapped.email = data.email;
    if (data.jobTitle !== undefined) mapped.job_title = data.jobTitle;
    if (data.companyId !== undefined) mapped.company = data.companyId;
    if (data.phone !== undefined) mapped.phone = data.phone;
    if (data.city !== undefined) mapped.city = data.city;
    if (data.linkedin !== undefined) mapped.linkedin = data.linkedin;
    if (data.avatar !== undefined) mapped.avatar = data.avatar;
    if (data.conversionRate !== undefined) mapped.conversion_rate = data.conversionRate;
    if (data.stage !== undefined) mapped.stage = data.stage;
    if (data.lastAction !== undefined) mapped.last_action = data.lastAction;
    if (data.leadType !== undefined) mapped.lead_type = data.leadType;
    return mapped;
}

// Company mapping
export function mapCompanyFromBackend(data: any): Company {
    return {
        id: data.id,
        name: data.name,
        domain: data.domain || '',
        employees: data.employees || '',
        location: data.location || '',
        linkedin: data.linkedin,
        createdAt: data.created_at,
        owner: data.owner,
        arr: data.arr || '',
        icp: data.icp || false,
    };
}

export function mapCompanyToBackend(data: Partial<Company>): any {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.domain !== undefined) mapped.domain = data.domain;
    if (data.employees !== undefined) mapped.employees = data.employees;
    if (data.location !== undefined) mapped.location = data.location;
    if (data.linkedin !== undefined) mapped.linkedin = data.linkedin;
    if (data.arr !== undefined) mapped.arr = data.arr;
    if (data.icp !== undefined) mapped.icp = data.icp;
    return mapped;
}

// Opportunity mapping
export function mapOpportunityFromBackend(data: any): Opportunity {
    return {
        id: data.id,
        name: data.name,
        value: parseFloat(data.value),
        companyName: data.company_name || '',
        contactName: data.contact_name || '',
        stage: data.stage,
        createdAt: data.created_at,
    };
}

export function mapOpportunityToBackend(data: Partial<Opportunity>): any {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.value !== undefined) mapped.value = data.value;
    if (data.stage !== undefined) mapped.stage = data.stage;
    // Note: company and contact are IDs in backend, not names
    return mapped;
}

// Task mapping
export function mapTaskFromBackend(data: any): Task {
    return {
        id: data.id,
        title: data.title,
        status: data.status,
        dueDate: data.due_date,
        relatedPersonId: data.related_person,
        relatedCompanyId: data.related_company,
        assignee: data.assignee,
        createdBy: data.created_by,
        createdAt: data.created_at,
        description: data.description,
    };
}

export function mapTaskToBackend(data: Partial<Task>): any {
    const mapped: any = {};
    if (data.title !== undefined) mapped.title = data.title;
    if (data.status !== undefined) mapped.status = data.status;
    if (data.dueDate !== undefined) mapped.due_date = data.dueDate;
    if (data.relatedPersonId !== undefined) mapped.related_person = data.relatedPersonId;
    if (data.relatedCompanyId !== undefined) mapped.related_company = data.relatedCompanyId;
    if (data.assignee !== undefined) mapped.assignee = data.assignee;
    if (data.description !== undefined) mapped.description = data.description;
    return mapped;
}

// Note mapping
export function mapNoteFromBackend(data: any): Note {
    return {
        id: data.id,
        title: data.title,
        content: data.content,
        relatedPersonId: data.related_person,
        relatedCompanyId: data.related_company,
        createdAt: data.created_at,
    };
}

export function mapNoteToBackend(data: Partial<Note>): any {
    const mapped: any = {};
    if (data.title !== undefined) mapped.title = data.title;
    if (data.content !== undefined) mapped.content = data.content;
    if (data.relatedPersonId !== undefined) mapped.related_person = data.relatedPersonId;
    if (data.relatedCompanyId !== undefined) mapped.related_company = data.relatedCompanyId;
    return mapped;
}

// ActivityLog mapping
export function mapActivityFromBackend(data: any): ActivityLog {
    return {
        id: data.id,
        type: data.type,
        channel: data.channel,
        direction: data.direction,
        title: data.title,
        content: data.content,
        date: data.date,
        relatedPersonId: data.related_person,
        relatedCompanyId: data.related_company,
        userId: data.user,
    };
}

export function mapActivityToBackend(data: Partial<ActivityLog>): any {
    const mapped: any = {};
    if (data.type !== undefined) mapped.type = data.type;
    if (data.channel !== undefined) mapped.channel = data.channel;
    if (data.direction !== undefined) mapped.direction = data.direction;
    if (data.title !== undefined) mapped.title = data.title;
    if (data.content !== undefined) mapped.content = data.content;
    if (data.relatedPersonId !== undefined) mapped.related_person = data.relatedPersonId;
    if (data.relatedCompanyId !== undefined) mapped.related_company = data.relatedCompanyId;
    return mapped;
}

// CustomView mapping
export function mapViewFromBackend(data: any): CustomView {
    return {
        id: data.id,
        name: data.name,
        entityType: data.entity_type,
        filterRules: data.filter_rules || [],
        sortRules: data.sort_rules || [],
        visibleColumns: data.visible_columns || [],
        isDefault: data.is_default || false,
    };
}

export function mapViewToBackend(data: Partial<CustomView>): any {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.entityType !== undefined) mapped.entity_type = data.entityType;
    if (data.filterRules !== undefined) mapped.filter_rules = data.filterRules;
    if (data.sortRules !== undefined) mapped.sort_rules = data.sortRules;
    if (data.visibleColumns !== undefined) mapped.visible_columns = data.visibleColumns;
    if (data.isDefault !== undefined) mapped.is_default = data.isDefault;
    return mapped;
}

// Report mapping
export function mapReportFromBackend(data: any): Report {
    return {
        id: data.id,
        name: data.name,
        data: [], // Reports don't store data in backend
        createdBy: data.created_by,
        createdAt: data.created_at,
        isShared: data.is_shared || false,
        filters: data.filters || [],
        sorts: data.sorts || [],
    };
}

export function mapReportToBackend(data: Partial<Report>): any {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.isShared !== undefined) mapped.is_shared = data.isShared;
    if (data.filters !== undefined) mapped.filters = data.filters;
    if (data.sorts !== undefined) mapped.sorts = data.sorts;
    return mapped;
}
