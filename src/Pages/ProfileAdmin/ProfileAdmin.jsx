// ProfileAdmin.jsx
import React, { useState, useEffect } from "react";
import styles from "./ProfileAdmin.module.css";
import { Link } from "react-router-dom";

export default function ProfileAdmin() {
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEventName, setNewEventName] = useState("");

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    if (!accessToken) {
      setError("Токен не найден");
      setLoading(false);
      return;
    }

    try {
      const profileResponse = await fetch(
        "http://localhost:3000/user/profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ access_token: accessToken }),
        }
      );

      if (!profileResponse.ok) {
        throw new Error("Ошибка при загрузке профиля");
      }

      const profileData = await profileResponse.json();
      setUserData(profileData);

      const eventsResponse = await fetch(
        "http://localhost:3000/event/allEvents",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!eventsResponse.ok) {
        throw new Error("Ошибка при загрузке мероприятий");
      }

      const eventsData = await eventsResponse.json();
      setEvents(eventsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    try {
      const response = await fetch("http://localhost:3000/event/addEvent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ eventName: newEventName }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при добавлении мероприятия");
      }

      setNewEventName("");
      await fetchProfileData(); // Обновляем список мероприятий
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEvent = async (id) => {
    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    try {
      const response = await fetch(`http://localhost:3000/event/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Ошибка при удалении мероприятия");
      }

      await fetchProfileData(); // Обновляем список мероприятий
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>Ошибка: {error}</div>;
  }

  return (
    <div className={styles.profileContainer}>
      <h1 className={styles.title}>Личный кабинет администратора</h1>

      <div className={styles.profileInfo}>
        <h2>Информация о пользователе</h2>
        <p>
          <strong>ФИО:</strong> {userData?.fullName}
        </p>
        <p>
          <strong>Логин:</strong> {userData?.login}
        </p>
        <p>
          <strong>Роль:</strong> {userData?.roleName}
        </p>
      </div>

      <div className={styles.eventsSection}>
        <h2>Список мероприятий</h2>

        <form onSubmit={handleAddEvent} className={styles.addEventForm}>
          <input
            type="text"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Название нового мероприятия"
            className={styles.eventInput}
          />
          <button type="submit" className={styles.addButton}>
            Добавить
          </button>
        </form>

        {events.length > 0 ? (
          <ul className={styles.eventsList}>
            {events.map((event) => (
              <li key={event.id} className={styles.eventItem}>
                <span>{event.eventName}</span>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className={styles.deleteButton}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Мероприятия не найдены</p>
        )}
      </div>

      <div className={styles.addUserSection}>
        <Link to="/admin/add-user" className={styles.addUserLink}>
          Добавить нового пользователя
        </Link>
      </div>
    </div>
  );
}
