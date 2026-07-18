import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/Home';
import ArticlePage from './pages/Article';
import BilanCulturelPage from './pages/BilanCulturel';
import ArchivesPage from './pages/Archives';
import AProposPage from './pages/APropos';
import MeSuivrePage from './pages/MeSuivre';
import NotFoundPage from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Root redirects to /films so the Films nav item is the default highlighted view. */}
        <Route path="/" element={<Navigate to="/films" replace />} />
        <Route path="/films" element={<HomePage />} />
        <Route path="/series" element={<HomePage />} />
        <Route path="/livres" element={<HomePage />} />
        <Route path="/docs" element={<HomePage />} />

        <Route path="/article/:id" element={<ArticlePage />} />
        <Route path="/bilan-culturel" element={<BilanCulturelPage />} />
        <Route path="/archives" element={<ArchivesPage />} />
        <Route path="/a-propos" element={<AProposPage />} />
        <Route path="/me-suivre" element={<MeSuivrePage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
