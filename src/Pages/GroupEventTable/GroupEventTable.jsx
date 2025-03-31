import React, { useState, useEffect } from "react";
import styles from "./GroupEventTable.module.css";
import FilterSidebar from "./FilterSidebar";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import Header from "../../Components/Header/Header";
import { useNavigate } from "react-router-dom";

ChartJS.register(ArcElement, Tooltip, Legend);

const CustomTooltip = ({ title, children }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={styles.tooltipWrapper}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && <div className={styles.customTooltip}>{title}</div>}
    </div>
  );
};

const GroupEventTable = () => {
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [groupName, setGroupName] = useState();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [filterType, setFilterType] = useState("students");
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [filterDescription, setFilterDescription] = useState("");
  const [isRatingTableVisible, setIsRatingTableVisible] = useState(false);
  const [eventRatings, setEventRatings] = useState([]);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
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

      const studentsResponse = await fetch(
        "http://localhost:3000/event-journal/allStudents",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!studentsResponse.ok) {
        throw new Error("Ошибка при загрузке данных студентов");
      }

      const apiData = await studentsResponse.json();
      const dataArray = Array.isArray(apiData) ? apiData : [apiData];

      const studentList = dataArray.map((student) => ({
        id: student.studentId,
        name: student.fullName,
      }));

      const eventList = dataArray[0].events.map((event, index) => ({
        name: event.name,
        key: `event${index + 1}`,
      }));

      const attendanceData = dataArray.reduce((acc, student) => {
        acc[student.studentId] = {};
        student.events.forEach((event, index) => {
          acc[student.studentId][`event${index + 1}`] = event.point.toString();
        });
        return acc;
      }, {});

      setStudents(studentList);
      setEvents(eventList);
      setAttendance(attendanceData);
      setGroupName(dataArray[0].groupName || "Все студенты");
      setFilterDescription("Список всех студентов за всё время");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventRatings = async () => {
    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    if (!accessToken || !userData?.id) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/event-rating/getJournal/${userData.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при загрузке рейтинга мероприятий");
      }

      const data = await response.json();
      setEventRatings(data);
      setIsRatingTableVisible(true);
    } catch (error) {
      console.error("Ошибка при загрузке рейтинга мероприятий:", error);
      setError(error.message);
    }
  };

  const getMaxRatingByRole = (roleName) => {
    switch (roleName) {
      case "admin":
        return 1;
      case "Директор":
        return 1;
      case "Зам. директора":
        return 0.8;
      case "Преподаватель":
        return 0.6;
      default:
        return 0;
    }
  };

  const saveEventRating = async (eventId, point) => {
    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    if (!accessToken || !userData?.id) {
      setEventRatings((prev) =>
        prev.map((item) =>
          item.eventId === eventId ? { ...item, rating: "" } : item
        )
      );
      return;
    }

    const maxRating = getMaxRatingByRole(userData.roleName);
    const normalizedPoint = point.replace(",", ".");
    const parsedPoint =
      normalizedPoint === "" ? null : parseFloat(normalizedPoint);

    if (parsedPoint !== null && parsedPoint > maxRating) {
      setError(
        `Оценка не может превышать ${maxRating} для вашей роли (${userData.roleName})`
      );
      setEventRatings((prev) =>
        prev.map((item) =>
          item.eventId === eventId ? { ...item, rating: "" } : item
        )
      );
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (parsedPoint !== null && (parsedPoint < 0 || isNaN(parsedPoint))) {
      setEventRatings((prev) =>
        prev.map((item) =>
          item.eventId === eventId ? { ...item, rating: "" } : item
        )
      );
      return;
    }

    try {
      const ratingData = [
        {
          eventId,
          userId: userData.id,
          point: parsedPoint,
        },
      ];

      const response = await fetch(
        "http://localhost:3000/event-rating/saveJournal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(ratingData),
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при сохранении рейтинга");
      }

      console.log("Оценка успешно сохранена");
      await fetchEventRatings();
    } catch (error) {
      console.error("Ошибка при сохранении рейтинга:", error);
      setEventRatings((prev) =>
        prev.map((item) =>
          item.eventId === eventId ? { ...item, rating: "" } : item
        )
      );
    }
  };

  const saveAttendance = async (updatedAttendance) => {
    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    if (!accessToken) {
      setError("Токен не найден");
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      const dataToSave = students.map((student) => ({
        studentId: student.id,
        events: events.map((event) => ({
          name: event.name,
          point: parseInt(updatedAttendance[student.id][event.key]) || 0,
        })),
      }));

      const response = await fetch(
        "http://localhost:3000/event-journal/save-journal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(dataToSave),
        }
      );

      if (!response.ok) {
        throw new Error("Ошибка при сохранении данных");
      }

      console.log("Таблица успешно сохранена");
    } catch (error) {
      console.error("Ошибка при сохранении данных:", error);
      setError(error.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleKeyPress = (event, studentId, eventKey) => {
    if (event.key === "0" || event.key === "1") {
      event.preventDefault();
      setAttendance((prev) => {
        const newAttendance = {
          ...prev,
          [studentId]: { ...prev[studentId], [eventKey]: event.key },
        };
        saveAttendance(newAttendance);
        return newAttendance;
      });
    }
  };

  const getEventStats = (eventKey) => {
    return Object.values(attendance).reduce(
      (sum, student) => sum + (parseInt(student[eventKey]) || 0),
      0
    );
  };

  const getStudentTotalPoints = (studentId) => {
    const studentAttendance = attendance[studentId] || {};
    return Object.values(studentAttendance).reduce(
      (sum, value) => sum + (parseInt(value) || 0),
      0
    );
  };

  const generateChartData = () => {
    if (!students.length || !Object.keys(attendance).length) {
      return {
        labels: [],
        datasets: [
          {
            label: "Общие баллы",
            data: [],
            backgroundColor: [],
            hoverOffset: 4,
          },
        ],
      };
    }

    return {
      labels: students.map((student) => student.name),
      datasets: [
        {
          label: "Общие баллы",
          data: students.map((student) => getStudentTotalPoints(student.id)),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#E7E9ED",
            "#FF5733",
            "#C70039",
            "#900C3F",
          ].slice(0, students.length),
          hoverOffset: 4,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 20, padding: 10, font: { size: 14 } },
        align: "start",
        display: true,
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.raw} баллов`,
        },
      },
    },
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleFilterApply = ({
    data,
    type,
    groupName: selectedGroupName,
    course,
    departmentName,
    sort,
    customSort,
  }) => {
    try {
      let timeDescription = "";
      switch (sort) {
        case "all":
          timeDescription = "за всё время";
          break;
        case "week":
          timeDescription = "за неделю";
          break;
        case "month":
          timeDescription = "за месяц";
          break;
        case "halfYear":
          timeDescription = "за полгода";
          break;
        case "custom":
          timeDescription = customSort ? `за период ${customSort}` : "";
          break;
        default:
          timeDescription = "";
          break;
      }

      if (type === "students") {
        const studentList = data.map((student) => ({
          id: student.studentId,
          name: student.fullName,
        }));
        const eventList = data[0].events.map((event, index) => ({
          name: event.name,
          key: `event${index + 1}`,
        }));
        const attendanceData = data.reduce((acc, student) => {
          acc[student.studentId] = {};
          student.events.forEach((event, index) => {
            acc[student.studentId][`event${index + 1}`] =
              event.point.toString();
          });
          return acc;
        }, {});

        setStudents(studentList);
        setEvents(eventList);
        setAttendance(attendanceData);
        setGroupName(selectedGroupName || "Все студенты");
        setFilterDescription(
          selectedGroupName
            ? `Студенты группы ${selectedGroupName} ${timeDescription}`
            : `Список всех студентов ${timeDescription}`
        );
        setFilterType("students");
      } else if (type === "groups") {
        const eventList = data[0].events.map((event, index) => ({
          name: event.name,
          key: `event${index + 1}`,
        }));
        const attendanceData = data.reduce((acc, item) => {
          acc[item.id] = {};
          item.events.forEach((event, index) => {
            acc[item.id][`event${index + 1}`] = event.point.toString();
          });
          return acc;
        }, {});
        const groupList = data.map((item) => ({
          id: item.id,
          name: item.groupeName,
        }));

        setStudents(groupList);
        setEvents(eventList);
        setAttendance(attendanceData);
        setGroupName("Группы");
        setFilterDescription(
          course
            ? `Группы ${course} курса ${timeDescription}`
            : departmentName
            ? `Группы отделения ${departmentName} ${timeDescription}`
            : `Группы ${timeDescription}`
        );
        setFilterType("groups");
      } else if (type === "departments") {
        const eventList = data[0].events.map((event, index) => ({
          name: event.name,
          key: `event${index + 1}`,
        }));
        const attendanceData = data.reduce((acc, item) => {
          acc[item.id] = {};
          item.events.forEach((event, index) => {
            acc[item.id][`event${index + 1}`] = event.point.toString();
          });
          return acc;
        }, {});
        const departmentList = data.map((item) => ({
          id: item.id,
          name: item.departmentName,
        }));

        setStudents(departmentList);
        setEvents(eventList);
        setAttendance(attendanceData);
        setGroupName("Отделения");
        setFilterDescription(`Все отделения ${timeDescription}`);
        setFilterType("departments");
      }
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Ошибка обработки данных фильтра:", error);
      setError(error.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const toggleChartVisibility = () => setIsChartVisible((prev) => !prev);

  const handleStudentClick = (studentId) => {
    if (filterType === "students") {
      navigate(`/student/profile/${studentId}`);
    }
  };

  const handleReturnToMainTable = () => {
    setIsRatingTableVisible(false);
    setError(null); // Очищаем ошибки при возврате
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;
  if (error && !isRatingTableVisible)
    return <div className={styles.error}>Ошибка: {error}</div>;
  if (!students.length || !events.length)
    return <div className={styles.noData}>Нет данных для отображения</div>;

  const chartData = generateChartData();

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.buttonGroup}>
        <button className={styles.filterButton} onClick={toggleSidebar}>
          Фильтры
        </button>
        <button className={styles.filterButton} onClick={fetchEventRatings}>
          Оценить мероприятия
        </button>
      </div>
      <div
        className={`${styles.sidebar} ${
          isSidebarOpen ? styles.sidebarOpen : ""
        }`}
      >
        <FilterSidebar
          onFilterApply={handleFilterApply}
          onClose={toggleSidebar}
        />
        <button onClick={toggleSidebar}>Закрыть</button>
      </div>
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={toggleSidebar}></div>
      )}
      <div className={styles.filterInfo}>
        <p>Текущий фильтр: {filterDescription}</p>
      </div>

      {/* Основная таблица */}
      {!isRatingTableVisible && (
        <div className={styles.tableWrapper}>
          <table className={styles.eventTable}>
            <thead>
              <tr key="header-row">
                <th key="group-name">{groupName}</th>
                {events.map((event) => (
                  <th
                    key={`event-header-${event.key}`}
                    className={
                      event.name.trim() === "Промежуточная аттестация"
                        ? styles.highlightedHeader
                        : ""
                    }
                  >
                    <CustomTooltip title={event.name}>
                      <span className={styles.eventName}>{event.name}</span>
                    </CustomTooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={`student-${student.id}`}>
                  <td
                    key={`student-name-${student.id}`}
                    onClick={() => handleStudentClick(student.id)}
                    className={`${styles.studentNameCell} ${
                      filterType === "students" ? styles.clickable : ""
                    }`}
                  >
                    {student.name}
                  </td>
                  {events.map((event) => (
                    <td key={`attendance-${student.id}-${event.key}`}>
                      <input
                        type="text"
                        value={attendance[student.id][event.key] || ""}
                        onChange={(e) =>
                          setAttendance((prev) => ({
                            ...prev,
                            [student.id]: {
                              ...prev[student.id],
                              [event.key]: e.target.value,
                            },
                          }))
                        }
                        onKeyDown={(e) =>
                          handleKeyPress(e, student.id, event.key)
                        }
                        className={styles.attendanceInput}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr key="total-row">
                <td key="total-label">
                  <strong>Итого</strong>
                </td>
                {events.map((event) => (
                  <td key={`total-${event.key}`}>
                    <strong>{getEventStats(event.key)}</strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Таблица рейтинга мероприятий */}
      {isRatingTableVisible && (
        <div className={styles.tableWrapper}>
          <div className={styles.ratingTableContainer}>
            {error && (
              <div
                style={{
                  color: "red",
                  marginBottom: "10px",
                }}
              >
                Ошибка: {error}
              </div>
            )}
            <table className={styles.eventTable}>
              <thead>
                <tr>
                  <th>Название мероприятия</th>
                  <th>Ваша оценка</th>
                  <th>Общая оценка</th>
                  <th>Количество голосов</th>
                </tr>
              </thead>
              <tbody>
                {eventRatings.map((event) => {
                  const maxRating = getMaxRatingByRole(userData?.roleName);
                  return (
                    <tr key={`rating-${event.eventId}`}>
                      <td>{event.eventName}</td>
                      <td>
                        <input
                          type="text"
                          value={event.rating !== null ? event.rating : ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEventRatings((prev) =>
                              prev.map((item) =>
                                item.eventId === event.eventId
                                  ? { ...item, rating: value }
                                  : item
                              )
                            );
                          }}
                          onBlur={(e) =>
                            saveEventRating(event.eventId, e.target.value)
                          }
                          className={styles.attendanceInput}
                          placeholder={`0-${maxRating}`}
                        />
                      </td>
                      <td>{event.all}</td>
                      <td>{event.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              className={styles.returnButton}
              onClick={handleReturnToMainTable}
            >
              Вернуться к основной таблице
            </button>
          </div>
        </div>
      )}

      {/* Диаграмма */}
      {!isRatingTableVisible && (
        <>
          <button
            className={styles.toggleChartButton}
            onClick={toggleChartVisibility}
          >
            {isChartVisible ? "Скрыть диаграмму" : "Показать диаграмму"}
          </button>
          {isChartVisible && (
            <div className={styles.chartContainer}>
              <Pie data={chartData} options={chartOptions} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GroupEventTable;
