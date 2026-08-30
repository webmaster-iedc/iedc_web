/* ── Device Capability Detection ── */
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const isMobileScreen = window.innerWidth <= 768;

/* ── Custom cursor ── */
const cursor = document.getElementById("cursor");
const ring = document.getElementById("cursor-ring");

// Only initialize mouse tracking if the device actually uses a pointer mouse
if (!isTouchDevice && cursor && ring) {
  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest(
      'a, button, .c-card, .filter-tab, .social-box, .hamburger, [role="button"]',
    );
    if (target) {
      cursor.style.width = "20px";
      cursor.style.height = "20px";
      cursor.style.background = "var(--purple-neon)";
      ring.style.width = "56px";
      ring.style.height = "56px";
      ring.style.borderColor = "rgba(158,84,255,0.6)";
    }
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest(
      'a, button, .c-card, .filter-tab, .social-box, .hamburger, [role="button"]',
    );
    if (target) {
      cursor.style.width = "12px";
      cursor.style.height = "12px";
      cursor.style.background = "var(--peach-glow)";
      ring.style.width = "36px";
      ring.style.height = "36px";
      ring.style.borderColor = "rgba(255,107,107,0.5)";
    }
  });

  let mx = 0,
    my = 0,
    rx = 0,
    ry = 0;
  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  (function animCursor() {
    cursor.style.left = mx + "px";
    cursor.style.top = my + "px";
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + "px";
    ring.style.top = ry + "px";
    requestAnimationFrame(animCursor);
  })();
} else {
  // Completely hide cursor elements safely on mobile devices
  if (cursor) cursor.style.display = "none";
  if (ring) ring.style.display = "none";
}

/* ── Navbar scroll + Active Highlighting via Intersection Observer ── */
const navbar = document.getElementById("navbar");
const sections = document.querySelectorAll(
  "#home, #events, #about, #team, #socials",
);
const navLinks = document.querySelectorAll(".nav-links a, .mobile-menu a");

let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 50);
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true },
);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const currentId = entry.target.getAttribute("id");
        navLinks.forEach((link) => {
          link.classList.toggle(
            "active",
            link.getAttribute("href") === `#${currentId}`,
          );
        });
      }
    });
  },
  { root: null, rootMargin: "-30% 0px -60% 0px", threshold: 0 },
);

sections.forEach((section) => sectionObserver.observe(section));

/* ── Starfield canvas ── */
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");
let W,
  H,
  normMX = 0.5,
  normMY = 0.5,
  smoothMX = 0.5,
  smoothMY = 0.5;
let clicked = false,
  clickX = 0,
  clickY = 0,
  clickAge = 0;

const trackCanvas = document.getElementById("mask-track-canvas");
const trackCtx = trackCanvas.getContext("2d");

function resize() {
  W = canvas.width = trackCanvas.width = window.innerWidth;
  H = canvas.height = trackCanvas.height = window.innerHeight;
  initStars();
}
window.addEventListener("resize", resize, { passive: true });

// Only capture mouse tracking metrics if we are on desktop
if (!isTouchDevice) {
  document.addEventListener("mousemove", (e) => {
    normMX = e.clientX / W;
    normMY = e.clientY / H;
  });
}
document.addEventListener("click", (e) => {
  clicked = true;
  clickX = e.clientX;
  clickY = e.clientY;
  clickAge = 0;
});

// Drastically drop mobile star counts to save CPU pipeline execution
const LAYERS = [
  {
    count: isMobileScreen ? 30 : 80,
    speed: 0.008,
    size: [0.3, 0.8],
    alpha: [0.25, 0.6],
    influence: 18,
  },
  {
    count: isMobileScreen ? 30 : 80,
    speed: 0.022,
    size: [0.7, 1.3],
    alpha: [0.45, 0.8],
    influence: 28,
  },
  {
    count: isMobileScreen ? 20 : 80,
    speed: 0.042,
    size: [1.1, 2.2],
    alpha: [0.65, 1.0],
    influence: 45,
  },
];

const stars = [];
function initStars() {
  stars.length = 0;
  LAYERS.forEach((l) => {
    for (let i = 0; i < l.count; i++)
      stars.push({
        bx: Math.random() * W,
        by: Math.random() * H,
        x: 0,
        y: 0,
        r: l.size[0] + Math.random() * (l.size[1] - l.size[0]),
        a: l.alpha[0] + Math.random() * (l.alpha[1] - l.alpha[0]),
        twOff: Math.random() * Math.PI * 2,
        twSpd: 0.018 + Math.random() * 0.028,
        speed: l.speed,
        infl: l.influence,
        tint:
          Math.random() < 0.4
            ? Math.random() < 0.5
              ? [158, 84, 255]
              : [255, 107, 107]
            : [143, 140, 169],
        dvx: 0,
        dvy: 0,
      });
  });
}

let lastTime = performance.now(),
  t = 0;
function draw(now) {
  let dt = (now - lastTime) / 16.666;
  if (isNaN(dt) || dt > 10) dt = 1;
  lastTime = now;
  t += dt;

  if (!isTouchDevice) {
    smoothMX += (normMX - smoothMX) * 0.05 * dt;
    smoothMY += (normMY - smoothMY) * 0.05 * dt;
  }
  const pdx = smoothMX - 0.5,
    pdy = smoothMY - 0.5;

  ctx.fillStyle = "#0B0B16";
  ctx.fillRect(0, 0, W, H);

  // Skip expensive full-screen vignette operations entirely on mobile screens
  if (!isMobileScreen) {
    const vig = ctx.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.05,
      W / 2,
      H / 2,
      H * 0.9,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  if (clicked) {
    clickAge += dt;
    const rA = Math.max(0, 0.6 - clickAge * 0.025);
    ctx.beginPath();
    ctx.arc(clickX, clickY, clickAge * 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,107,107,${rA})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (clickAge > 6) {
      const r2 = (clickAge - 6) * 7,
        a2 = Math.max(0, 0.4 - (clickAge - 6) * 0.03);
      ctx.beginPath();
      ctx.arc(clickX, clickY, r2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(158,84,255,${a2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (rA <= 0) clicked = false;
  }

  stars.forEach((s) => {
    const parallax = s.speed * 105;
    let px = s.bx + pdx * parallax,
      py = s.by + pdy * parallax;
    s.x = ((px % W) + W) % W;
    s.y = ((py % H) + H) % H;

    const tw = 0.55 + 0.45 * Math.sin(t * s.twSpd + s.twOff);
    const a = Math.min(1, s.a * tw);
    const [r, g, b] = s.tint;

    // Performance optimization: Draw dynamic blur glow ONLY on desktops
    if (s.r > 1.2 && !isMobileScreen) {
      const hR = s.r * 3.5;
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, hR);
      glow.addColorStop(0, `rgba(${r},${g},${b},${a * 0.35})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(s.x, s.y, hR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fill();
  });

  drawMaskTrack(dt);
  requestAnimationFrame(draw);
}

function drawMaskTrack(dt) {
  trackCtx.clearRect(0, 0, W, H);
}

/* ── Setup & Structural Content Listeners ── */
document.addEventListener("DOMContentLoaded", () => {
  const elementsToTrack = document.querySelectorAll(
    ".btn-glass, .hero-title, .hero-tagline, .hero-badge",
  );
  elementsToTrack.forEach((el) => {
    el.addEventListener("mouseenter", () => (targetGlowIntensity = 0.52));
    el.addEventListener("mouseleave", () => (targetGlowIntensity = 0.16));
  });

  const montageStage = document.querySelector(".montage-stage");
  const montageCards = Array.from(document.querySelectorAll(".montage-card"));
  const mobileSliderTrack = document.querySelector(".montage-mobile-track");
  let mobileSliderTimer = null;

  function layoutMontage() {
    if (!montageStage || montageCards.length === 0) return;

    const rect = montageStage.getBoundingClientRect();
    const stageWidth = rect.width || montageStage.clientWidth || 1;
    const stageHeight = rect.height || montageStage.clientHeight || 1;
    const isMobile = window.innerWidth <= 600;
    const centerX = stageWidth * (isMobile ? 0.52 : 0.56);
    const centerY = stageHeight * (isMobile ? 0.5 : 0.53);
    const ringRadius =
      Math.min(stageWidth, stageHeight) * (isMobile ? 0.35 : 0.38);
    const wobbleXRange = stageWidth * (isMobile ? 0.04 : 0.1);
    const wobbleYRange = stageHeight * (isMobile ? 0.04 : 0.08);

    montageCards.forEach((card, index) => {
      const angle = Number(card.dataset.angle || 0) * (Math.PI / 180);
      const radiusFactor = Number(card.dataset.radius || 0.9);
      const baseRadius = ringRadius * radiusFactor;
      const orbitSkew = isMobile ? 0.72 : 0.8;
      const wobbleX = (Math.random() - 0.5) * wobbleXRange;
      const wobbleY = (Math.random() - 0.5) * wobbleYRange;
      const driftX =
        Math.cos(angle) * baseRadius +
        wobbleX +
        (Math.random() - 0.5) * stageWidth * (isMobile ? 0.02 : 0.03);
      const driftY =
        Math.sin(angle) * baseRadius * orbitSkew +
        wobbleY +
        (Math.random() - 0.5) * stageHeight * (isMobile ? 0.015 : 0.025);
      const tilt =
        Number(card.dataset.tilt || 0) +
        (Math.random() - 0.5) * (isMobile ? 3 : 7);
      const depth = Number(card.dataset.z || 1) + index;

      card.style.setProperty("--x", `${centerX + driftX}px`);
      card.style.setProperty("--y", `${centerY + driftY}px`);
      card.style.setProperty("--rot", `${tilt.toFixed(2)}deg`);
      card.style.setProperty("--z", depth.toString());
    });
  }

  function stopMobileSlider() {
    if (mobileSliderTimer) {
      clearInterval(mobileSliderTimer);
      mobileSliderTimer = null;
    }
  }

  function startMobileSlider() {
    if (!mobileSliderTrack) return;
    stopMobileSlider();

    const isMobileSlider =
      window.innerWidth <= 900 &&
      window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (!isMobileSlider) return;

    const getStep = () => {
      const slide = mobileSliderTrack.querySelector(".montage-slide");
      if (!slide) return mobileSliderTrack.clientWidth;
      const slideStyle = window.getComputedStyle(mobileSliderTrack);
      const gap =
        parseFloat(slideStyle.gap || slideStyle.columnGap || "0") || 0;
      return slide.getBoundingClientRect().width + gap;
    };

    let pauseUntil = 0;
    const tick = () => {
      if (Date.now() < pauseUntil) return;
      const maxScrollLeft =
        mobileSliderTrack.scrollWidth - mobileSliderTrack.clientWidth;
      const step = getStep();
      const nextLeft = mobileSliderTrack.scrollLeft + step;

      if (nextLeft >= maxScrollLeft - 2) {
        mobileSliderTrack.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        mobileSliderTrack.scrollBy({ left: step, behavior: "smooth" });
      }
    };

    mobileSliderTimer = setInterval(tick, 3200);

    ["touchstart", "pointerdown", "mouseenter"].forEach((eventName) => {
      mobileSliderTrack.addEventListener(
        eventName,
        () => {
          pauseUntil = Date.now() + 4000;
        },
        { passive: true },
      );
    });
  }

  function initAutoSlider(sliderId, dotsId, interval = 950) {
    const sliderEl = document.getElementById(sliderId);
    const track = sliderEl ? sliderEl.querySelector(".team-auto-track") : null;
    const dotsContainer = document.getElementById(dotsId);
    if (!track) return;

    const cards = Array.from(track.children);
    const total = cards.length;
    let perPage = getPerPage();
    let current = 0;
    let pages = Math.max(1, total - perPage + 1);
    let slideTimer = null;
    let isHovered = false;

    function getPerPage() {
      if (window.innerWidth <= 600) return 1;
      if (window.innerWidth <= 1100) return 2;
      return 4;
    }

    function setupDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = "";
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement("button");
        dot.className = "team-slider-dot" + (i === current ? " active" : "");
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        dot.addEventListener("click", () => {
          goTo(i);
          startTimer();
        });
        dotsContainer.appendChild(dot);
      }
    }

    function goTo(index) {
      if (pages <= 1) {
        track.style.transform = "translateX(0)";
        return;
      }
      current = (index + pages) % pages;
      const cardWidth = cards[0].getBoundingClientRect().width;
      const gap = 20;
      track.style.transform = `translateX(-${current * (cardWidth + gap)}px)`;

      if (dotsContainer) {
        dotsContainer.querySelectorAll(".team-slider-dot").forEach((d, i) => {
          d.classList.toggle("active", i === current);
        });
      }
    }

    function startTimer() {
      clearInterval(slideTimer);
      slideTimer = setInterval(() => {
        if (!isHovered) goTo(current + 1);
      }, interval);
    }

    sliderEl.addEventListener("mouseenter", () => {
      isHovered = true;
    });
    sliderEl.addEventListener("mouseleave", () => {
      isHovered = false;
    });
    sliderEl.addEventListener(
      "touchstart",
      () => {
        isHovered = true;
      },
      { passive: true },
    );
    sliderEl.addEventListener(
      "touchend",
      () => {
        setTimeout(() => {
          isHovered = false;
        }, 2000);
      },
      { passive: true },
    );

    setupDots();
    goTo(0);
    startTimer();
    window.addEventListener(
      "resize",
      () => {
        const newPerPage = getPerPage();
        if (newPerPage !== perPage) {
          perPage = newPerPage;
          pages = Math.max(1, total - perPage + 1);
          if (current >= pages) current = pages - 1;
          setupDots();
        }
        goTo(current);
      },
      { passive: true },
    );
  }

  initAutoSlider("execom-slider", "execom-dots");
  initAutoSlider("exec-panel-slider", "exec-panel-dots");

  montageCards.forEach((card) => {
    card.addEventListener(
      "mousemove",
      (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        card.style.setProperty(
          "--tilt-x",
          `${(((yc - y) / yc) * 12).toFixed(2)}deg`,
        );
        card.style.setProperty(
          "--tilt-y",
          `${(((x - xc) / xc) * 12).toFixed(2)}deg`,
        );
      },
      { passive: true },
    );

    card.addEventListener(
      "mouseleave",
      () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      },
      { passive: true },
    );
  });

  layoutMontage();
  startMobileSlider();
  window.addEventListener(
    "resize",
    () => {
      layoutMontage();
      startMobileSlider();
    },
    { passive: true },
  );
  window.addEventListener(
    "load",
    () => {
      layoutMontage();
      startMobileSlider();
    },
    { once: true },
  );
});

resize();
requestAnimationFrame(draw);

/* ── Typewriter ── */
function typeWriter(el, text, speed, onDone) {
  let i = 0;
  (function type() {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(type, speed + Math.random() * 25);
    } else if (onDone) setTimeout(onDone, 300);
  })();
}

window.addEventListener(
  "load",
  () => {
    const taglineEl = document.getElementById("typed-tagline");
    const cur = document.getElementById("tagline-cursor");
    setTimeout(() => {
      if (cur) cur.style.display = "inline-block";
      if (taglineEl)
        typeWriter(
          taglineEl,
          "Your journey as an innovator starts here at IEDC CET.",
          42,
        );
    }, 1300);
  },
  { once: true },
);

/* ── Hamburger Menu ── */
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobile-menu");
if (hamburger && mobileMenu) {
  hamburger.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("open");
    hamburger.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", isOpen);
  });
}
document.querySelectorAll(".mobile-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    if (mobileMenu) mobileMenu.classList.remove("open");
    if (hamburger) {
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", false);
    }
  });
});

const firstNavLink = document.querySelector(".nav-links a");
if (firstNavLink) firstNavLink.classList.add("active");

/* ── Scroll reveals (Async Listeners) ── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("show");
    });
  },
  { threshold: 0.15 },
);

document
  .querySelectorAll(".c-card, #quote-card, .events-section")
  .forEach((el) => revealObserver.observe(el));

/* ── Bulletin board filtering ── */
const filterTabs = document.querySelectorAll(".filter-tab");
const bulletinCards = document.querySelectorAll(".bulletin-card");
const bulletinGrid = document.querySelector(".bulletin-grid");
const bulletinEmptyState = document.querySelector(".bulletin-empty-state");
let bulletinEmptyStateTimeoutId = null;

function setBulletinEmptyState(isEmpty) {
  if (!bulletinGrid || !bulletinEmptyState) return;
  bulletinGrid.hidden = isEmpty;
  bulletinEmptyState.hidden = !isEmpty;
}

setBulletinEmptyState(bulletinCards.length === 0);

filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filterTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const filterValue = tab.dataset.filter;
    let visibleCount = 0;

    window.clearTimeout(bulletinEmptyStateTimeoutId);

    bulletinCards.forEach((card) => {
      clearTimeout(Number(card.dataset.timeoutId));
      if (filterValue === "all" || card.dataset.category === filterValue) {
        visibleCount += 1;
        card.style.display = "flex";
        void card.offsetHeight;
        card.style.opacity = "1";
        card.style.transform = "";
      } else {
        card.style.opacity = "0";
        card.style.transform = "scale(0.92) translateY(12px)";
        card.dataset.timeoutId = setTimeout(
          () => (card.style.display = "none"),
          350,
        );
      }
    });

    if (visibleCount === 0) {
      bulletinEmptyStateTimeoutId = window.setTimeout(() => {
        setBulletinEmptyState(true);
      }, 360);
    } else {
      setBulletinEmptyState(false);
    }
  });
});

/* ── Tally Form Integration & Celebration ── */
function triggerCelebration() {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "999999",
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener(
    "resize",
    () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    },
    { passive: true },
  );

  const colors = [
    "#9E54FF",
    "#FF6B6B",
    "#4DABF7",
    "#51CF66",
    "#FCC419",
    "#FF8787",
  ];
  const particles = [];

  function spawnConfetti(startX, startY, angleRange, count) {
    for (let i = 0; i < count; i++) {
      const angle =
        angleRange[0] + Math.random() * (angleRange[1] - angleRange[0]);
      const speed = 10 + Math.random() * 18;
      particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        opacity: 1,
        shape: Math.random() > 0.4 ? "rect" : "circle",
        wobble: Math.random() * 10,
        wobbleSpeed: 0.05 + Math.random() * 0.1,
      });
    }
  }

  spawnConfetti(0, height * 0.9, [-Math.PI / 4, -Math.PI / 10], 70);
  spawnConfetti(
    width,
    height * 0.9,
    [(-Math.PI * 9) / 10, (-Math.PI * 3) / 4],
    70,
  );
  spawnConfetti(
    width / 2,
    height * 0.9,
    [(-Math.PI * 2) / 3, -Math.PI / 3],
    50,
  );

  (function animate() {
    ctx.clearRect(0, 0, width, height);
    let active = false;
    particles.forEach((p) => {
      if (p.opacity <= 0) return;
      active = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.rotation += p.rotationSpeed;
      p.wobble += p.wobbleSpeed;
      p.opacity -= 0.007;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(
          -(p.size * Math.sin(p.wobble)) / 2,
          -p.size / 2,
          p.size * Math.sin(p.wobble),
          p.size,
        );
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    if (active) requestAnimationFrame(animate);
    else canvas.remove();
  })();

  const overlay = document.getElementById("celebration-overlay");
  if (overlay) overlay.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("celebration-close-btn");
  const overlay = document.getElementById("celebration-overlay");
  if (closeBtn && overlay) {
    closeBtn.addEventListener("click", () =>
      overlay.classList.remove("active"),
    );
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  }

  const cursorEl = document.getElementById("cursor");
  const ringEl = document.getElementById("cursor-ring");
  if (cursorEl && ringEl) {
    document.addEventListener("mouseleave", () => {
      cursorEl.style.opacity = "0";
      ringEl.style.opacity = "0";
    });
    document.addEventListener("mouseenter", () => {
      cursorEl.style.opacity = "1";
      ringEl.style.opacity = "1";
    });
  }
});

window.addEventListener("blur", () => {
  if (document.activeElement && document.activeElement.tagName === "IFRAME")
    document.body.classList.add("iframe-hover");
});
window.addEventListener("focus", () =>
  document.body.classList.remove("iframe-hover"),
);

window.addEventListener("message", (e) => {
  try {
    const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
    if (data && data.event) {
      if (data.event === "Tally.FormSubmitted") triggerCelebration();
      if (
        data.event === "Tally.FormLoaded" ||
        data.event === "Tally.FormPageView"
      )
        document.body.classList.add("tally-open");
      if (data.event === "Tally.PopupClosed") {
        document.body.classList.remove("tally-open");
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    }
  } catch (err) {
    if (typeof e.data === "string") {
      if (e.data.includes("Tally.FormSubmitted")) triggerCelebration();
      if (
        e.data.includes("Tally.FormLoaded") ||
        e.data.includes("Tally.FormPageView")
      )
        document.body.classList.add("tally-open");
      if (e.data.includes("Tally.PopupClosed")) {
        document.body.classList.remove("tally-open");
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    }
  }
});
