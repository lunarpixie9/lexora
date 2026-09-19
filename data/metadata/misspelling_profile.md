# Misspelling Corpora Profile (Birkbeck, Holbrook, Aspell, Wikipedia)

Status: DOWNLOADED and VERIFIED (2026-09-19)
Raw location: `data/raw/misspellings/`
Processed location: `data/processed/misspellings/`
Parser: `scripts/data/parse_misspellings.py`

## Source

- Compiler: Roger Mitton, Birkbeck, University of London
- Page: https://titan.dcs.bbk.ac.uk/~ROGER/corpora.html
- Archival copy: Oxford Text Archive, handle 20.500.12024/0643
  (license stated there: CC BY-NC-SA 3.0)
- The Birkbeck mirror page does not restate a license. We treat all
  five files as CC BY-NC-SA 3.0 (the OTA record) and cite Mitton.

Note: the corpora page links the main Birkbeck file as `missp.dat`,
not `birkbeck.dat` (that URL returns 404).

## Files downloaded

| File | Bytes | Encoding | Contents |
|---|---|---|---|
| `missp.dat` | 368,933 | pure ASCII | Birkbeck corpus: 36,133 misspellings of 6,136 target words |
| `holbrook-missp.dat` | 24,597 | pure ASCII | Holbrook extracted errors: 1,791 entries for 1,200 targets, with frequencies |
| `holbrook-tagged.dat` | 186,633 | pure ASCII | Holbrook running text with inline `<ERR>` tags |
| `aspell.dat` | 9,326 | pure ASCII | GNU Aspell test set: 531 misspellings of 450 words |
| `wikipedia.dat` | 43,848 | pure ASCII | Wikipedia common misspellings: 2,455 misspellings of 1,922 words |
| `corpora.html` | 6,020 | — | Saved copy of the source page (provenance) |

Total: 6 files, ~640 KB. All counts above were reproduced by our
parser and match the figures published on the source page exactly.
No corrupted or unreadable files.

## Format (verified by inspection)

Birkbeck-style `.dat` files:

```
$target_word
misspelling1
misspelling2
$next_target
...
```

- A line beginning with `$` introduces the correct word; every
  following line until the next `$` is one observed misspelling.
- Spaces inside multi-word items are encoded as `_`
  (e.g. `$Los_Angeles` / `Las_Angles`, `$a_bit`).
- `holbrook-missp.dat` only: each misspelling line ends with a space
  and an integer frequency (`And 9`, `Bankg 4`). The other files have
  no frequency column (each entry is an implicit frequency of 1).
- `$?` marks a misspelling whose intended target could not be
  determined (20 entries in Holbrook).
- Real-word errors are present (e.g. `Boy`, `And`, `grow`, `ruth`
  appear as misspellings of other words), so a dictionary lookup alone
  cannot detect every error in this data.

`holbrook-tagged.dat` is plain running text from the children's
writing, organised as four numbered sections and headed by writer name
and page number of the original book (`NIGEL THRUSH page 48`). Errors
are marked inline:

```
My <ERR targ=sister> siter </ERR> <ERR targ=goes> go </ERR> to Tonbury.
```

- 18 distinct child writers are identifiable from headings.
- 2,600 tagged error occurrences (the extracted file collapses these
  to 1,791 unique target/misspelling pairs with frequencies summing to
  2,598; the 2-count difference is a minor inconsistency in the source
  files, not a parsing error).
- 189 occurrences involve multi-word targets or misspellings
  (`some times` -> `sometimes`, `bell ringing` -> `bellringing`), so
  the tagged file also captures word-boundary errors, not just
  character-level ones.
- Original punctuation and capitalisation are preserved.

## What we can genuinely extract

| Field | Available in | Notes |
|---|---|---|
| Target (correct) word | all files | `$` lines |
| Observed misspelling | all files | one per line |
| Frequency | `holbrook-missp.dat` only | integer suffix |
| Sentence context | `holbrook-tagged.dat` only | full surrounding text |
| Writer identity | `holbrook-tagged.dat` only | 18 named children (from a 1964 book, so names are already public) |
| Age | none | Not in the data. The source describes Holbrook writers as secondary-school children in their next-to-last year; Birkbeck as a mix of schoolchildren, students and adult literacy learners. Per-entry age is NOT available. |
| Error type (omission / substitution / reversal / phonetic) | none | Not labelled. These must be derived by our own comparison logic — which is exactly what makes this corpus a useful test bed for it. |
| Dyslexia status | none | Not a clinical dataset. |

## Processed outputs

`scripts/data/parse_misspellings.py` writes CSVs (UTF-8, header row)
without touching the raw files:

- `birkbeck.csv` — `target,misspelling,freq` (freq always 1)
- `holbrook_missp.csv` — `target,misspelling,freq`
- `holbrook_tagged_errors.csv` — `target,misspelling` (one row per occurrence, in text order)
- `aspell.csv`, `wikipedia.csv` — `target,misspelling,freq`

Underscores are converted back to spaces in the CSVs.

## Intended Lexora use

- Validate the spelling-error engine (edit distance, grapheme-level
  comparison, phonetic similarity, rule-based reversal detection)
  against real misspellings rather than invented ones.
- Holbrook is the priority subset: real schoolchildren's own writing,
  with frequencies and sentence context.
- Birkbeck (larger, mixed population) is a secondary stress-test set.
- Aspell/Wikipedia are adult/typing-error sets; useful only as
  negative controls (typos, not literacy errors).

## Limitations

- British English, 1960s-era vocabulary for Holbrook; not Indian
  English and not children aged 6-10.
- No per-entry age, no error-type labels, no dyslexia labels.
- Non-commercial license (CC BY-NC-SA 3.0).
