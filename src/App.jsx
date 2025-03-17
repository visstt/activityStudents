import "./App.css";
import Login from "./Pages/Autn/Login/Login";
import Registration from "./Pages/Autn/Registration/Registration";
import GroupEventTable from "./Pages/GroupEventTable/GroupEventTable";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import StudentProfile from "./Pages/StudentProfile/StudentProfile";
import { jwtDecode } from "jwt-decode"; // Добавляем jwtDecode для проверки токена

function App() {
  // Функция для получения значения cookie по имени
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  };

  // Функция проверки авторизации
  const isAuthenticated = () => {
    const accessToken = getCookie("access_token");
    if (accessToken) {
      try {
        const decodedToken = jwtDecode(accessToken);
        const currentTime = Date.now() / 1000; // Текущее время в секундах
        return decodedToken.exp > currentTime; // Проверяем, не истек ли токен
      } catch (err) {
        console.error("Ошибка декодирования токена:", err);
        return false;
      }
    }
    return false;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Registration />} />
        <Route path="/login" element={<Login />} />

        {/* Защищенные маршруты */}
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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
