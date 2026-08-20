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
      updateParallax();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Skills keycap board ---------- */
  var keeb = document.querySelector(".keeb");

  if (keeb) {
    var board = keeb.querySelector(".kb-board");
    var stage = keeb.querySelector(".kb-stage");
    var readName = keeb.querySelector(".kb-readout-name");
    var readNote = keeb.querySelector(".kb-readout-note");
    var keys = keeb.querySelectorAll(".key:not(.key-blank)");
    var readout = keeb.querySelector(".kb-readout");
    var idleName = readout.getAttribute("data-idle-name");
    var idleNote = readout.getAttribute("data-idle-note");
    var pressed = null;
    var releaseTimer;
    var swapTimer;

    // The cap colours live in the markup as hex; the glow wants them as rgb
    // channels, so convert once up front.
    function channels(hex) {
      var h = (hex || "").trim().replace("#", "");
      if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      }
      if (h.length !== 6) return "255, 255, 255";
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
    }

    Array.prototype.forEach.call(keys, function (key) {
      key.style.setProperty("--kc-rgb", channels(key.style.getPropertyValue("--k")));
    });

    function write(name, note) {
      readout.classList.add("is-swapping");
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () {
        readName.textContent = name;
        readNote.textContent = note;
        readout.classList.remove("is-swapping");
      }, 140);
    }

    function select(key) {
      if (!key || key === pressed) return;
      if (pressed) pressed.classList.remove("is-pressed");
      pressed = key;
      key.classList.add("is-pressed");
      keeb.classList.add("is-active");
      keeb.style.setProperty("--kc", key.style.getPropertyValue("--k"));
      keeb.style.setProperty("--kc-rgb", key.style.getPropertyValue("--kc-rgb"));
      write(key.getAttribute("data-name"), key.getAttribute("data-note"));
    }

    function clearSelection() {
      if (!pressed) return;
      pressed.classList.remove("is-pressed");
      pressed = null;
      keeb.classList.remove("is-active");
      keeb.style.removeProperty("--kc");
      keeb.style.removeProperty("--kc-rgb");
      write(idleName, idleNote);
    }

    Array.prototype.forEach.call(keys, function (key) {
      key.addEventListener("pointerenter", function () {
        select(key);
      });
      key.addEventListener("focus", function () {
        select(key);
      });
      key.addEventListener("click", function () {
        select(key);
      });
    });

    stage.addEventListener("pointerleave", function () {
      // a cap the visitor tabbed to keeps the spotlight; hovers let go
      if (pressed && document.activeElement !== pressed) clearSelection();
    });

    /* Tilt the board towards the pointer */
    function clamp(v, lo, hi) {
      return v < lo ? lo : v > hi ? hi : v;
    }

    if (!reduceMotion) {
      var tiltFrame = false;
      keeb.addEventListener(
        "pointermove",
        function (e) {
          if (tiltFrame) return;
          tiltFrame = true;
          requestAnimationFrame(function () {
            var r = keeb.getBoundingClientRect();
            // Clamped: a pointer event delivered from outside the box (capture,
            // a synthetic event) would otherwise tip the board past edge-on.
            var nx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
            var ny = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
            board.style.setProperty("--rx", (-ny * 14).toFixed(2) + "deg");
            board.style.setProperty("--rz", (nx * 16).toFixed(2) + "deg");
            tiltFrame = false;
          });
        },
        { passive: true }
      );

      keeb.addEventListener("pointerleave", function () {
        board.style.setProperty("--rx", "0deg");
        board.style.setProperty("--rz", "0deg");
      });
    }

    /* "press a key": typing a letter presses the first cap that starts with it */
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      // arrows walk the board once a cap already has focus
      if (document.activeElement && document.activeElement.classList &&
          document.activeElement.classList.contains("key")) {
        var idx = Array.prototype.indexOf.call(keys, document.activeElement);
        if (idx > -1 && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
          e.preventDefault();
          var next = keys[(idx + (e.key === "ArrowRight" ? 1 : keys.length - 1)) % keys.length];
          next.focus();
          return;
        }
      }

      if (!/^[a-z0-9]$/i.test(e.key)) return;
      var wanted = e.key.toLowerCase();
      var match = null;
      Array.prototype.forEach.call(keys, function (key) {
        if (match) return;
        if (key.getAttribute("data-name").toLowerCase().charAt(0) === wanted) match = key;
      });
      if (!match) return;

      select(match);
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(function () {
        // let the cap pop back up, but leave the readout in place
        if (pressed === match) match.classList.remove("is-pressed");
      }, 550);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  // Groups of elements that animate in together, each with a small stagger.
  var revealGroups = [
    ".section-title",
    ".section-sub",
    ".about-text .about-p",
    ".about-image",
    ".contact-grid .info-btn",
    ".achievements-grid .ach-card",
    ".timeline .tl-item",
    ".gallery-intro > *",
    ".gallery-rail .proj-card",
    ".contact-form",
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
      // A thin band across the middle of the screen acts as a reading line, and
      // whichever section crosses it is the current one. The old rule asked for
      // 30% of the *section* to be inside that band, which a tall section like
      // the timeline can never manage — so no link ever lit up.
      { threshold: 0, rootMargin: "-45% 0px -50% 0px" }
    );

    Array.prototype.forEach.call(sections, function (section) {
      sectionObserver.observe(section);
    });
  }

  /* ---------- Project gallery rail ---------- */
  // Drifts on its own like the skills rows, but stays a real scroll container so
  // the arrows, dragging, the wheel and the keyboard all keep working.
  var rail = document.querySelector(".gallery-rail");
  var galBtns = document.querySelectorAll(".gal-btn");

  if (rail) {
    var originals = Array.prototype.slice.call(rail.querySelectorAll(".proj-card"));
    var looping = !reduceMotion && originals.length > 1;

    function cardStep() {
      var card = rail.querySelector(".proj-card");
      if (!card) return rail.clientWidth;
      var gap = parseFloat(window.getComputedStyle(rail).columnGap) || 24;
      return card.getBoundingClientRect().width + gap;
    }

    // Scrolling this far puts the duplicated set exactly where the originals were.
    function loopWidth() {
      return originals.length * cardStep();
    }

    if (looping) {
      originals.forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.classList.add("is-clone", "is-visible");
        clone.removeAttribute("data-reveal");
        clone.setAttribute("aria-hidden", "true");
        // Duplicates must not collect keyboard focus.
        Array.prototype.forEach.call(clone.querySelectorAll("a"), function (a) {
          a.setAttribute("tabindex", "-1");
        });
        rail.appendChild(clone);
      });
    }

    function syncButtons() {
      if (looping) return; // an endless rail never runs out of either direction
      var max = rail.scrollWidth - rail.clientWidth;
      Array.prototype.forEach.call(galBtns, function (btn) {
        var dir = Number(btn.getAttribute("data-dir"));
        btn.disabled =
          max <= 2
            ? true
            : dir < 0
              ? rail.scrollLeft <= 2
              : rail.scrollLeft >= max - 2;
      });
    }

    var AUTO_SPEED = 34; // px per second
    var paused = !looping;
    var offscreen = false;
    var lastFrame = null;
    var pos = 0;
    var resumeTimer;

    function pause() {
      paused = true;
    }

    function resume() {
      // Pick up wherever the visitor left the rail, folded back into one loop.
      var lw = loopWidth();
      pos = lw > 0 ? rail.scrollLeft % lw : rail.scrollLeft;
      lastFrame = null;
      paused = false;
    }

    function pauseThenResume(delay) {
      pause();
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () {
        if (!hovering && !dragging) resume();
      }, delay);
    }

    var hovering = false;
    var dragging = false;

    function frame(now) {
      requestAnimationFrame(frame);
      if (paused || offscreen) return;
      if (lastFrame === null) {
        lastFrame = now;
        pos = rail.scrollLeft;
        return;
      }
      var dt = (now - lastFrame) / 1000;
      lastFrame = now;
      if (dt <= 0 || dt > 0.5) return; // tab was backgrounded; skip the jump
      var lw = loopWidth();
      pos += AUTO_SPEED * dt;
      if (lw > 0 && pos >= lw) pos -= lw;
      rail.scrollLeft = pos;
    }

    if (looping) {
      pos = rail.scrollLeft;
      paused = false;
      requestAnimationFrame(frame);

      // Don't burn frames while the gallery is nowhere near the screen.
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(
          function (entries) {
            offscreen = !entries[0].isIntersecting;
            if (!offscreen) lastFrame = null;
          },
          { rootMargin: "200px 0px" }
        ).observe(rail);
      }

      rail.addEventListener("pointerenter", function () {
        hovering = true;
        pause();
      });
      rail.addEventListener("pointerleave", function () {
        hovering = false;
        if (!dragging) resume();
      });
      rail.addEventListener("focusin", pause);
      rail.addEventListener("focusout", function () {
        if (!hovering && !dragging) resume();
      });
      rail.addEventListener("wheel", function () {
        pauseThenResume(1600);
      }, { passive: true });
    }

    Array.prototype.forEach.call(galBtns, function (btn) {
      btn.addEventListener("click", function () {
        rail.scrollBy({
          left: cardStep() * Number(btn.getAttribute("data-dir")),
          behavior: reduceMotion ? "auto" : "smooth",
        });
        if (looping) pauseThenResume(1600);
      });
    });

    rail.addEventListener("scroll", syncButtons, { passive: true });
    window.addEventListener("resize", syncButtons, { passive: true });
    syncButtons();

    // Drag to pan, the way you'd expect from a gallery.
    var startX = 0;
    var startScroll = 0;

    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return; // native touch scrolling is better
      dragging = true;
      pause();
      startX = e.clientX;
      startScroll = rail.scrollLeft;
      rail.style.cursor = "grabbing";
    });

    rail.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) e.preventDefault();
      rail.scrollLeft = startScroll - dx;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      rail.style.cursor = "";
      if (looping && !hovering) resume();
    }

    rail.addEventListener("pointerup", endDrag);
    rail.addEventListener("pointerleave", endDrag);
    rail.addEventListener("pointercancel", endDrag);

    // Keyboard, once the rail has focus.
    rail.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      rail.scrollBy({
        left: cardStep() * (e.key === "ArrowRight" ? 1 : -1),
        behavior: reduceMotion ? "auto" : "smooth",
      });
      if (looping) pauseThenResume(1600);
    });
  }

  /* ---------- Scroll parallax ---------- */
  // Small drift on a few elements so the page keeps moving as you scroll.
  var parallax = [];

  if (!reduceMotion) {
    [
      [".tl-visual", 22],
      [".about-image", 16],
      [".proj-icon", 12],
    ].forEach(function (pair) {
      Array.prototype.forEach.call(
        document.querySelectorAll(pair[0]),
        function (el) {
          parallax.push({ el: el, amount: pair[1] });
        }
      );
    });
  }

  function updateParallax() {
    if (!parallax || !parallax.length) return;
    var vh = window.innerHeight;
    for (var i = 0; i < parallax.length; i++) {
      var item = parallax[i];
      var r = item.el.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      // -1 well below the fold, 0 dead centre, +1 well above it
      var progress = (r.top + r.height / 2 - vh / 2) / vh;
      item.el.style.setProperty(
        "--py",
        (-progress * item.amount).toFixed(1) + "px"
      );
    }
  }

  updateParallax();
  window.addEventListener("resize", updateParallax, { passive: true });

  /* ---------- Contact form ---------- */
  // The site is static, so there is no backend to post to: the form composes a
  // message and hands it to whatever mail client the visitor already uses.
  var ADDRESS = "josspootmateo@gmail.com";
  var form = document.getElementById("contact-form");

  if (form) {
    var note = form.querySelector(".form-note");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();

      if (!name || !email || !message) {
        note.textContent = "Please fill in your name, your email and a message.";
        note.className = "form-note error";
        return;
      }

      var subject = "Portfolio contact — " + name;
      var body =
        "Name: " + name + "\n" +
        "Email: " + email + "\n\n" +
        message + "\n";

      var href =
        "mailto:" + ADDRESS +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      note.className = "form-note";
      note.innerHTML =
        'Opening your mail app… if nothing happens, write to <a href="mailto:' +
        ADDRESS + '">' + ADDRESS + "</a>.";

      window.location.href = href;
    });
  }
})();
