import React from "react";
import styles from "./Header.module.css";
import logo from "../../../public/chart.svg";

export default function Header() {
  return (
    <div className={styles.header}>
      <img src={logo} alt="logo" />
      <h1>Анализ вовлеченности студентов</h1>
    </div>
  );
}
