import React, { useState, useEffect } from "react";
import styles from "./Registration.module.css";
import { useNavigate, Link } from "react-router-dom"; // Добавлен Link
import axios from "axios";

function Registration() {
  const [formData, setFormData] = useState({
    fullName: "",
    login: "",
    password: "",
    role: "",
  });

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/role/all-roles"
        );
        setRoles(response.data);
        if (response.data.length > 0) {
          setFormData((prev) => ({ ...prev, role: response.data[0].value }));
        }
      } catch (err) {
        console.error("Ошибка при загрузке ролей:", err);
        setError("Не удалось загрузить роли");
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        "http://localhost:3000/auth/register",
        formData
      );
      console.log("Успешная регистрация:", response.data);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Ошибка при регистрации");
      console.error("Ошибка:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formContainer}>
        <h2 className={styles.title}>Регистрация</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="ФИО"
            className={styles.input}
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
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
          <select
            className={styles.select}
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={rolesLoading || roles.length === 0}
          >
            {rolesLoading ? (
              <option>Загрузка ролей...</option>
            ) : roles.length === 0 ? (
              <option>Роли не найдены</option>
            ) : (
              roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.name}
                </option>
              ))
            )}
          </select>
          <button
            type="submit"
            className={styles.button}
            disabled={loading || rolesLoading}
          >
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
        <p className={styles.linkText}>
          Уже есть аккаунт?{" "}
          <Link to="/login" className={styles.link}>
            Войти
          </Link>
        </p>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

export default Registration;
