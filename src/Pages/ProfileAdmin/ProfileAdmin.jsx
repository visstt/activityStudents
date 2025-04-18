import React, { useState, useEffect } from "react";
import styles from "./ProfileAdmin.module.css";
import { Link, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import ru from "date-fns/locale/ru";
import Header from "../../Components/Header/Header";
import Loading from "../../Components/Loading/Loading";

export default function ProfileAdmin() {
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState(null);
  const navigate = useNavigate();

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
    if (!newEventName.trim() || !newEventDate) {
      setError("Введите название и дату мероприятия");
      return;
    }

    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    try {
      const formattedDate = format(
        newEventDate,
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        { timeZone: "UTC" }
      );
      const response = await fetch("http://localhost:3000/event/addEvent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          eventName: newEventName,
          eventDate: formattedDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при добавлении мероприятия");
      }

      setNewEventName("");
      setNewEventDate(null);
      await fetchProfileData();
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

      await fetchProfileData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    document.cookie =
      "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    navigate("/login");
  };

  const handleBackToEvents = () => {
    navigate("/events");
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <div className={styles.error}>Ошибка: {error}</div>;
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.profileContainer}>
          <button
            onClick={handleBackToEvents}
            className={styles.backButton}
            title="Назад к мероприятиям"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#333"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Личный кабинет администратора</h1>
          <div className={styles.admins_tables}>
            <div className={styles.info_wrapper}>
              <h2>Информация о пользователе</h2>
              <div className={styles.tralalero}>
                <div className={styles.blockInfo}>
                  <h3>ФИО</h3>
                  <p>{userData?.fullName}</p>
                </div>
                <div className={styles.blockInfo}>
                  <h3>Логин</h3>
                  <p>{userData?.login}</p>
                </div>
                <div className={styles.blockInfo}>
                  <h3>Роль</h3>
                  <p>{userData?.roleName}</p>
                </div>
              </div>
            </div>
            <div className={styles.event_table}>
              <div className={styles.create_event}>
                <h2>Мероприятия</h2>
              </div>
              <form onSubmit={handleAddEvent} className={styles.addEventForm}>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="Название нового мероприятия"
                  className={styles.eventInput}
                />
                <DatePicker
                  selected={newEventDate}
                  onChange={(date) => setNewEventDate(date)}
                  dateFormat="dd.MM.yyyy"
                  locale={ru}
                  placeholderText="Выберите дату"
                  className={styles.datePicker}
                  showPopperArrow={false}
                />
                <button type="submit" className={styles.add_event_btn}>
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
          </div>
          <div className={styles.actionsSection}>
            <Link to="/admin/add-user" className={styles.addUserLink}>
              Добавить пользователя
            </Link>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Выйти
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
