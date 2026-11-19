// Types
export interface DocumentSummary {
  id: number;
  title: string;
  updatedAt: string;
  isOwner: boolean;
}
export interface Document {
  id: number;
  ownerId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
export interface UserSummary {
  id: number;
  email: string;
}

// Token management
function getToken(): string | null {
  return localStorage.getItem('token');
}
export function setToken(token: string): void {
  localStorage.setItem('token', token);
}
export function clearToken(): void {
  localStorage.removeItem('token');
}

// Base fetch helper
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// Auth
export async function login(email: string, password: string): Promise<{ token: string }> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export async function logout(): Promise<void> {
  return request('/auth/logout', { method: 'POST' });
}

// Documents
export async function listDocuments(): Promise<DocumentSummary[]> {
  return request('/documents');
}
export async function createDocument(options?: { title?: string; content?: string }): Promise<Document> {
  const doc = await request<Document>('/documents', { method: 'POST' });
  // Apply title and/or starter content right after creation
  if (options?.title) {
    await request(`/documents/${doc.id}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title: options.title }),
    });
    doc.title = options.title;
  }
  if (options?.content) {
    await request(`/documents/${doc.id}`, {
      method: 'PUT',
      body: JSON.stringify({ content: options.content }),
    });
    doc.content = options.content;
  }
  return doc;
}
export async function getDocument(id: number): Promise<Document> {
  return request(`/documents/${id}`);
}
export async function saveDocument(id: number, content: string): Promise<void> {
  return request(`/documents/${id}`, { method: 'PUT', body: JSON.stringify({ content }) });
}
export async function renameDocument(id: number, title: string): Promise<void> {
  return request(`/documents/${id}/title`, { method: 'PATCH', body: JSON.stringify({ title }) });
}
export async function deleteDocument(id: number): Promise<void> {
  return request(`/documents/${id}`, { method: 'DELETE' });
}

// Sharing
export async function listCollaborators(docId: number): Promise<UserSummary[]> {
  return request(`/documents/${docId}/collaborators`);
}
export async function shareDocument(docId: number, email: string): Promise<void> {
  return request(`/documents/${docId}/share`, { method: 'POST', body: JSON.stringify({ email }) });
}
export async function revokeAccess(docId: number, email: string): Promise<void> {
  return request(`/documents/${docId}/share/${encodeURIComponent(email)}`, { method: 'DELETE' });
}

// Import
export async function importFile(file: File): Promise<Document> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Import failed: ${res.status}`);
  }
  return res.json();
}
