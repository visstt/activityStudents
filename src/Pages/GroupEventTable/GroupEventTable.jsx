import React, { useState, useEffect } from "react";
import axios from "axios";
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
  const [groupName, setGroupName] = useState("3ПК1");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [filterType, setFilterType] = useState("students");
  const [isChartVisible, setIsChartVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/event-journal/allStudents"
        );
        const apiData = response.data;
        const dataArray = Array.isArray(apiData) ? apiData : [apiData];

        const studentList = dataArray.map((student) => ({
          id: student.studentId,
          name: student.fullName,
        }));

        const eventList = dataArray[0].events.map((event, index) => {
          console.log("Event name:", event.name); // Отладка: выводим названия мероприятий
          return {
            name: event.name,
            key: `event${index + 1}`,
          };
        });

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
            label: "Сумма баллов",
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
          label: "Сумма баллов",
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

  const handleFilterApply = (data, type) => {
    try {
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
        setGroupName(data[0].groupName || "Новая группа");
        setFilterType("students");
      } else if (type === "groups" || type === "departments") {
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
      }
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Ошибка при обработке данных фильтра:", error);
    }
  };

  const toggleChartVisibility = () => setIsChartVisible((prev) => !prev);

  const handleStudentClick = (studentId) =>
    navigate(`/student/profile/${studentId}`);

  if (loading) return <div className={styles.loading}>Загрузка...</div>;
  if (!students.length || !events.length)
    return <div className={styles.noData}>Нет данных для отображения</div>;

  const chartData = generateChartData();

  return (
    <div className={styles.container}>
      <Header />
      <button className={styles.filterButton} onClick={toggleSidebar}>
        Фильтры
      </button>
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
                className={styles.studentNameCell}
              >
                {student.name}
              </td>
              {events.map((event) => (
                <td key={`attendance-${student.id}-${event.key}`}>
                  <input
                    type="text"
                    value={attendance[student.id][event.key] || "0"}
                    onChange={(e) =>
                      setAttendance((prev) => ({
                        ...prev,
                        [student.id]: {
                          ...prev[student.id],
                          [event.key]: e.target.value,
                        },
                      }))
                    }
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
    </div>
  );
};

export default GroupEventTable;
