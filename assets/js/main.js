// Grille de points entiers du motif décoratif
(function () {
  var poly = [[40,140],[70,40],[160,30],[210,90],[170,150]];
  function inside(x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  var ns = "http://www.w3.org/2000/svg";
  var out = document.getElementById("lattice"), inn = document.getElementById("lattice-in");
  if (!out || !inn) return;
  for (var x = 20; x <= 220; x += 20) {
    for (var y = 20; y <= 160; y += 20) {
      var dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 2.2);
      if (inside(x, y)) { dot.setAttribute("class", "pt-in"); inn.appendChild(dot); }
      else { dot.setAttribute("class", "pt"); out.appendChild(dot); }
    }
  }
})();

// Afficher ou masquer le BibTeX
document.querySelectorAll(".bib-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var pre = btn.closest(".pub").querySelector(".bibtex");
    var open = pre.classList.toggle("ouvert");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
});

// Thème clair / sombre (mémorisé dans le navigateur du visiteur)
(function () {
  var root = document.documentElement;
  document.getElementById("themeToggle").addEventListener("click", function () {
    var current = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
})();

// Mettre en évidence la section visible dans la navigation
(function () {
  // Seulement les liens vers une section de la page affichée (ex. /#apropos sur l'accueil)
  var links = Array.prototype.slice.call(document.querySelectorAll(".side nav a")).filter(function (a) {
    return a.hash && a.pathname === location.pathname && document.getElementById(a.hash.slice(1));
  });
  var targets = links.map(function (a) { return document.getElementById(a.hash.slice(1)); });
  if (!links.length || !("IntersectionObserver" in window)) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        links.forEach(function (a) { a.classList.toggle("actif", a.hash === "#" + en.target.id); });
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  targets.forEach(function (t) { if (t) obs.observe(t); });
})();

// Filtres de la page Photos (année, pays, ville). Chaque menu ne propose que les valeurs
// compatibles avec les deux autres choix ; les menus sont remplis depuis les attributs data-*.
(function () {
  var form = document.getElementById("filtres");
  if (!form) return;
  var items = Array.prototype.slice.call(document.querySelectorAll(".galerie .photo"));
  var lang = document.documentElement.lang || "fr";
  var champs = {
    annee: { attr: "annee", nom: "annee", tri: function (a, b) { return b.nom.localeCompare(a.nom); } },
    pays:  { attr: "pays", nom: "paysNom" },
    ville: { attr: "ville", nom: "villeNom" }
  };
  var defauts = {};
  Object.keys(champs).forEach(function (k) {
    var sel = form.elements[k];
    defauts[k] = sel.options[0].textContent;
  });
  function choix() {
    var c = {};
    Object.keys(champs).forEach(function (k) { c[k] = form.elements[k].value; });
    return c;
  }
  function correspond(li, c, sauf) {
    return Object.keys(champs).every(function (k) {
      return k === sauf || !c[k] || li.dataset[champs[k].attr] === c[k];
    });
  }
  function remplir() {
    var c = choix();
    Object.keys(champs).forEach(function (k) {
      var ch = champs[k], vus = {}, liste = [];
      items.forEach(function (li) {
        var v = li.dataset[ch.attr];
        if (v && !vus[v] && correspond(li, c, k)) { vus[v] = 1; liste.push({ v: v, nom: li.dataset[ch.nom] || v }); }
      });
      liste.sort(ch.tri || function (a, b) { return a.nom.localeCompare(b.nom, lang); });
      var sel = form.elements[k];
      if (c[k] && !vus[c[k]]) c[k] = "";
      sel.innerHTML = "";
      sel.add(new Option(defauts[k], ""));
      liste.forEach(function (o) { sel.add(new Option(o.nom, o.v)); });
      sel.value = c[k];
      sel.disabled = liste.length < 2 && !c[k];
    });
    return choix();
  }
  function appliquer() {
    var c = remplir(), n = 0;
    items.forEach(function (li) { li.hidden = !correspond(li, c); if (!li.hidden) n++; });
    // masquer les colonnes, rangées et sections dont toutes les photos sont filtrées
    document.querySelectorAll(".colonne, .galerie, .groupe-ville, .groupe-pays").forEach(function (sec) {
      sec.hidden = !sec.querySelector(".photo:not([hidden])");
    });
    if (window.agencerGalerie) window.agencerGalerie();
    form.querySelector(".filtres-compte").textContent =
      n + " " + (n > 1 ? form.dataset.photos : form.dataset.photo);
  }
  form.addEventListener("change", appliquer);
  form.addEventListener("reset", function () { setTimeout(appliquer, 0); });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  form.hidden = false;
  appliquer();
})();

// Mosaïque de la page Photos. Dans une rangée de m colonnes, la colonne j empile k_j photos
// de rapports largeur/hauteur r_i. À largeur w_j, sa hauteur est w_j·Σ(1/r_i) + (k_j−1)·g.
// En posant R_j = 1/Σ(1/r_i), une hauteur commune H impose w_j = (H − (k_j−1)·g)·R_j, et
// Σ w_j + (m−1)·g = W donne H = (W − (m−1)·g + g·Σ(k_j−1)·R_j) / Σ R_j.
// H est plafonnée à 90 % de la hauteur de l'écran (la rangée est alors centrée).
(function () {
  var rangees = Array.prototype.slice.call(document.querySelectorAll(".galerie"));
  if (!rangees.length) return;
  var etroit = window.matchMedia("(max-width: 640px)");
  function ratio(img) {
    return img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5;
  }
  function agencer() {
    rangees.forEach(function (ul) {
      var cols = Array.prototype.slice.call(ul.children).filter(function (c) { return !c.hidden; });
      if (ul.hidden || !cols.length) return;
      if (etroit.matches) { cols.forEach(function (c) { c.style.flex = ""; }); return; }
      var W = ul.clientWidth, g = parseFloat(getComputedStyle(ul).columnGap) || 0;
      var sR = 0, sKR = 0, infos = cols.map(function (c) {
        var imgs = Array.prototype.slice.call(c.querySelectorAll(".photo:not([hidden]) img"));
        var inv = imgs.reduce(function (s, img) { return s + 1 / ratio(img); }, 0);
        var R = 1 / inv, k = imgs.length;
        sR += R; sKR += (k - 1) * R;
        return { c: c, R: R, k: k };
      });
      var H = (W - (cols.length - 1) * g + g * sKR) / sR;
      H = Math.min(H, window.innerHeight * 0.9);
      infos.forEach(function (o) {
        o.c.style.flex = "0 0 " + Math.max(0, Math.floor((H - (o.k - 1) * g) * o.R)) + "px";
      });
    });
  }
  window.agencerGalerie = agencer;

  // Ancre (#norvege…) : tant que des photos se chargent au-dessus de la section visée, la page
  // bouge ; on la ramène sur la section pendant quelques secondes, sauf si le visiteur défile.
  var epingle = null, jusqua = 0;
  function epingler(el) { epingle = el; jusqua = Date.now() + 4000; }
  function realigner() {
    if (epingle && Date.now() < jusqua) epingle.scrollIntoView({ block: "start", behavior: "instant" });
  }
  ["wheel", "touchstart", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (e.target.closest && e.target.closest(".carte-photos")) return;   // Entrée sur la carte
      epingle = null;
    }, { passive: true });
  });
  window.epinglerPhotos = epingler;
  function versAncre() {
    var id = decodeURIComponent(location.hash.slice(1));
    var el = id && document.getElementById(id);
    if (el && el.closest(".groupe-pays")) { el.scrollIntoView({ block: "start", behavior: "instant" }); epingler(el); }
  }
  window.addEventListener("hashchange", versAncre);   // boutons Précédent / Suivant

  document.querySelectorAll(".galerie img").forEach(function (img) {
    if (!img.complete) img.addEventListener("load", function () { agencer(); realigner(); });
  });
  // Recalculer quand la largeur disponible change (fenêtre redimensionnée, barre de
  // défilement qui apparaît ou disparaît…), sans boucler sur nos propres changements.
  var largeur = 0, t;
  function surveiller() {
    var w = rangees[0].parentElement.clientWidth;
    if (w !== largeur) { largeur = w; agencer(); }
  }
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () { clearTimeout(t); t = setTimeout(surveiller, 50); })
      .observe(document.querySelector(".galerie").closest("section"));
  }
  window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(agencer, 100); });
  agencer();
  versAncre();
})();

// Carte de la page Photos : un clic (ou Entrée) sur un pays colorié fait défiler la page
// jusqu'à la section de sa première photo. Si les filtres la masquent, ils sont réinitialisés.
(function () {
  var carte = document.querySelector(".carte-photos");
  if (!carte) return;
  var aide = carte.getAttribute("data-aide") || "";
  function photoDe(code) {
    return document.querySelector('.galerie .photo[data-pays="' + code + '"]');
  }
  function aller(code) {
    var ph = photoDe(code);
    if (!ph) return;
    var form = document.getElementById("filtres");
    if (ph.hidden && form) { form.reset(); form.dispatchEvent(new Event("change")); }
    var section = ph.closest(".groupe-pays");
    var titre = section && section.querySelector("h2[id]");
    var cible = titre || ph;
    if (titre && history.pushState) {
      try { history.pushState(null, "", "#" + titre.id); } catch (e) { /* adresse non modifiable */ }
    }
    cible.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.epinglerPhotos) window.epinglerPhotos(cible);
  }
  carte.querySelectorAll(".pays.choisi").forEach(function (path) {
    var code = path.getAttribute("data-code");
    if (!photoDe(code)) { path.classList.remove("choisi"); return; }
    var titre = path.querySelector("title");
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "link");
    if (titre) path.setAttribute("aria-label", (aide + " " + titre.textContent).trim());
    path.addEventListener("click", function () { aller(code); });
    path.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aller(code); }
    });
  });
})();

// Visionneuse de la page Photos : agrandir une photo, naviguer avec ‹ › ou les flèches du clavier
// (seulement parmi les photos visibles après filtrage)
(function () {
  var dlg = document.getElementById("visionneuse");
  if (!dlg || typeof dlg.showModal !== "function") return; // sinon, le lien ouvre simplement l'image
  var tous = Array.prototype.slice.call(document.querySelectorAll(".galerie a")), liens = tous;
  var img = dlg.querySelector("img"), cap = dlg.querySelector("figcaption"), i = 0;
  var prec = dlg.querySelector(".v-prec"), suiv = dlg.querySelector(".v-suiv");
  function montrer(n) {
    i = (n + liens.length) % liens.length;
    var a = liens[i];
    img.src = a.href;
    img.alt = a.querySelector("img").alt;
    cap.textContent = a.getAttribute("data-legende") || "";
    cap.hidden = !cap.textContent;
  }
  tous.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      liens = tous.filter(function (x) { return !x.closest("li").hidden; });
      prec.hidden = suiv.hidden = liens.length < 2;
      montrer(liens.indexOf(a));
      dlg.showModal();
    });
  });
  prec.addEventListener("click", function () { montrer(i - 1); });
  suiv.addEventListener("click", function () { montrer(i + 1); });
  dlg.querySelector(".v-fermer").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); }); // clic hors de la photo
  dlg.addEventListener("keydown", function (e) {
    if (liens.length < 2) return;
    if (e.key === "ArrowLeft") montrer(i - 1);
    if (e.key === "ArrowRight") montrer(i + 1);
  });
})();

// Lien mailto : l'adresse est écrite « nom (at) domaine » dans le HTML (contre les robots de spam)
// et n'est transformée en lien cliquable qu'à l'affichage.
document.querySelectorAll(".courriel").forEach(function (el) {
  var adresse = el.textContent.trim()
    .replace(/\s*[\(\[]\s*(at|arobase)\s*[\)\]]\s*/i, "@")
    .replace(/\s*[\(\[]\s*(dot|point)\s*[\)\]]\s*/gi, ".");
  if (adresse.indexOf("@") < 1) return;
  var a = document.createElement("a");
  a.href = "mailto:" + adresse;
  a.textContent = el.getAttribute("data-libelle") || adresse;
  if (el.getAttribute("data-libelle")) a.title = adresse;   // l'adresse s'affiche au survol
  el.replaceWith(a);
});
