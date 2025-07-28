import React, { useState, useEffect } from "react";
import "./Navbar.css";

const Navbar = () => {
  const [menu, setMenu] = useState("home");

  useEffect(() => {
    const sections = document.querySelectorAll("section");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setMenu(entry.target.id);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.6, // Bagian harus 60% terlihat agar dianggap aktif
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  return (
    <div className="navbar">
      <div className="navbar-container">
        <h1>CMON</h1>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <a
              href="#home"
              className={menu === "home" ? "active" : ""}
              onClick={() => setMenu("home")}
            >
              Home
            </a>
          </li>
          <li className="navbar-item">
            <a
              href="#about"
              className={menu === "about" ? "active" : ""}
              onClick={() => setMenu("about")}
            >
                Rules
            </a>
          </li>
          <li className="navbar-item">
            <a
              href="#contact"
              className={menu === "contact" ? "active" : ""}
              onClick={() => setMenu("contact")}
            >
              Contact
            </a>
          </li>
          <li className="navbar-item">
            <div className="nav-connect">Login</div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
