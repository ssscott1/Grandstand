/* Grandstand — site behaviour */
(function () {
  "use strict";

  /* Mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-locked", open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        document.body.classList.remove("nav-locked");
      }
    });
  }

  /* Timetable tabs */
  var tabs = document.querySelectorAll(".tt-tabs button");
  var days = document.querySelectorAll(".tt-day");
  if (tabs.length) {
    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tabs.forEach(function (b) { b.setAttribute("aria-selected", "false"); });
        days.forEach(function (d) { d.classList.remove("active"); });
        btn.setAttribute("aria-selected", "true");
        var pane = document.getElementById(btn.getAttribute("data-day"));
        if (pane) pane.classList.add("active");
      });
    });
    /* default: show today (Mon=1 … Sun=0) */
    var map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    var today = map[new Date().getDay()];
    var todayBtn = document.querySelector('.tt-tabs button[data-day="tt-' + today + '"]');
    if (todayBtn) todayBtn.click();
  }

  /* Current year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
