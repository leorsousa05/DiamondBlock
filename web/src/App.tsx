import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import StatusPage from './pages/StatusPage';
import MemoriesPage from './pages/MemoriesPage';
import MemoryDetailPage from './pages/MemoryDetailPage';
import MemoryFormPage from './pages/MemoryFormPage';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import IndexPage from './pages/IndexPage';
import DistillPage from './pages/DistillPage';
import McpInstallPage from './pages/McpInstallPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<StatusPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
          <Route path="/memories/new" element={<MemoryFormPage />} />
          <Route path="/memories/:id" element={<MemoryDetailPage />} />
          <Route path="/memories/:id/edit" element={<MemoryFormPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/index" element={<IndexPage />} />
          <Route path="/distill" element={<DistillPage />} />
          <Route path="/mcp-install" element={<McpInstallPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
