import "./App.css";
import Login from "./Pages/Autn/Login/Login";
import GroupEventTable from "./Pages/GroupEventTable/GroupEventTable";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import StudentProfile from "./Pages/StudentProfile/StudentProfile";
import ProfileAdmin from "./Pages/ProfileAdmin/ProfileAdmin";
import AddUser from "./Pages/ProfileAdmin/AddUser";
import { useState, useEffect } from "react";
import NoAccess from "./Pages/NoAccess/NoAccess";

function App() {
  // Функция для получения значения cookie по имени
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  };

  // Компонент для защищенных маршрутов с проверкой роли
  const ProtectedAdminRoute = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(null); // null - еще не проверено
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const checkAdminStatus = async () => {
        const accessToken = getCookie("access_token");

        if (!accessToken) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        try {
          const response = await fetch("http://localhost:3000/user/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ access_token: accessToken }),
          });

          if (!response.ok) {
            throw new Error("Ошибка при проверке профиля");
          }

          const data = await response.json();
          setIsAdmin(data.roleName === "admin");
        } catch (err) {
          console.error("Ошибка при проверке роли:", err);
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      };

      checkAdminStatus();
    }, []);

    if (loading) {
      return <div>Проверка доступа...</div>;
    }

    return isAdmin ? children : <Navigate to="/no-access" replace />;
  };

  // Функция проверки авторизации (без проверки роли)
  const isAuthenticated = () => {
    const accessToken = getCookie("access_token");
    return !!accessToken;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/events"
          element={
            isAuthenticated() ? (
              <GroupEventTable />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/student/profile/:studentId"
          element={
            isAuthenticated() ? (
              <StudentProfile />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <ProfileAdmin />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/add-user"
          element={
            <ProtectedAdminRoute>
              <AddUser />
            </ProtectedAdminRoute>
          }
        />

        {/* Страница "Нет доступа" */}
        <Route path="/no-access" element={<NoAccess />} />

        {/* Перенаправление с корня на /events */}
        <Route path="/" element={<Navigate to="/events" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
