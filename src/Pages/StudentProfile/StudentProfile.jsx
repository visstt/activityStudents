import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./StudentProfile.module.css";
import Header from "../../Components/Header/Header";

const StudentProfile = () => {
  const { studentId } = useParams();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/student/profile/${studentId}`
        );
        setStudentData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Ошибка при загрузке данных студента:", error);
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!studentData) {
    return <div className={styles.noData}>Данные студента не найдены</div>;
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.profileHeader}>
          <h1>{studentData.fullName}</h1>
          <div className={styles.studentInfo}>
            <p>
              <strong>Группа:</strong> {studentData.groupeName}
            </p>
            <p>
              <strong>Отделение:</strong> {studentData.departmentName}
            </p>
            <p>
              <strong>Курс:</strong> {studentData.course}
            </p>
            <p>
              <strong>Пол:</strong> {studentData.gender}
            </p>
            <p>
              <strong>Дата рождения:</strong> {studentData.dateOfBIrth}
            </p>
          </div>
        </div>

        <table className={styles.eventsTable}>
          <thead>
            <tr>
              <th>Мероприятие</th>
              <th>Баллы</th>
            </tr>
          </thead>
          <tbody>
            {studentData.events.map((event, index) => (
              <tr key={`event-${index}`}>
                <td>{event.name}</td>
                <td>{event.point}</td>
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <td>
                <strong>Итого</strong>
              </td>
              <td>
                <strong>
                  {studentData.events.reduce(
                    (sum, event) => sum + event.point,
                    0
                  )}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

export default StudentProfile;
