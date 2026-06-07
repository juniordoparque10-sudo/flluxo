import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import CompanyDetails from "./pages/CompanyDetails";
import Collaborators from "./pages/Collaborators";
import QuickRegister from "./pages/QuickRegister";
import Agenda from "./pages/Agenda";
import AccessManagement from "./pages/AccessManagement";
import Tasks from "./pages/Tasks";
import Documents from "./pages/Documents";
import Profile from "./pages/Profile";
import ActivityLogs from "./pages/ActivityLogs";
import GlobalSearch from "./pages/GlobalSearch";

import ProtectedRoute from "./routes/ProtectedRoute";
import PermissionRoute from "./routes/PermissionRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="dashboard">
                <Dashboard />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/empresas"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="companies">
                <Companies />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/empresas/:id"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="companies">
                <CompanyDetails />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/documentos"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="documents">
                <Documents />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/colaboradores"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="collaborators">
                <Collaborators />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/registro-rapido"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="quickRegister">
                <QuickRegister />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/agenda"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="agenda">
                <Agenda />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tarefas"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="tasks">
                <Tasks />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pesquisa"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="globalSearch">
                <GlobalSearch />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="activityLogs">
                <ActivityLogs />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/gestao-acessos"
          element={
            <ProtectedRoute>
              <PermissionRoute permission="accessManagement">
                <AccessManagement />
              </PermissionRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;