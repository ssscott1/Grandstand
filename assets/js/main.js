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

  /* Lead forms
     Set data-endpoint on the <form> to your form service URL
     (e.g. Formspree/Basin). Until then, submissions open a
     pre-filled email to info@grandstandcrossfit.com.au so no
     lead is ever lost. */
  document.querySelectorAll("form.lead-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".form-msg");
      var data = new FormData(form);
      var endpoint = form.getAttribute("data-endpoint");

      if (endpoint) {
        fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function (r) {
            if (!r.ok) throw new Error("send failed");
            form.reset();
            show(msg, "ok", "You're in! We'll be in touch within one business day to lock in your free trial.");
          })
          .catch(function () {
            show(msg, "err", "Something went wrong — call us on 0424 476 235 or email info@grandstandcrossfit.com.au.");
          });
      } else {
        var body =
          "New free trial enquiry from the website%0D%0A%0D%0A" +
          "Name: " + enc(data.get("name")) + "%0D%0A" +
          "Phone: " + enc(data.get("phone")) + "%0D%0A" +
          "Email: " + enc(data.get("email")) + "%0D%0A" +
          "Interested in: " + enc(data.get("program")) + "%0D%0A" +
          "Goal: " + enc(data.get("goal"));
        window.location.href =
          "mailto:info@grandstandcrossfit.com.au?subject=" +
          encodeURIComponent("Free Trial Enquiry — " + (data.get("name") || "Website")) +
          "&body=" + body;
        show(msg, "ok", "Your email app has opened with your enquiry ready to send. Prefer to talk? Call 0424 476 235.");
      }
    });
  });

  function enc(v) { return encodeURIComponent(v || "-"); }
  function show(el, cls, text) {
    if (!el) return;
    el.className = "form-msg " + cls;
    el.textContent = text;
  }

  /* Current year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
