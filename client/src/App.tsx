import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DocumentListPage from './pages/DocumentListPage';
import EditorPage from './pages/EditorPage';
import { clearToken, setToken } from './api/client';

type View =
  | { name: 'login' }
  | { name: 'list' }
  | { name: 'editor'; documentId: number };

function App() {
  const [view, setView] = useState<View>({ name: 'login' });
  const [userEmail, setUserEmail] = useState<string | undefined>();

  // On mount: check if a token exists in localStorage
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

  if (view.name === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (view.name === 'list') {
    return (
      <DocumentListPage
        onSelectDocument={handleSelectDocument}
        userEmail={userEmail}
        onLogout={handleLogout}
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
