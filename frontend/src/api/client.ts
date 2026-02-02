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
  position: string | null
  lastMeetingDate: string | null
  agendaCount: number
  createdAt: string
}

export type AgendaCategory = 'note' | 'positive' | 'warning' | 'problem'

export interface AgendaItem {
  id: number
  content: string
  isDiscussed: boolean
  category: AgendaCategory
  sortOrder: number
  createdAt: string
}

export interface Meeting {
  id: number
  date: string
  notes: string
  discussedTopics: string[]
  createdAt: string
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
  create: (data: { name: string; position?: string }) => api.post<Employee>('/employees', data),
  update: (id: number, data: { name?: string; position?: string }) => api.put<Employee>(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
}

export const agendaApi = {
  list: (employeeId: number) => api.get<AgendaItem[]>(`/employees/${employeeId}/agenda`),
  create: (employeeId: number, content: string, category?: AgendaCategory) =>
    api.post<AgendaItem>(`/employees/${employeeId}/agenda`, { content, category }),
  update: (id: number, data: { content?: string; isDiscussed?: boolean; category?: AgendaCategory }) =>
    api.put<AgendaItem>(`/agenda/${id}`, data),
  delete: (id: number) => api.delete(`/agenda/${id}`),
  reorder: (employeeId: number, itemIds: number[]) =>
    api.put(`/employees/${employeeId}/agenda/reorder`, { itemIds }),
}

export const meetingsApi = {
  list: (employeeId: number) => api.get<Meeting[]>(`/employees/${employeeId}/meetings`),
  create: (employeeId: number, data: { notes: string; date?: string; discussedTopics?: string[] }) =>
    api.post<Meeting>(`/employees/${employeeId}/meetings`, data),
  get: (id: number) => api.get<Meeting>(`/meetings/${id}`),
}

export default api
