import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import HomePage from './pages/Home';
import ArticlePage from './pages/Article';
import BilanCulturelPage from './pages/BilanCulturel';
import BilanCulturelArchivesPage from './pages/BilanCulturelArchives';
import AvisArchivesPage from './pages/AvisArchives';
import AProposPage from './pages/APropos';
import MeSuivrePage from './pages/MeSuivre';
import AdminDashboardPage from './pages/AdminDashboard';
import AdminArticlesPage from './pages/AdminArticles';
import AdminArticleFormPage from './pages/AdminArticleForm';
import AdminBilansPage from './pages/AdminBilans';
import AdminBilanFormPage from './pages/AdminBilanForm';
import AdminNewsletterPage from './pages/AdminNewsletter';
import AdminAProposPage from './pages/AdminAPropos';
import AdminPlaceholder from './pages/AdminPlaceholder';
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

      {/* Espace admin — its own shell (rail/drawer), separate from the public
          Layout. Tableau de bord, Articles and Bilans culturels are wired,
          listing and editor alike, and so is the Newsletter; the two "Pages du
          site" sections land on a shared "à venir" placeholder (as does any
          unknown /admin/** path). */}
          listing and editor alike, and so is the Newsletter; plus the "À propos" page editor; the other
          sections land on a shared "à venir" placeholder (as does any unknown
          /admin/** path). */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="articles" element={<AdminArticlesPage />} />
        {/* The static "nouveau" segment wins over :id (react-router ranking). */}
        <Route path="articles/nouveau" element={<AdminArticleFormPage />} />
        <Route path="articles/:id" element={<AdminArticleFormPage />} />
        <Route path="bilans" element={<AdminBilansPage />} />
        <Route path="bilans/nouveau" element={<AdminBilanFormPage />} />
        <Route path="bilans/:id" element={<AdminBilanFormPage />} />
        <Route path="newsletter" element={<AdminNewsletterPage />} />
        <Route path="a-propos" element={<AdminAProposPage />} />
        <Route path="me-suivre" element={<AdminPlaceholder />} />
        <Route path="*" element={<AdminPlaceholder />} />
      </Route>
    </Routes>
  );
}
