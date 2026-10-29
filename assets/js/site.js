/* ============================================================
   VEGA GUO — scene transitions, navigation, small signs of life
============================================================ */

(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ------------------------------------------------------------
     SCENE TRANSITIONS
     Leaving: a plum veil rises over the page.
     Arriving: the head script has already covered the page,
     so here the veil only needs to lift.
  ------------------------------------------------------------ */

  const LEAVE_MS = 520;

  function isSceneLink(link, event) {
    if (!link || event.defaultPrevented) return false;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname) return false;
    return true;
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[href]");
    if (!isSceneLink(link, event) || reduceMotion.matches) return;

    event.preventDefault();
    try { sessionStorage.setItem("vg-scene", "1"); } catch (e) {}
    root.classList.remove("is-arrived", "nav-open");
    root.classList.add("is-leaving");
    window.setTimeout(function () { location.href = link.href; }, LEAVE_MS);
  });

  function arrive() {
    if (!root.classList.contains("is-arriving")) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add("is-arrived");
        root.classList.remove("is-arriving");
        window.setTimeout(function () { root.classList.remove("is-arrived"); }, 800);
      });
    });
  }
  arrive();

  // returning through the back button restores a frozen page; clear the veil
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) root.classList.remove("is-leaving", "is-arriving", "is-arrived");
  });

  /* ------------------------------------------------------------
     NAVIGATION (small screens)
  ------------------------------------------------------------ */

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");

  function setNav(open) {
    root.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
    if (open) nav.querySelector("a").focus();
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(!root.classList.contains("nav-open"));
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && root.classList.contains("nav-open")) {
        setNav(false);
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------
     REVEAL ON SCROLL
  ------------------------------------------------------------ */

  const revealables = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    revealables.forEach(function (el) { observer.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  }

})();
