import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./StudentProfile.module.css";
import Header from "../../Components/Header/Header";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, subWeeks, subMonths, subYears } from "date-fns";
import ru from "date-fns/locale/ru";
import Loading from "../../Components/Loading/Loading";

const StudentProfile = () => {
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/student/profile/${studentId}`
        );
        setStudentData(response.data);
        setLoading(false);

        const queryParams = new URLSearchParams(location.search);
        const sortParam = queryParams.get("sort") || "all";
        const customSortParam = queryParams.get("customSort");
        setSort(sortParam);

        if (sortParam === "custom" && customSortParam) {
          const [startStr, endStr] = customSortParam.split("-");
          const start = parseDate(startStr);
          const end = parseDate(endStr);
          setDateRange([start, end]);
        }
      } catch (error) {
        console.error("Ошибка при загрузке данных студента:", error);
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split(".");
    return new Date(`${year}-${month}-${day}`);
  };

  const filterEventsBySort = (events) => {
    const now = new Date();
    const filteredEvents = events.filter((event) => {
      const eventDate = parseDate(event.date);

      switch (sort) {
        case "week": {
          const oneWeekAgo = subWeeks(now, 1);
          return eventDate >= oneWeekAgo && eventDate <= now;
        }
        case "month": {
          const oneMonthAgo = subMonths(now, 1);
          return eventDate >= oneMonthAgo && eventDate <= now;
        }
        case "halfYear": {
          const sixMonthsAgo = subMonths(now, 6);
          return eventDate >= sixMonthsAgo && eventDate <= now;
        }
        case "custom": {
          if (!startDate || !endDate) return true;
          return eventDate >= startDate && eventDate <= endDate;
        }
        case "all":
        default:
          return true;
      }
    });

    return filteredEvents.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  };

  const handleSortChange = (newSort) => {
    const queryParams = new URLSearchParams();
    queryParams.set("sort", newSort);

    if (newSort === "custom" && startDate && endDate) {
      const customSortValue = `${format(startDate, "dd.MM.yyyy")}-${format(
        endDate,
        "dd.MM.yyyy"
      )}`;
      queryParams.set("customSort", customSortValue);
    } else if (newSort !== "custom") {
      setDateRange([null, null]);
    }

    window.history.pushState(
      {},
      "",
      `${location.pathname}?${queryParams.toString()}`
    );
    setSort(newSort);
  };

  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    setDateRange([start, end]);

    if (sort === "custom" && start && end) {
      const queryParams = new URLSearchParams();
      queryParams.set("sort", "custom");
      const customSortValue = `${format(start, "dd.MM.yyyy")}-${format(
        end,
        "dd.MM.yyyy"
      )}`;
      queryParams.set("customSort", customSortValue);
      window.history.pushState(
        {},
        "",
        `${location.pathname}?${queryParams.toString()}`
      );
    }
  };

  const handleBack = () => {
    navigate("/events");
  };

  if (loading) {
    return <Loading />;
  }

  if (!studentData) {
    return <div className={styles.noData}>Данные студента не найдены</div>;
  }

  const filteredEvents = filterEventsBySort(studentData.events);

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.profileContainer}>
          <button
            onClick={handleBack}
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
          <h1>Личная карточка студента</h1>
          <div className={styles.admins_tables}>
            <div className={styles.studentInfo}>
              <h2>Информация о студенте</h2>
              <div className={styles.tralalero}>
                <div className={styles.blockInfo}>
                  <h3>ФИО</h3>
                  <p>{studentData.fullName}</p>
                </div>
                <div className={styles.blockInfo}>
                  <h3>Группа</h3>
                  <p>{studentData.groupeName}</p>
                </div>
                <div className={styles.blockInfo}>
                  <h3>Отделение</h3>
                  <p>{studentData.departmentName}</p>
                </div>
                <div className={styles.blockInfo}>
                  <h3>Курс</h3>
                  <p>{studentData.course}</p>
                </div>
                <div className={styles.blockInfo}>
                  <h3>Пол</h3>
                  <p>{studentData.gender}</p>
                </div>
                <div className={styles.blockInfo}>
                  <h3>Дата рождения</h3>
                  <p>{studentData.dateOfBIrth}</p>
                </div>
              </div>
            </div>
            <div className={styles.eventsSection}>
              <div className={styles.filterContainer}>
                <h2>Мероприятия</h2>
                <div className={styles.filterControls}>
                  <label>
                    Период:
                    <select
                      value={sort}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className={styles.sortSelect}
                    >
                      <option value="all">Все</option>
                      <option value="week">Неделя</option>
                      <option value="month">Месяц</option>
                      <option value="halfYear">Полгода</option>
                      <option value="custom">Пользовательский</option>
                    </select>
                  </label>
                  {sort === "custom" && (
                    <DatePicker
                      selectsRange
                      startDate={startDate}
                      endDate={endDate}
                      onChange={handleDateRangeChange}
                      dateFormat="dd.MM.yyyy"
                      locale={ru}
                      placeholderText="Выберите диапазон дат"
                      className={styles.datePicker}
                      showPopperArrow={false}
                    />
                  )}
                </div>
              </div>
              <table className={styles.eventsTable}>
                <thead>
                  <tr>
                    <th>Мероприятие</th>
                    <th>Дата</th>
                    <th>Баллы</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event, index) => (
                    <tr key={`event-${index}`}>
                      <td>{event.name}</td>
                      <td>{event.date}</td>
                      <td>{event.point}</td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td>
                      <strong>Итого</strong>
                    </td>
                    <td></td>
                    <td>
                      <strong>
                        {filteredEvents.reduce(
                          (sum, event) => sum + event.point,
                          0
                        )}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentProfile;
