import React, { useState } from "react";
import styles from "./Login.module.css";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

function Login() {
  const [formData, setFormData] = useState({
    login: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    const token = parts.length === 2 ? parts.pop().split(";").shift() : null;
    console.log(`Получение cookie "${name}":`, token || "не найдено");
    return token;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Отправка запроса на вход с данными:", formData);
      const response = await axios.post(
        "http://localhost:3000/auth/login",
        formData,
        { withCredentials: true }
      );
      console.log("Ответ от сервера:", response);

      // const accessToken = getCookie("access_token");
      // console.log("Токен из cookie:", accessToken);

      // if (!accessToken) {
      //   throw new Error("Не удалось получить токен авторизации");
      // }

      // const decodedToken = jwtDecode(accessToken);
      // console.log("Декодированный токен:", decodedToken);

      // const userId = decodedToken.sub;
      // console.log("Извлечен userId из токена:", userId);

      // localStorage.setItem("userId", userId);
      // console.log(
      //   "userId сохранен в localStorage:",
      //   localStorage.getItem("userId")
      // );

      console.log("Попытка перенаправления на /events");

      const accessToken = getCookie("access_token");
      console.log(accessToken);

      if (!accessToken) {
        navigate("/");
      } else {
        // navigate("/events", { replace: true });
        window.location.replace("/events");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Ошибка при входе в систему";
      setError(errorMessage);
      console.error("Ошибка авторизации:", err);
    } finally {
      setLoading(false);
      console.log("Завершение обработки входа, loading:", false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Авторизация</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Логин"
            className={styles.input}
            name="login"
            value={formData.login}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            className={styles.input}
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
        <p className={styles.linkText}>
          Нет аккаунта?{" "}
          <Link to="/register" className={styles.link}>
            Зарегистрироваться
          </Link>
        </p>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

export default Login;
