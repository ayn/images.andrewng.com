const year = String(new Date().getFullYear());
for (const element of document.querySelectorAll("[data-copyright-year]")) element.textContent = year;
