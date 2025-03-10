import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./GroupEventTable.module.css";
import FilterSidebar from "./FilterSidebar"; // Импортируем компонент фильтрации

const GroupEventTable = () => {
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [groupName, setGroupName] = useState("3ПК1");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Новое состояние для хранения данных о группах или отделениях
  const [filteredData, setFilteredData] = useState([]);
  const [filterType, setFilterType] = useState("students"); // Тип фильтра: students, groups, departments

  // Загрузка начальных данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/event-journal/1"
        );
        const apiData = response.data;

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
            acc[student.studentId][`event${index + 1}`] =
              event.point.toString();
          });
          return acc;
        }, {});

        setStudents(studentList);
        setEvents(eventList);
        setAttendance(attendanceData);
        setLoading(false);
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Сохранение данных посещаемости
  const saveAttendance = async (updatedAttendance) => {
    try {
      const dataToSave = students.map((student) => ({
        studentId: student.id,
        events: events.map((event) => ({
          name: event.name,
          point: parseInt(updatedAttendance[student.id][event.key]) || 0,
        })),
      }));

      await axios.post(
        "http://localhost:3000/event-journal/save-journal",
        dataToSave
      );
      console.log("Вся таблица успешно сохранена");
    } catch (error) {
      console.error("Ошибка при сохранении данных:", error);
    }
  };

  // Обработка нажатия клавиш в поле ввода
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

  // Подсчет статистики по событиям
  const getEventStats = (eventKey) => {
    return Object.values(attendance).reduce(
      (sum, student) => sum + (parseInt(student[eventKey]) || 0),
      0
    );
  };

  // Открытие/закрытие сайдбара
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Обработка применения фильтра
  const handleFilterApply = (data, type) => {
    if (type === "students") {
      // Если данные - это список студентов (например, после фильтрации по группе)
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
          acc[student.studentId][`event${index + 1}`] = event.point.toString();
        });
        return acc;
      }, {});

      setStudents(studentList);
      setEvents(eventList);
      setAttendance(attendanceData);
      setGroupName(data[0].groupName || "Новая группа");
      setFilterType("students");
    } else if (type === "groups" || type === "departments") {
      // Если данные - это список групп или отделений
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
        name: item.groupeName || item.departmentName,
      }));

      setStudents(groupList);
      setEvents(eventList);
      setAttendance(attendanceData);
      setGroupName(type === "groups" ? "Группы" : "Отделения");
      setFilterType(type);
    } else {
      console.error("Неизвестный тип данных:", type);
    }
  };

  // Отображение загрузки
  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  // Отображение сообщения об отсутствии данных
  if (!students.length || !events.length) {
    return <div className={styles.noData}>Нет данных для отображения</div>;
  }

  return (
    <div className={styles.container}>
      <button className={styles.filterButton} onClick={toggleSidebar}>
        Фильтры
      </button>

      {/* Сайдбар */}
      <div
        className={`${styles.sidebar} ${
          isSidebarOpen ? styles.sidebarOpen : ""
        }`}
      >
        <FilterSidebar onFilterApply={handleFilterApply} />
        <button onClick={toggleSidebar}>Закрыть</button>
      </div>

      {/* Оверлей (затемнение фона) */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={toggleSidebar}></div>
      )}

      {/* Таблица */}
      <table className={styles.eventTable}>
        <thead>
          <tr key="header-row">
            <th key="group-name">{groupName}</th>
            {events.map((event) => (
              <th key={`event-header-${event.key}`}>{event.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={`student-${student.id}`}>
              <td key={`student-name-${student.id}`}>{student.name}</td>
              {events.map((event) => (
                <td key={`attendance-${student.id}-${event.key}`}>
                  <input
                    type="text"
                    value={attendance[student.id][event.key] || "0"}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setAttendance((prev) => ({
                        ...prev,
                        [student.id]: {
                          ...prev[student.id],
                          [event.key]: newValue,
                        },
                      }));
                    }}
                    onKeyDown={(e) => handleKeyPress(e, student.id, event.key)}
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
  );
};

export default GroupEventTable;
