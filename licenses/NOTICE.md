# Attribution and third-party notices

1.4.0 addition: educational text in `data/expansion-v1.4.js` and `data/readings-v1.4.js`, CC BY 4.0, attribution “KotobaPath contributors (2026)”. JavaScript loading logic GPL-3.0-or-later. These materials are independently authored.

1.3.0 addition: original educational text in `data/expansion-v1.3.js` and `data/readings-v1.3.js`, CC BY 4.0, attribution “KotobaPath contributors (2026)”; JavaScript loading logic GPL-3.0-or-later. These new examples are independently authored.

Snapshot date: 2026-11-04. No endorsement by the original authors or JLPT organizers is implied.

## Application code

`index.html`, `style.css`, `app.js`, `start.py`, launchers, tests and `favicon.svg`: Copyright 2026 KotobaPath contributors. GPL-3.0-or-later. Full GPLv3 text: `../LICENSE`.

## Original educational material

`data/foundation.js`, `data/grammar.js`, `data/grammar-source.tsv`, `data/readings.js`, `data/blanks.js`, `data/orders.js`, `data/writing.js`, and original prose documentation: CC BY 4.0, attribution “KotobaPath contributors (2026)”.
https://creativecommons.org/licenses/by/4.0/

Teaching framework reference only: GENKI, The Japan Times Publishing. https://genki3.japantimes.co.jp/en/intro/index.html
No textbook pages, illustrations, exercises, or dialogues are reproduced. No licensed use of GENKI branding or endorsement is asserted.

## Chinese vocabulary and associated examples

`data/vocab.js` is adapted from **egg rolls**, JLPT N1–N5 vocabulary deck, v3.5 source repository:
https://github.com/5mdld/anki-jlpt-decks
Source file: `deck-source/notes.csv`
https://raw.githubusercontent.com/5mdld/anki-jlpt-decks/main/deck-source/notes.csv

License: Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). Full license retained as `eggrolls-LICENSE`.

Changes: converted TSV/Anki fields to JSON-in-JavaScript, retained simplified Chinese definitions, cleaned HTML and sound markers, removed all audio and media, selected lexical fields and up to three associated examples, sorted by source order, retained stable UUID-based IDs. The examples are source dataset content, not newly authored by this app. The source creator states content includes public resources and personal compilation; attribution and provenance are preserved, not a claim of independently auditing each sentence's origin.

Noncommercial restriction applies to this vocabulary data and its adaptation. A GPL license on the application code does not override it. Do not market the bundled dataset as a commercial or paid product without separate permission.

## Kanji

`data/kanji.js` is adapted from https://github.com/davidluzgouveia/kanji-data, `kanji.json`.
Retained fields: character, stroke count, school grade, JLPT study level, English KANJIDIC meanings, on-readings, kun-readings. WaniKani fields are **not** included.

Underlying dictionary: **KANJIDIC2**, copyright Electronic Dictionary Research and Development Group (EDRDG), https://www.edrdg.org/wiki/index.php/KANJIDIC_Project
License: **CC BY-SA 4.0**, https://www.edrdg.org/edrdg/licence.html . An offline copy of that statement is included as `EDRDG.html`. Kanji adaptation is distributed under CC BY-SA 4.0. Update dictionary snapshots reasonably when redistributing future versions, in line with EDRDG's license statement.

JLPT level classification attribution: **Jonathan Waller**, https://www.tanos.co.uk/jlpt/ , Creative Commons BY as identified by the upstream project. These levels are unofficial study classifications.

Changes: selected entries with common-use school grades or a JLPT tag, removed unused and WaniKani fields, flattened field names, added stable character-based IDs and sorted entries. Meanings remain English. Related Chinese word displays are drawn from the separate egg rolls vocabulary adaptation, under its own license.

Upstream field documentation: `kanji-data-README.txt`.

## External reference links

https://www.jlpt.jp/e/faq/ — official explanation of the current test and why a complete Test Content Specifications list is not published. Links are references, not redistributed JLPT examination questions. All fixed reading passages and comprehension questions in this app were independently written for KotobaPath.

## Version 1.2.0 additions

`data/expansion-source.json` and the authored educational additions emitted by `data/expansion.js` (50 phrase entries, 180 grammar entries, 23 contrast lessons, 20 readings with questions, 83 usage exercises, 60 cloze input exercises, 40 ordering sentences, 10 writing tasks): KotobaPath contributors, CC BY4.0. The 60 new cloze items reuse the 60 sentence-context exercise materials in another answer format. They are not presented as separate source texts.

The 227 added Chinese kanji glosses accompany the existing KANJIDIC2 adaptation; this combined kanji adaptation retains CC BY-SA4.0 and EDRDG attribution. English source glosses and readings remain intact.

`sync-core.js`, content build/audit tools and added tests: GPL-3.0-or-later. Original runtime and data licenses above continue to apply.
