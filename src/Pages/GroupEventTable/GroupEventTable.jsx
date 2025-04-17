import React, { useState, useEffect, useMemo } from "react";
import styles from "./GroupEventTable.module.css";
import FilterSidebar from "./FilterSidebar";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import Header from "../../Components/Header/Header";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { format } from "date-fns";

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
  const [groups, setGroups] = useState([]);
  const [topEntities, setTopEntities] = useState({ type: "", data: [] });
  const [topOrganizers, setTopOrganizers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileData();
    applySavedFilters();
    fetchTopOrganizers();
  }, []);

  const fetchTopOrganizers = async () => {
    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    if (!accessToken) {
      setError("Токен не найден для загрузки топа организаторов");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/top/teacherRating", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Ошибка при загрузке топа организаторов");
      }

      const data = await response.json();
      setTopOrganizers(data.slice(0, 5)); // Берем только топ-5
    } catch (error) {
      console.error("Ошибка при загрузке топа организаторов:", error);
      setError(error.message);
      setTimeout(() => setError(null), 5000);
    }
  };

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
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const applySavedFilters = async () => {
    const savedFilters = localStorage.getItem("filters");
    if (!savedFilters) {
      await fetchDefaultData();
      return;
    }

    try {
      const { filterType, inputValue, sort, dateRange } =
        JSON.parse(savedFilters);
      if (!filterType) {
        await fetchDefaultData();
        return;
      }

      setLoading(true);
      let url = "";
      let type = "";
      let filterValue = inputValue;
      const queryParams = new URLSearchParams();
      queryParams.append("sort", sort || "all");

      if (sort === "custom" && dateRange[0] && dateRange[1]) {
        const customSortValue = `${format(
          new Date(dateRange[0]),
          "dd.MM.yyyy"
        )}-${format(new Date(dateRange[1]), "dd.MM.yyyy")}`;
        queryParams.append("customSort", customSortValue);
      }

      switch (filterType) {
        case "department":
          url = `http://localhost:3000/department/all?${queryParams.toString()}`;
          type = "departments";
          break;
        case "course":
          url = `http://localhost:3000/groupe/allCourse/${filterValue}?${queryParams.toString()}`;
          type = "groups";
          break;
        case "groupByDepartment":
          url = `http://localhost:3000/groupe/all/${filterValue}?${queryParams.toString()}`;
          type = "groups";
          break;
        case "studentsByGroup":
          const response = await fetch(`http://localhost:3000/groupe/all`);
          const groups = await response.json();
          const group = groups.find(
            (g) => g.groupeName.toLowerCase() === filterValue.toLowerCase()
          );
          if (!group) {
            throw new Error("Группа с таким названием не найдена.");
          }
          url = `http://localhost:3000/event-journal/${
            group.id
          }?${queryParams.toString()}`;
          type = "students";
          break;
        default:
          await fetchDefaultData();
          return;
      }

      const dataResponse = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!dataResponse.ok) {
        throw new Error("Ошибка при загрузке данных фильтра");
      }

      const data = await dataResponse.json();
      handleFilterApply({
        data,
        type,
        groupName: filterType === "studentsByGroup" ? filterValue : undefined,
        course: filterType === "course" ? filterValue : undefined,
        departmentName:
          filterType === "groupByDepartment"
            ? departments.find((dept) => String(dept.id) === filterValue)
                ?.departmentName
            : undefined,
        sort,
        customSort:
          sort === "custom" && dateRange[0] && dateRange[1]
            ? `${format(new Date(dateRange[0]), "dd.MM.yyyy")}-${format(
                new Date(dateRange[1]),
                "dd.MM.yyyy"
              )}`
            : null,
      });
    } catch (err) {
      console.error("Ошибка при применении сохраненных фильтров:", err);
      setError(err.message);
      await fetchDefaultData();
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultData = async () => {
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

      const groupsResponse = await fetch("http://localhost:3000/groupe/all", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!groupsResponse.ok) {
        throw new Error("Ошибка при загрузке данных групп");
      }

      const groupsData = await groupsResponse.json();
      setGroups(groupsData);

      const studentList = await Promise.all(
        dataArray.map(async (student) => {
          const studentResponse = await fetch(
            `http://localhost:3000/student/${student.studentId}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!studentResponse.ok) {
            console.warn(
              `Не удалось получить данные для студента ${student.studentId}`
            );
            return {
              id: student.studentId,
              name: student.fullName,
              groupName: "Без группы",
              groupeId: null,
            };
          }

          const studentData = await studentResponse.json();
          const group = groupsData.find((g) => g.id === studentData.groupeId);

          return {
            id: student.studentId,
            name: student.fullName,
            groupName: group ? group.groupeName : "Без группы",
            groupeId: studentData.groupeId || null,
          };
        })
      );

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
      setFilterType("students");
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

  const saveAttendance = async (studentId, updatedStudentAttendance) => {
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
      const dataToSave = {
        studentId,
        events: events.map((event) => ({
          name: event.name,
          point: parseInt(updatedStudentAttendance[event.key] || "0") || 0,
        })),
      };

      const response = await fetch(
        "http://localhost:3000/event-journal/save-journal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify([dataToSave]),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка при сохранении данных: ${errorText}`);
      }

      console.log("Данные студента", studentId, "успешно сохранены");
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
        saveAttendance(studentId, newAttendance[studentId]);
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

  const fetchAllStudents = async () => {
    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    try {
      const response = await fetch(
        "http://localhost:3000/event-journal/allStudents",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      return Array.isArray(data) ? data[0] : [data];
    } catch (error) {
      console.error("Ошибка при загрузке всех студентов:", error);
      return [];
    }
  };

  const getTopEntities = useMemo(() => {
    if (!students.length || !Object.keys(attendance).length) {
      return { type: "", data: [] };
    }

    if (filterType === "students" && !groupName.includes("Все студенты")) {
      // Топ-5 студентов в выбранной группе
      const topStudents = students
        .map((student) => ({
          name: student.name,
          points: getStudentTotalPoints(student.id),
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

      return { type: "students", data: topStudents };
    } else if (filterType === "students") {
      // Топ-5 групп
      const groupPoints = students.reduce((acc, student) => {
        const group = student.groupName || "Без группы";
        const points = getStudentTotalPoints(student.id);
        acc[group] = (acc[group] || 0) + points;
        return acc;
      }, {});

      const topGroups = Object.entries(groupPoints)
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

      return { type: "groups", data: topGroups };
    } else if (filterType === "groups" || filterType === "departments") {
      // Топ-5 студентов из всех групп или отделений
      return async () => {
        const allStudents = await fetchAllStudents();
        const topStudents = allStudents
          .map((student) => ({
            name: student.fullName,
            points: student.events.reduce(
              (sum, event) => sum + (event.point || 0),
              0
            ),
          }))
          .sort((a, b) => b.points - a.points)
          .slice(0, 5);

        return { type: "students", data: topStudents };
      };
    }

    return { type: "", data: [] };
  }, [students, attendance, filterType, groupName]);

  useEffect(() => {
    if (filterType === "groups" || filterType === "departments") {
      getTopEntities().then((result) => setTopEntities(result));
    } else {
      setTopEntities(getTopEntities);
    }
  }, [getTopEntities]);

  const generateChartData = useMemo(() => {
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

    const colors = [
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
      "#F94144",
      "#F3722C",
      "#F8961E",
      "#F9C74F",
      "#90BE6D",
      "#43AA8B",
      "#4D908E",
      "#577590",
      "#277DA1",
      "#D00000",
      "#FFBA08",
      "#9D4EDD",
      "#7209B7",
      "#3A0CA3",
      "#3F37C9",
      "#4361EE",
      "#4CC9F0",
      "#F72585",
      "#7209B7",
      "#B5179E",
      "#560BAD",
      "#480CA8",
      "#3A86FF",
      "#8338EC",
      "#FF006E",
      "#FB5607",
      "#FFBE0B",
      "#8AC926",
      "#06D6A0",
      "#1B9AAA",
      "#8F2D56",
      "#D81159",
      "#F48C06",
      "#2A9D8F",
      "#264653",
      "#E76F51",
      "#E9C46A",
      "#F4A261",
      "#2A9D8F",
      "#219EBC",
    ];

    if (filterType === "students") {
      const groupPoints = students.reduce((acc, student) => {
        const group = student.groupName || "Без группы";
        const points = getStudentTotalPoints(student.id);
        acc[group] = (acc[group] || 0) + points;
        return acc;
      }, {});

      if (Object.keys(groupPoints).length === 1 && groupPoints["Без группы"]) {
        return {
          labels: students.map((student) => student.name),
          datasets: [
            {
              label: "Общие баллы",
              data: students.map((student) =>
                getStudentTotalPoints(student.id)
              ),
              backgroundColor: colors.slice(0, students.length),
              hoverOffset: 4,
            },
          ],
        };
      }

      const labels = Object.keys(groupPoints);
      const data = Object.values(groupPoints);

      return {
        labels,
        datasets: [
          {
            label: "Общие баллы по группам",
            data,
            backgroundColor: colors.slice(0, labels.length),
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
          backgroundColor: colors.slice(0, students.length),
          hoverOffset: 4,
        },
      ],
    };
  }, [students, attendance, filterType]);

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
          label: (context) => {
            const total = context.dataset.data.reduce(
              (sum, val) => sum + val,
              0
            );
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: ${context.raw} баллов (${percentage}%)`;
          },
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
          groupName:
            groups.find((g) => g.id === student.groupeId)?.groupeName ||
            "Без группы",
          groupeId: student.groupeId || null,
        }));
        const eventList = data[1].events.map((event, index) => ({
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
      } else if (type === "clear") {
        const studentList = data.map((student) => ({
          id: student.studentId,
          name: student.fullName,
          groupName:
            groups.find((g) => g.id === student.groupeId)?.groupeName ||
            "Без группы",
          groupeId: student.groupeId || null,
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
    setError(null);
  };

  const exportToExcel = () => {
    if (isRatingTableVisible) {
      const exportData = [
        [
          "Название мероприятия",
          "Ваша оценка",
          "Общая оценка",
          "Количество голосов",
        ],
        ...eventRatings.map((event) => [
          event.eventName,
          event.rating !== null ? event.rating : "",
          event.all,
          event.count,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "EventRatings");
      XLSX.writeFile(wb, "EventRatings.xlsx");
    } else {
      const exportData = [
        [groupName, ...events.map((event) => event.name)],
        ...students.map((student) => [
          student.name,
          ...events.map((event) => attendance[student.id][event.key] || ""),
        ]),
        ["Итого", ...events.map((event) => getEventStats(event.key))],
      ];
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "EventTable");
      XLSX.writeFile(wb, `EventTable_${groupName || "Data"}.xlsx`);
    }
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;
  if (error && !isRatingTableVisible)
    return <div className={styles.error}>Ошибка: {error}</div>;
  if (!students.length || !events.length)
    return <div className={styles.noData}>Нет данных для отображения</div>;

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
        <button className={styles.filterButton} onClick={exportToExcel}>
          Экспорт в Excel
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
                      event.name.includes("Промежуточная аттестация")
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
                    <td
                      key={`attendance-${student.id}-${event.key}`}
                      className={
                        event.name.includes("Промежуточная аттестация")
                          ? styles.highlightedCell
                          : ""
                      }
                    >
                      <input
                        type="text"
                        value={attendance[student.id][event.key] || ""}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setAttendance((prev) => {
                            const newAttendance = {
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                [event.key]: newValue,
                              },
                            };
                            saveAttendance(
                              student.id,
                              newAttendance[student.id]
                            );
                            return newAttendance;
                          });
                        }}
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
                  <td
                    key={`total-${event.key}`}
                    className={
                      event.name.includes("Промежуточная аттестация")
                        ? styles.highlightedCell
                        : ""
                    }
                  >
                    <strong>{getEventStats(event.key)}</strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

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
              <Pie data={generateChartData} options={chartOptions} />
            </div>
          )}
          <div className={styles.topSection}>
            {topEntities.data.length > 0 && (
              <div className={styles.topContainer}>
                <h3>
                  Топ-5 {topEntities.type === "groups" ? "групп" : "студентов"}{" "}
                  по баллам
                </h3>
                <ul className={styles.topList}>
                  {topEntities.data.map((item, index) => (
                    <li key={`top-entity-${index}`} className={styles.topItem}>
                      {index + 1}. {item.name} - {item.points} баллов
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {topOrganizers.length > 0 && (
              <div className={styles.topContainer}>
                <h3>Топ-5 организаторов мероприятий</h3>
                <ul className={styles.topList}>
                  {topOrganizers.map((organizer, index) => (
                    <li
                      key={`top-organizer-${organizer.id}`}
                      className={styles.topItem}
                    >
                      {index + 1}. {organizer.fullName} - {organizer.eventCount}{" "}
                      {organizer.eventCount === 1
                        ? "мероприятие"
                        : "мероприятий"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const departments = [
  { id: 1, departmentName: "Отделение креативных индустрий" },
  { id: 2, departmentName: "Отделение программирования" },
  { id: 3, departmentName: "Отделение экономики" },
  { id: 4, departmentName: "Отделение ИТ и БПЛА" },
];

export default GroupEventTable;
