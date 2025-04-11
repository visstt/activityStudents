import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import logo from "/chart.svg";
import profileIcon from "/user.svg";
import logoutIcon from "/logout.svg"; // Иконка для логаута

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

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

  const handleLogout = () => {
    document.cookie =
      "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    navigate("/login");
  };

  console.log("Текущее значение isAdmin:", isAdmin);

  return (
    <div className={styles.header}>
      <div className={styles.leftSection}>
        <Link to="/events">
          <img src={logo} alt="logo" />
        </Link>
        <h1>Анализ вовлеченности студентов</h1>
      </div>
      <div className={styles.rightSection}>
        {isAdmin && (
          <Link to="/admin" className={styles.profileLink}>
            <img
              src={profileIcon}
              alt="Личный кабинет"
              className={styles.profileIcon}
            />
          </Link>
        )}
        <Link to="/login" onClick={handleLogout} className={styles.profileLink}>
          <img src={logoutIcon} alt="Выйти" className={styles.profileIcon} />
        </Link>
      </div>
    </div>
  );
}
