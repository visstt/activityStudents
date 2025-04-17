import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";

export default function Header({
  onRateEventsClick,
  onReturnToMainTable,
  isRatingTableVisible,
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Функция для форматирования ФИО
  const formatName = (fullName) => {
    if (!fullName || typeof fullName !== "string") return "Неизвестно";

    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 0) return "Неизвестно";
    if (parts.length === 1) return parts[0]; // Только фамилия

    const lastName = parts[0]; // Фамилия (первый элемент в русском формате)
    const firstNameInitial = parts[1]?.[0] ? `${parts[1][0]}.` : ""; // Инициал имени
    const patronymicInitial = parts[2]?.[0] ? `${parts[2][0]}.` : ""; // Инициал отчества

    return `${lastName} ${firstNameInitial}${patronymicInitial}`.trim();
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log("Начинаем проверку статуса администратора");

      const accessToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("access_token="))
        ?.split("=")[1];

      console.log("Найденный access_token:", accessToken);

      if (!accessToken) {
        console.log("Токен не найден в cookies");
        return;
      }

      try {
        console.log("Отправляем запрос на сервер");
        const response = await fetch("http://localhost:3000/user/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ access_token: accessToken }),
        });

        console.log("Статус ответа:", response.status);

        const data = await response.json();
        console.log("Полученные данные от сервера:", data);

        setUserData({
          fullName: data.fullName || "Неизвестно",
          roleName: data.roleName || "Роль не указана",
        });

        if (data.roleName === "admin") {
          console.log("Пользователь является администратором");
          setIsAdmin(true);
        } else {
          console.log("Пользователь не администратор, role:", data.roleName);
        }
      } catch (error) {
        console.error("Ошибка при проверке статуса администратора:", error);
      }
    };

    checkAdminStatus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    document.cookie =
      "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    navigate("/login");
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  console.log("Текущее значение isAdmin:", isAdmin);

  return (
    <header>
      <div className="container">
        <div className={styles.header}>
          <div className={styles.logo_section}>
            <Link to="/events">
              <img src="/logo.svg" alt="logo" />
            </Link>
            <h1>Эхо участия</h1>
          </div>
          <div className={styles.nav_section}>
            <ul>
              <li className={!isRatingTableVisible ? styles.active : ""}>
                <Link to="/events" onClick={onReturnToMainTable}>
                  Основная таблица
                </Link>
              </li>
              <li className={isRatingTableVisible ? styles.active : ""}>
                <button
                  onClick={onRateEventsClick}
                  className={styles.rateButton}
                  style={{
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                  }}
                >
                  Оценить мероприятия
                </button>
              </li>
            </ul>
          </div>
          <div className={styles.user_section}>
            <img src="/bell.svg" alt="bell" className={styles.bell} />
            <div
              className={styles.user_info_wrapper}
              onClick={toggleDropdown}
              ref={dropdownRef}
            >
              <div className={styles.user_info}>
                <h2>{formatName(userData.fullName)}</h2>
                <p>{userData.roleName}</p>
              </div>
              <img
                src="/user_logo.svg"
                alt="user_logo"
                className={styles.user_logo}
              />
              {isDropdownOpen && (
                <ul className={styles.dropdown}>
                  {isAdmin && (
                    <li>
                      <Link
                        to="/admin"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Панель администратора
                      </Link>
                    </li>
                  )}
                  <li onClick={handleLogout}>Выйти</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
