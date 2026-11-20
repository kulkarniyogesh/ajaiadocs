import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DocumentListPage from './pages/DocumentListPage';
import SharedWithMePage from './pages/SharedWithMePage';
import RecentPage from './pages/RecentPage';
import EditorPage from './pages/EditorPage';
import { clearToken, setToken } from './api/client';

type View =
  | { name: 'login' }
  | { name: 'list' }
  | { name: 'shared-with-me' }
  | { name: 'recent' }
  | { name: 'editor'; documentId: number };

function App() {
  const [view, setView] = useState<View>({ name: 'login' });
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    if (token && email) {
      setUserEmail(email);
      setView({ name: 'list' });
    }
  }, []);

  function handleLoginSuccess(token: string, email: string) {
    setToken(token);
    localStorage.setItem('userEmail', email);
    setUserEmail(email);
    setView({ name: 'list' });
  }

  function handleLogout() {
    clearToken();
    localStorage.removeItem('userEmail');
    setUserEmail(undefined);
    setView({ name: 'login' });
  }

  function handleSelectDocument(id: number) {
    setView({ name: 'editor', documentId: id });
  }

  function handleBackToList() {
    setView({ name: 'list' });
  }

  /** Called when a nav tab is clicked from any page */
  function handleTabChange(tab: string) {
    if (tab === 'shared-with-me') setView({ name: 'shared-with-me' });
    else if (tab === 'recent') setView({ name: 'recent' });
    else setView({ name: 'list' }); // 'all-documents' + 'architecture'
  }

  if (view.name === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (view.name === 'list') {
    return (
      <DocumentListPage
        onSelectDocument={handleSelectDocument}
        userEmail={userEmail}
        onLogout={handleLogout}
        onTabChange={handleTabChange}
      />
    );
  }

  if (view.name === 'shared-with-me') {
    return (
      <SharedWithMePage
        onSelectDocument={handleSelectDocument}
        userEmail={userEmail}
        onLogout={handleLogout}
        onTabChange={handleTabChange}
      />
    );
  }

  if (view.name === 'recent') {
    return (
      <RecentPage
        onSelectDocument={handleSelectDocument}
        userEmail={userEmail}
        onLogout={handleLogout}
        onTabChange={handleTabChange}
      />
    );
  }

  if (view.name === 'editor') {
    return (
      <EditorPage
        documentId={view.documentId}
        onBack={handleBackToList}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}

export default App;
