import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { BoardProvider } from './context/BoardContext';
import { TaskProvider } from './context/TaskContext';
import Layout from './components/common/Layout';
import SignInScreen from './components/common/SignInScreen';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import BoardList from './components/Boards/BoardList';
import BoardView from './components/Boards/BoardView';
import BoardSettings from './components/Settings/BoardSettings';
import JoinBoard from './components/Boards/JoinBoard';
import TaskDetail from './components/Tasks/TaskDetail';
import ArchivedTasks from './components/Tasks/ArchivedTasks';

function AppContent() {
  const { isAuthenticated, isLoading, isBootstrapping, signIn } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <LoadingSpinner message={isBootstrapping ? 'Setting up your workspace...' : 'Loading TaskTracker...'} />
      </div>
    );
  }

  // Allow /join route before sign-in
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/join/:boardId"
          element={
            <OfflineProvider>
              <BoardProvider>
                <JoinBoard />
              </BoardProvider>
            </OfflineProvider>
          }
        />
        <Route path="*" element={<SignInScreen onSignIn={signIn} isLoading={isLoading} />} />
      </Routes>
    );
  }

  return (
    <ErrorBoundary>
      <OfflineProvider>
        <BoardProvider>
          <TaskProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<BoardList />} />
                <Route path="/board/:boardId" element={<BoardView />} />
                <Route path="/board/:boardId/task/:taskId" element={<TaskDetail />} />
                <Route path="/board/:boardId/archived" element={<ArchivedTasks />} />
                <Route path="/board/:boardId/settings" element={<BoardSettings />} />
                <Route path="/join/:boardId" element={<JoinBoard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </TaskProvider>
        </BoardProvider>
      </OfflineProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
