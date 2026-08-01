import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import AdminLayout from "./components/layout/AdminLayout";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import HomePage from "./pages/Home";
import ArticlePage from "./pages/Article";
import BilanCulturelPage from "./pages/BilanCulturel";
import BilanCulturelArchivesPage from "./pages/BilanCulturelArchives";
import AvisArchivesPage from "./pages/AvisArchives";
import AProposPage from "./pages/APropos";
import MeSuivrePage from "./pages/MeSuivre";
import AdminLoginPage from "./pages/AdminLogin";
import AdminDashboardPage from "./pages/AdminDashboard";
import AdminArticlesPage from "./pages/AdminArticles";
import AdminArticleFormPage from "./pages/AdminArticleForm";
import AdminBilansPage from "./pages/AdminBilans";
import AdminBilanFormPage from "./pages/AdminBilanForm";
import AdminNewsletterPage from "./pages/AdminNewsletter";
import AdminAProposPage from "./pages/AdminAPropos";
import AdminMeSuivrePage from "./pages/AdminMeSuivre";
import AdminNotFoundPage from "./pages/AdminNotFound";
import NotFoundPage from "./pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
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
          <Route
            path="/archives"
            element={<Navigate to="/archives/films" replace />}
          />
          <Route path="/archives/:medium" element={<AvisArchivesPage />} />
          <Route path="/bilan-culturel" element={<BilanCulturelPage />} />
          <Route
            path="/bilan-culturel/archives"
            element={<BilanCulturelArchivesPage />}
          />
          <Route path="/a-propos" element={<AProposPage />} />
          <Route path="/me-suivre" element={<MeSuivrePage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* The sign-in page sits outside AdminLayout: no rail, no drawer, and no
            guard — it is the way back in. Its static "login" segment outranks the
            "*" child of /admin below (react-router v6 route ranking). */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Espace admin — its own shell (rail/drawer), separate from the public
            Layout, and behind RequireAuth: an anonymous visitor on any /admin/**
            path lands on /admin/login and is sent back here once signed in.
            Every rail destination is built: Tableau de bord, Articles and
            Bilans culturels (listing and editor alike), Newsletter, and both
            "Pages du site" editors ("À propos" and "Me suivre"). An unknown
            /admin/** path gets the same 404 affiche as the public site, inside
            the admin shell. */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
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
          <Route path="me-suivre" element={<AdminMeSuivrePage />} />
          <Route path="*" element={<AdminNotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
