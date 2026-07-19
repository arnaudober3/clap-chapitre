import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/Home';
import ArticlePage from './pages/Article';
import BilanCulturelPage from './pages/BilanCulturel';
import BilanCulturelArchivesPage from './pages/BilanCulturelArchives';
import AvisArchivesPage from './pages/AvisArchives';
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
        {/* The avis archive is always medium-filtered via the URL; bare /archives
            defaults to the first medium. */}
        <Route path="/archives" element={<Navigate to="/archives/films" replace />} />
        <Route path="/archives/:medium" element={<AvisArchivesPage />} />
        <Route path="/bilan-culturel" element={<BilanCulturelPage />} />
        <Route path="/bilan-culturel/archives" element={<BilanCulturelArchivesPage />} />
        <Route path="/a-propos" element={<AProposPage />} />
        <Route path="/me-suivre" element={<MeSuivrePage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
