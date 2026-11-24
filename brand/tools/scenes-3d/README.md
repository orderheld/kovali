# 3D-Bilder der Website

Die Bilder in `src/assets/scenes/` sind 3D-Renderings aus zwei three.js-Szenen. Es gibt keine Fotos und keine fremden Bilder.

| Ordner | Motiv | Verwendet für |
|---|---|---|
| `glass/` | Glasscheiben mit einem blauen Lichtstrahl | Startseite, Seitenköpfe, Abschlusspanel, Bildkacheln, Teilen-Bild |
| `strands/` | Blaue Lichtfasern | Artikelbilder und Seitenkopf Insights |

Jeder Ordner enthält `notes.md` mit den genauen Parametern pro Datei.

## Neu rendern

1. Einmalig: `cd brand/tools/scenes-3d && npm i --no-save three@0.187`.
2. Server starten: `python3 -m http.server 8810 --directory brand/tools/scenes-3d`.
3. Rendern mit Playwright und Chromium, zum Beispiel alle Glas-Bilder: `brand/tools/scenes-3d/glass/run_jobs.sh 1 2 /tmp/glass-final`.
4. Die PNG-Dateien als WebP nach `src/assets/scenes/` übernehmen, mit Qualität 90 und einem leichten Rauschen (Sigma 0.9) gegen Streifen in den dunklen Verläufen. Die Dateinamen bleiben gleich, damit `src/content/scenes.ts` unverändert bleibt.

Breite Bilder (Hero, Seitenköpfe, Abschlusspanel) halten das Motiv rechts und die linke Seite dunkel, weil dort weisser Text steht.
