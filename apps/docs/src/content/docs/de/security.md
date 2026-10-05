---
title: Sicherheit
description: Sicherheitsübersicht.
---

- Der gesamte Verkehr nutzt HTTPS und läuft über Cloudflare.
- Teilnehmer-Tokens sind per HMAC signiert und laufen ab. Sie enthalten keine personenbezogenen Daten.
- Bearbeitungsrechte liegen als geheimes Token in der Einladung des Organisators; auf dem Server wird nur ein SHA-256-Hash gespeichert.
- Datensparsamkeit: nur Aggregate, nach 30 Tagen gelöscht. Siehe [Datenschutz](/de/privacy/).
- Schwachstellen melden Sie über den [Support](/de/support/).
