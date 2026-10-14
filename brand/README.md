# KOVALI Logo

Drei Richtungen wurden entwickelt; gewählt ist **KOVALI Signature**.

| Richtung | Idee |
| --- | --- |
| **Signature** (aktiv) | Geometrisches K aus Stamm und zwei Armen im 48-Grad-Winkel. Die drei Teile stehen für KO · VA · LI, der Farbverlauf von Navy zu Electric Blue für den Weg von der Anforderung zum Wert. |
| Tech | K aus vier Kacheln, technisch und modular. |
| Minimal | Reduziertes Linien-K mit Knotenpunkt, wortmarkengeführt. |

## Dateien

`brand/directions/<richtung>/` enthält für jede Richtung:

| Datei | Verwendung |
| --- | --- |
| `kovali-logo.svg` | Gestapelt (Zeichen über Wortmarke und Zusatz), helle Flächen |
| `kovali-logo-dark.svg` | Gestapelt, dunkle Flächen |
| `kovali-logo-monochrome.svg` | Einfarbig Navy, z. B. Stempel oder Fax |
| `kovali-logo-horizontal*.svg` | Zeichen links, Wortmarke und Zusatz rechts (hell, dunkel, einfarbig) |
| `kovali-logo-compact*.svg` | Zeichen und Wortmarke ohne Zusatz, für Header und kleine Flächen |
| `kovali-icon.svg`, `kovali-icon-dark.svg` | Nur das Zeichen |
| `kovali-favicon.svg` | Vereinfachtes Zeichen auf Navy, 32 × 32 |
| `kovali-wordmark.svg` | Nur die Wortmarke |

Die aktive Richtung liegt zusätzlich in `public/brand/` und als `src/app/icon.svg`. Alle SVGs haben einen transparenten Hintergrund und keine externen Ressourcen; Schrift ist in Pfade umgewandelt.

## Logo wechseln

1. In `src/config/site.ts` `logoDirection` auf `"signature"`, `"tech"` oder `"minimal"` setzen.
2. `python3 -m pip install fonttools` (einmalig), dann `npm run brand`.
3. Header, Footer, Favicon und `public/brand/` übernehmen die neue Richtung. `src/app/apple-icon.png`, `src/app/favicon.ico` und `src/app/opengraph-image.png` sind gerenderte Bilder und müssen bei einem Wechsel neu erzeugt werden.

## Farben

| Name | Wert | Einsatz |
| --- | --- | --- |
| Navy | `#0B1733` | Stamm des K, Text, dunkle Flächen |
| Corporate Blue | `#145BCE` | Oberer Arm, Links, Buttons |
| Electric Blue | `#35A9FF` | Unterer Arm, Akzente auf Navy. Nie als Text auf Weiss. |
| Night | `#060B18` | Dunkle Flächen der Website: Hero, Abschluss, Footer |
| Azure | `#1F7BEA` | Mittleres Blau des dunklen Logos, für Verläufe |
| Cloud | `#F4F7FB` | Hellgraue Flächen der Website |
| Mist | `#F4F8FC` | Admin-Bereich und Upload-Felder |

## Regeln

- Schutzzone rundum mindestens eine Stammbreite des K.
- Mindestgrösse: Zeichen 16 px, kompaktes Logo 24 px Höhe.
- Nicht verzerren, nicht umfärben, keine Effekte.
- Die Bedeutung KO · VA · LI wird auf der Website erklärt, nicht im Logo.
