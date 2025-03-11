import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./FilterSidebar.module.css";

const FilterSidebar = ({ onFilterApply, onClose }) => {
  const [filterType, setFilterType] = useState(null); // По умолчанию ничего не выбрано
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupSuggestions, setGroupSuggestions] = useState([]); // Подсказки для групп
  const [groups, setGroups] = useState([]); // Список всех групп

  const departments = [
    { id: 1, departmentName: "Отделение креативных индустрий" },
    { id: 2, departmentName: "Отделение программирования" },
    { id: 3, departmentName: "Отделение экономики" },
    { id: 4, departmentName: "Отделение ИТ и БПЛА" },
  ];

  // Загружаем список групп при монтировании компонента
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/groupe/all`);
        setGroups(response.data);
      } catch (error) {
        console.error("Ошибка при загрузке списка групп:", error);
      }
    };
    fetchGroups();
  }, []);

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    setInputValue("");
    setError("");
    setGroupSuggestions([]); // Очищаем подсказки при смене фильтра
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Фильтруем группы по введенному тексту
    if (filterType === "studentsByGroup" && value) {
      const filteredGroups = groups.filter((group) =>
        group.groupeName.toLowerCase().startsWith(value.toLowerCase())
      );
      setGroupSuggestions(filteredGroups);
    } else {
      setGroupSuggestions([]);
    }
  };

  const handleSuggestionClick = (groupName) => {
    setInputValue(groupName);
    setGroupSuggestions([]); // Скрываем подсказки после выбора
  };

  const handleCourseSelect = (courseId) => {
    setInputValue(courseId);
  };

  const handleDepartmentSelect = (deptId) => {
    setInputValue(deptId);
  };

  const handleApplyFilter = async () => {
    if (!filterType) {
      setError("Пожалуйста, выберите тип фильтра.");
      return;
    }

    if (!inputValue && filterType !== "department") {
      setError("Пожалуйста, выберите или введите значение для фильтрации.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let url = "";
      let type = "";
      let filterValue = inputValue;

      switch (filterType) {
        case "department":
          url = `http://localhost:3000/department/all`;
          type = "departments";
          break;
        case "course":
          url = `http://localhost:3000/groupe/allCourse/${filterValue}`;
          type = "groups";
          break;
        case "groupByDepartment":
          url = `http://localhost:3000/groupe/all/${filterValue}`;
          type = "groups";
          break;
        case "studentsByGroup": {
          const group = groups.find(
            (g) => g.groupeName.toLowerCase() === inputValue.toLowerCase()
          );
          if (!group) {
            throw new Error("Группа с таким названием не найдена.");
          }
          url = `http://localhost:3000/event-journal/${group.id}`;
          type = "students";
          break;
        }
        default:
          break;
      }

      const response = await axios.get(url);
      onFilterApply(response.data, type);
      onClose(); // Закрываем сайдбар после успешного применения фильтра
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      setError(
        error.message === "Группа с таким названием не найдена."
          ? error.message
          : "Ошибка при загрузке данных. Пожалуйста, попробуйте снова."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.filterSidebar}>
      <h3 className={styles.title}>Фильтры</h3>
      <div className={styles.radioGroup}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            value="department"
            checked={filterType === "department"}
            onChange={handleFilterTypeChange}
            className={styles.radioInput}
          />
          Список отделений
        </label>

        <div className={styles.filterOption}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              value="course"
              checked={filterType === "course"}
              onChange={handleFilterTypeChange}
              className={styles.radioInput}
            />
            По курсу
          </label>
          {filterType === "course" && (
            <div className={styles.subOptions}>
              {[1, 2, 3, 4].map((course) => (
                <label key={course} className={styles.subRadioLabel}>
                  <input
                    type="radio"
                    value={course}
                    checked={inputValue === String(course)}
                    onChange={() => handleCourseSelect(String(course))}
                    className={styles.subRadioInput}
                    disabled={loading}
                  />
                  Курс {course}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.filterOption}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              value="groupByDepartment"
              checked={filterType === "groupByDepartment"}
              onChange={handleFilterTypeChange}
              className={styles.radioInput}
            />
            Группы по отделению
          </label>
          {filterType === "groupByDepartment" && (
            <div className={styles.subOptions}>
              {departments.map((dept) => (
                <label key={dept.id} className={styles.subRadioLabel}>
                  <input
                    type="radio"
                    value={dept.id}
                    checked={inputValue === String(dept.id)}
                    onChange={() => handleDepartmentSelect(String(dept.id))}
                    className={styles.subRadioInput}
                    disabled={loading}
                  />
                  {dept.departmentName}
                </label>
              ))}
            </div>
          )}
        </div>

        <label className={styles.radioLabel}>
          <input
            type="radio"
            value="studentsByGroup"
            checked={filterType === "studentsByGroup"}
            onChange={handleFilterTypeChange}
            className={styles.radioInput}
          />
          Студенты по группе
        </label>
      </div>

      <div className={styles.inputGroup}>
        {filterType === "studentsByGroup" && (
          <div className={styles.autocomplete}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Введите название группы (например, 3пк1)"
              className={styles.textInput}
            />
            {groupSuggestions.length > 0 && (
              <ul className={styles.suggestionsList}>
                {groupSuggestions.map((group) => (
                  <li
                    key={group.id}
                    className={styles.suggestionItem}
                    onClick={() => handleSuggestionClick(group.groupeName)}
                  >
                    {group.groupeName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <button
          onClick={handleApplyFilter}
          disabled={loading}
          className={styles.applyButton}
        >
          {loading ? "Загрузка..." : "Применить фильтр"}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default FilterSidebar;
