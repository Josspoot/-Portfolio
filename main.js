/* Visual behaviour only — scroll progress, reveal-on-scroll, navbar state,
   hero spotlight and active section highlighting. No content logic here. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Scroll progress bar ---------- */
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  document.body.appendChild(progress);

  /* ---------- Navbar condensed state ---------- */
  var navbar = document.querySelector(".navbar");

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var scrolled = window.scrollY;
      var max =
        document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform =
        "scaleX(" + (max > 0 ? scrolled / max : 0) + ")";

      if (navbar) navbar.classList.toggle("scrolled", scrolled > 40);
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  // Groups of elements that animate in together, each with a small stagger.
  var revealGroups = [
    ".section-title",
    ".section-sub",
    ".about-text .about-p",
    ".about-image",
    ".contact-grid .info-btn",
    ".achievements-grid .ach-card",
    ".footer p",
  ];

  revealGroups.forEach(function (selector) {
    var nodes = document.querySelectorAll(selector);
    Array.prototype.forEach.call(nodes, function (node, i) {
      node.setAttribute("data-reveal", "");
      // Cap the stagger so long lists don't crawl in forever.
      node.style.setProperty(
        "--reveal-delay",
        Math.min(i * 0.07, 0.45) + "s"
      );
    });
  });

  var revealables = document.querySelectorAll("[data-reveal]");

  if (!("IntersectionObserver" in window) || reduceMotion) {
    Array.prototype.forEach.call(revealables, function (node) {
      node.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    Array.prototype.forEach.call(revealables, function (node) {
      observer.observe(node);
    });
  }

  /* ---------- Hero cursor spotlight ---------- */
  var hero = document.getElementById("hero");
  if (hero && !reduceMotion) {
    hero.addEventListener(
      "mousemove",
      function (e) {
        var rect = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", e.clientX - rect.left + "px");
        hero.style.setProperty("--my", e.clientY - rect.top + "px");
      },
      { passive: true }
    );
  }

  /* ---------- Active nav link ---------- */
  var sections = document.querySelectorAll("section[id]");
  var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.getAttribute("id");
          Array.prototype.forEach.call(navLinks, function (link) {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === "#" + id
            );
          });
        });
      },
      { threshold: 0.3, rootMargin: "-20% 0px -50% 0px" }
    );

    Array.prototype.forEach.call(sections, function (section) {
      sectionObserver.observe(section);
    });
  }
})();
