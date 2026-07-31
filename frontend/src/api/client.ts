import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export interface AuthStatus {
  needsSetup: boolean
  isAuthenticated: boolean
}

export interface Employee {
  id: number
  name: string
  nameInstr: string | null
  position: string | null
  bio: string | null
  bitrixId: number | null
  avatarUrl: string | null
  meetingRule: string | null
  nextMeetingAt: string | null
  lastMeetingDate: string | null
  agendaCount: number
  createdAt: string
}

export interface CalendarSyncResult {
  matched: {
    employeeId: number
    employeeName: string
    eventName: string
    rule: string | null
    next: string | null
  }[]
  unmatchedEvents: string[]
  unmatchedEmployees: string[]
  syncedAt: string
}

export interface BitrixUserPreview {
  name: string
  position: string | null
  avatarUrl: string | null
}

export type AgendaCategory = 'note' | 'positive' | 'warning' | 'problem'

export interface AgendaItem {
  id: number
  content: string
  isDiscussed: boolean
  isImportant: boolean
  category: AgendaCategory
  sortOrder: number
  createdAt: string
}

export interface ImportantItem extends AgendaItem {
  employeeId: number
  employeeName: string
}

export interface Meeting {
  id: number
  date: string
  notes: string
  discussedTopics: string[]
  mood: number | null
  duration: number | null
  createdAt: string
}

export interface GlobalMeeting extends Meeting {
  employeeId: number
  employeeName: string
  employeeAvatarUrl: string | null
}

export const authApi = {
  check: () => api.get<AuthStatus>('/auth/check'),
  setup: (password: string) => api.post('/auth/setup', { password }),
  login: (password: string) => api.post('/auth/login', { password }),
  logout: () => api.post('/auth/logout'),
}

export const employeesApi = {
  list: () => api.get<Employee[]>('/employees'),
  get: (id: number) => api.get<Employee>(`/employees/${id}`),
  create: (data: { name: string; nameInstr?: string; position?: string; bio?: string; bitrixId?: number; avatarUrl?: string }) => api.post<Employee>('/employees', data),
  update: (id: number, data: { name?: string; nameInstr?: string | null; position?: string; bio?: string; bitrixId?: number | null; avatarUrl?: string | null }) => api.put<Employee>(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
  bitrixStatus: () => api.get<{ configured: boolean }>('/employees/bitrix-status'),
  bitrixPreview: (bitrixId: number) => api.get<BitrixUserPreview>(`/employees/bitrix-preview/${bitrixId}`),
  syncCalendar: () => api.post<CalendarSyncResult>('/bitrix/sync-calendar'),
}

export const agendaApi = {
  list: (employeeId: number) => api.get<AgendaItem[]>(`/employees/${employeeId}/agenda`),
  create: (employeeId: number, content: string, category?: AgendaCategory) =>
    api.post<AgendaItem>(`/employees/${employeeId}/agenda`, { content, category }),
  update: (id: number, data: { content?: string; isDiscussed?: boolean; isImportant?: boolean; category?: AgendaCategory }) =>
    api.put<AgendaItem>(`/agenda/${id}`, data),
  delete: (id: number) => api.delete(`/agenda/${id}`),
  reorder: (employeeId: number, itemIds: number[]) =>
    api.put(`/employees/${employeeId}/agenda/reorder`, { itemIds }),
  important: () => api.get<ImportantItem[]>('/agenda/important'),
}

export const meetingsApi = {
  list: (employeeId: number) => api.get<Meeting[]>(`/employees/${employeeId}/meetings`),
  listAll: () => api.get<GlobalMeeting[]>('/meetings'),
  create: (employeeId: number, data: { notes: string; date?: string; discussedTopics?: string[]; mood?: number; duration?: number }) =>
    api.post<Meeting>(`/employees/${employeeId}/meetings`, data),
  get: (id: number) => api.get<Meeting>(`/meetings/${id}`),
}

export type ScrumTab = 'sos' | 'topics' | 'decisions'

export interface ScrumNote {
  id: number
  content: string
  date: string
  tab: ScrumTab
  people: number[]
  createdAt: string
  updatedAt: string
}

export const scrumApi = {
  list: () => api.get<ScrumNote[]>('/scrum-notes'),
  create: (data: { content: string; date?: string; tab?: ScrumTab; people?: number[] }) =>
    api.post<ScrumNote>('/scrum-notes', data),
  update: (id: number, data: { content?: string; date?: string; tab?: ScrumTab; people?: number[] }) =>
    api.put<ScrumNote>(`/scrum-notes/${id}`, data),
}

export default api
