import React, { useState } from "react";
import axios from "axios";

const FilterSidebar = ({ onFilterApply }) => {
  const [filterType, setFilterType] = useState("department");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    setInputValue("");
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleApplyFilter = async () => {
    if (!inputValue && filterType !== "department") {
      setError("Пожалуйста, введите значение для фильтрации.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let url = "";
      let type = "";

      switch (filterType) {
        case "department":
          url = `http://localhost:3000/department/all`;
          type = "departments";
          break;
        case "course":
          url = `http://localhost:3000/groupe/allCourse/${inputValue}`;
          type = "groups";
          break;
        case "groupByDepartment":
          url = `http://localhost:3000/groupe/all/${inputValue}`;
          type = "groups";
          break;
        case "studentsByGroup":
          url = `http://localhost:3000/event-journal/${inputValue}`;
          type = "students";
          break;
        default:
          break;
      }

      const response = await axios.get(url);
      onFilterApply(response.data, type); // Передаем данные и тип
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      setError("Ошибка при загрузке данных. Пожалуйста, попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Фильтры</h3>
      <div>
        <label>
          <input
            type="radio"
            value="department"
            checked={filterType === "department"}
            onChange={handleFilterTypeChange}
          />
          По отделению
        </label>
        <label>
          <input
            type="radio"
            value="course"
            checked={filterType === "course"}
            onChange={handleFilterTypeChange}
          />
          По курсу
        </label>
        <label>
          <input
            type="radio"
            value="groupByDepartment"
            checked={filterType === "groupByDepartment"}
            onChange={handleFilterTypeChange}
          />
          Группы по отделению
        </label>
        <label>
          <input
            type="radio"
            value="studentsByGroup"
            checked={filterType === "studentsByGroup"}
            onChange={handleFilterTypeChange}
          />
          Студенты по группе
        </label>
      </div>
      <div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={
            filterType === "course"
              ? "Введите номер курса (1-4)"
              : filterType === "groupByDepartment" ||
                filterType === "studentsByGroup"
              ? "Введите ID"
              : "Введите ID отделения"
          }
        />
        <button onClick={handleApplyFilter} disabled={loading}>
          {loading ? "Загрузка..." : "Применить фильтр"}
        </button>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default FilterSidebar;
