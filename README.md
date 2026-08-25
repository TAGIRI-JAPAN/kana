# TAKANE-SHIKI KANA STUDY

A site for learning to read hiragana and katakana, for Sinhala- and
English-speaking learners. Rules, a printable chart, and a practice drill in
one place. Static — no build step, no server code, no dependencies.

---

## Pages

| Page | What it is |
|---|---|
| `index.html` | Home — the three ways in |
| `guide.html` | The rules: what the two kana are, beats, ゛゜, small ゃゅょ, small っ, long vowels, romaji systems, plus the look-alike table |
| `chart.html` | All 104 kana with romaji and Sinhala readings. Built to be printed |
| `numbers.html` | Numbers, counters, prices and the clock — rules plus six practice modes |
| `drill.html` | The practice drill — twelve question types |

The header, language switch, settings button and mastery meter are the same on
all four, and the learner's language, colour theme, text size, and day streak
follow them between pages.

### Appearance

The gear icon opens a settings sheet with three appearance controls, stored in
`takane:profile` and applied as attributes on `<html>`:

| Attribute | Values |
|---|---|
| `data-theme` | `enji` (maroon, default) · `ai` (indigo) · `matcha` (green) · `sumi` (ink) |
| `data-scheme` | `auto` (follows the device) · `light` · `dark` |
| `data-size` | `m` · `l` · `xl` |

A theme swaps four variables — `--accent`, `--accent-deep`, `--accent-dk` and
the three golds. Dark mode is one shared neutral base that keeps whichever
accent is active, so adding a fifth colour means adding one block, not
duplicating the sheet. To add one: copy the `html[data-theme="ai"]` block in
`style.css`, then add the name and a swatch colour to `THEMES` in
`site.js`.

## Files

```
style.css   all styling (maroon + gold, dark mode, print rules)
site.js     shared: data loading, language, nav, storage, mastery strip
home.js     home page (nothing to render — just the shared chrome)
guide.js    renders guide.html and chart.html
numbers.js  numbers and time: reading engine, clock face, practice
app.js      the drill
data-kana.json     104 kana, look-alike groups, sound groups, chart layout
data-words.json    spell words with explanations, quick words, っ ー ん items
data-guide.json    the rules text, in EN / සිංහල / 日本語
data-numbers.json  number exception tables, counters, and the number rules text
data-tips.json     how to tell each look-alike pair apart, plus the number rules
data-i18n.json     every UI string, in the same three languages
pagegen note       the four pages share one header; edit them together
build_single.py    → offline.html (whole site, one offline file)
test.js            data and content checks — no dependencies
audit.js           character integrity, markup, CSS and reading accuracy
ime-test.js        round-trips every kana and word through the romaji converter
num-test.js        asserts every number, counter and clock reading
tips-test.js       every look-alike pair the drill can show must have a tip
qa-test.js         hammers every generator looking for unfair questions
render-test.js     renders all four pages and clicks through the drill
single-test.js     boots the offline build and walks every page and mode
```

**To change what is taught, edit the JSON.** None of the `.js` files contain
Japanese content, and none of them need touching to add a word, fix a Sinhala
reading, or reword a rule.

---

## Publishing to GitHub Pages

1. New repository under the TAGIRI account — e.g. `kana`.
2. Drag **all the files** into the repository. There are no folders to
   preserve, so nothing can be flattened by accident — but do check that
   `index.html` and `data-kana.json` both appear in the file list afterwards.
3. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder
   `/ (root)`.
4. A minute later it is live at `https://<account>.github.io/kana/`.

Nothing else is required — no Actions, no Jekyll config, no `.nojekyll`.

### Local preview

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Opening `index.html` straight from the file manager will **not** work:
browsers block `fetch()` on `file://`, so the JSON never loads. That is what
`offline.html` is for — the **whole site** in one self-contained file,
all four pages included, with the navigation handled by a small in-page
router. For a USB stick, an email attachment, or a classroom with no internet.
Rebuild it after any data change:

```bash
python3 build_single.py
```

### Tests

```bash
node test.js          # data, translations, links, content completeness
node audit.js         # mojibake, entities, markup, CSS vars, reading accuracy
node ime-test.js      # romaji -> kana conversion
node num-test.js      # number, counter and time readings
node tips-test.js     # explanation coverage
node qa-test.js       # 48,000 generated questions, checked for fairness
node render-test.js   # needs: npm install jsdom
node single-test.js   # needs: npm install jsdom
python3 visual-test.py  # needs: pip install playwright && playwright install chromium
```

`test.js` checks that all three languages carry the same keys, that every
`data-t` in the markup and every `t("…")` in the scripts resolves, that no
page links to a file that does not exist, that the chart holds all 46 basic
kana without duplicates, and that the guide has the same number of paragraphs
in each language. `render-test.js` boots each page in a DOM, plays through
several drill modes, completes a spelling question, and switches language
three times. `single-test.js` does the same against the offline build and
also checks that no link inside it points at a file that is not there. Both
fail on any console error.

`audit.js` looks for the things that quietly corrupt text: replacement
characters, HTML entities that would print literally, raw `<` `>` `&` in data
that gets inserted as HTML, half-width katakana, stray Sinhala joiners, lone
surrogates, duplicate HTML attributes, unbalanced tags, CSS variables that are
used but never defined, and any theme block missing a colour. It also derives
every word's reading from its kana and compares it with the stored rōmaji.

`visual-test.py` opens the site in a real browser at 360px and 1000px in all
three languages, walks every drill mode, and fails on content wider than the
viewport, text clipped inside its own box, or anything sticking out past the
right edge.

---

## Design decisions, so future edits don't undo them

- **Distractors are look-alikes, not same-row kana.** シ pulls ツ ソ ン;
  ぬ pulls め ね れ わ. Same-row options (カ キ ク ケ コ) are too easy to be
  practice. The groups live in `look_h` / `look_k`, and `guide.html` renders
  its look-alike table from those same arrays — so the page and the questions
  can never disagree.
- **In listen mode the options carry no romaji.** Adding it back would let a
  learner answer without reading the kana at all.
- **を and お never appear as options for each other** (`conflict` in
  `kana.json`) — を reads *o*, so both would be defensible.
- **In "Both" script mode, an option is never the answer's own kana in the
  other script.** か and カ on one screen means two right answers.
- **Romaji cues spell out the kana**, so `TOUKYOU`, not `TOKYO`. The learner
  has to be able to see the う they are being asked to place.
- **`ノオト` is a legitimate wrong answer for `ノート`** — same sound, wrong
  spelling. That is the whole point of the っ ー ん unit; do not "fix" it.
- **Fonts are BIZ UDPGothic / Zen Kaku Gothic New**, matching the printed
  materials — and JFT-Basic renders in gothic, so learning kana in mincho
  would teach the wrong letterforms.
- **No handwriting practice**, consistent with the kanji drills: the test is
  CBT.
- **"I don't know" counts as wrong.** It reveals the answer and pushes the kana
  back into rotation sooner. A guessed right answer at 25% odds would otherwise
  be recorded as knowledge.
- **Dictation hides the romaji cue.** Showing it would make the mode identical
  to spelling.
- **The romaji converter is built from the kana table**, not from a second
  hand-written list, so it cannot drift. `ime-test.js` round-trips all 102
  quizzable kana and all 83 words: kana → typing → kana must return the
  original. It also pins the three rules that matter — `gakkou` → がっこう,
  `konnichiwa` → こんにちわ (not こんいちわ), `no-to` → ノート.
- **The drill page shows only the mode lane.** Script, range and session length
  sit in the settings sheet with the current choice summarised in one line, so
  a beginner meets a question rather than twenty chips.

## PDF

Every reference page — the chart, the kana rules, the number rules — has a
**Download PDF** button. It opens the browser's own print dialog, where
"Save as PDF" is one tap on a phone and one click on a desktop. This is the
route to prefer: the learner's browser already has the web fonts loaded, so the
PDF comes out in BIZ UDPGothic and Noto Sans Sinhala exactly like the screen.

The practice sections never print. Only the reference material does.

To produce PDF **files** to email or hand out:

```bash
pip install playwright && playwright install chromium
python3 build_pdf.py ja en si
```

Run it on a machine with internet access, or the web fonts will not load and
the Sinhala will come out as empty boxes. Open one file and check before
sending anything to the school.

### Explanations

A wrong answer gets a labelled panel, using the same three labels as the
printed material. Which one appears depends on the mistake:

- **くらべる / Telling them apart** — the learner picked a look-alike. The panel
  shows the two kana side by side, the one they chose marked in red, and
  explains how to distinguish them. This is the reason the distractor exists,
  so it is the thing worth saying.
- **ルール / Rule** — for the っ ー ん unit and every numbers question, the rule
  the question turns on: the sound change after 3, 6 and 8; why a counter takes
  いっ / ろっ / はっ; the three unpredictable hours; ふん versus ぷん.

Both come from `data-tips.json`, and `guide.html` renders the same text under
its look-alike table — so the page a learner reads and the panel they get after
a mistake can never say different things. `tips-test.js` enumerates every
distractor pair the generator can produce and fails if any lacks a tip;
coverage is currently 100% of 330 pairs.

### What makes a question fair

`qa-test.js` generates around 48,000 questions across every generator and fails
on any of these:

- fewer than four options, or a duplicate among them
- more than one option that is correct
- an option that is the answer kana written in the other script
- a chart option that is already visible in the row on screen
- **a distractor that is a second acceptable reading.** 4円 is よえん but よんえん
  is also said; 7人 is しちにん but ななにん is also said; 30分 is both 半 and
  さんじゅっぷん. These live in `alsoOk` in `numbers.json` and can never appear
  as a wrong answer.

Word distractors are also matched on beat count where possible (94% of the
time), so the answer cannot be found by counting mora instead of reading.

### Numbers and time

Readings are **generated from rules**, not stored as a list, exactly the way
the verb material works: `data-numbers.json` holds the digits, the six sound
changes (300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3000 さんぜん,
8000 はっせん, 10000 いちまん) and one exception table per counter. Everything
else is composed. `num-test.js` pins ~120 known readings and then sweeps every
number to 1000, every counter to its maximum, and all 720 clock times, failing
on anything that is not pure kana.

Three decisions worth keeping:

- **The clock question only uses five-minute steps.** An analog face cannot
  show the difference between 9:00 and 9:01, so those minutes would make the
  question unanswerable. Odd minutes still appear where the time is given as
  text.
- **A clock question never offers the same time twice.** 5:30 is both ごじはん
  and ごじさんじゅっぷん, so both would be correct.
- **Wrong answers are the mistake the rule predicts** — さんひゃく for 300,
  よんにん for 24人, the regular form of an irregular counter — not random noise.

### Storage

Namespaced from the start, so a second course can be added later without a
collision or a data migration:

```
takane:profile      language + day streak   (shared by any future course)
takane:kana:stat    per-kana correct/wrong  (this course only)
```

The drill's old `takane-kana-v3` key is migrated automatically the first time
a returning learner opens the site.

---

## Open item

The Sinhala is a **first draft and has not been checked by a native
speaker** — the kana readings, the word meanings, and the rules text on
`guide.html`. One known limitation: Sinhala has no /z/, so the ざ row reuses
the さ row letter (ස), and with dakuten enabled two options in "Read it" mode
can show identical Sinhala. Worth resolving with the partner school in the
same pass as the vocabulary materials.
