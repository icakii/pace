import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider } from "@/lib/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import CalendarPage from "@/pages/CalendarPage";
import TasksPage from "@/pages/TasksPage";
import ThoughtsPage from "@/pages/ThoughtsPage";
import QuotePage from "@/pages/QuotePage";
import ProfilePage from "@/pages/ProfilePage";
import LibraryPage from "@/pages/LibraryPage";
import GamesPage from "@/pages/GamesPage";
import SolitairePage from "@/pages/games/SolitairePage";
import WordPuzzlePage from "@/pages/games/WordPuzzlePage";
import MemoryMatchPage from "@/pages/games/MemoryMatchPage";
import Game2048Page from "@/pages/games/Game2048Page";
import Welcome from "@/pages/Welcome";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PageNotFound from "@/lib/PageNotFound";

const ReaderPage = lazy(() => import("@/pages/ReaderPage"));

const ReaderFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              element={
                <ProtectedRoute unauthenticatedElement={<Navigate to="/welcome" replace />} />
              }
            >
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
              </Route>
            </Route>

            <Route
              element={
                <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />
              }
            >
              <Route
                path="/reader/:bookId"
                element={
                  <Suspense fallback={<ReaderFallback />}>
                    <ReaderPage />
                  </Suspense>
                }
              />

              <Route element={<Layout />}>
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/thoughts" element={<ThoughtsPage />} />
                <Route path="/quote" element={<QuotePage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/games/solitaire" element={<SolitairePage />} />
                <Route path="/games/wordle" element={<WordPuzzlePage />} />
                <Route path="/games/memory" element={<MemoryMatchPage />} />
                <Route path="/games/2048" element={<Game2048Page />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
