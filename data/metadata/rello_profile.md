# Rello et al. "Predicting Risk of Dyslexia" Dataset Profile

Status: DOWNLOADED AND VERIFIED (2026-09-19) via Kaggle CLI
(`scripts/data/download_kaggle.py rello`); schema in `rello_schema.json`
(`scripts/data/inspect_rello.py`).

Role in Lexora: a SEPARATE real-data ML validation experiment. It is
not a source of English text, not a source of Lexora's own features,
and not part of the core screening pipeline.

## Access

Kaggle requires a logged-in account (free; access class B). Downloaded
with the Kaggle CLI using a locally stored API token
(`~/.kaggle/kaggle.json`, never in the repository).

## Exact dataset

- Name: "Predicting Risk of Dyslexia - PLOS ONE" (Kaggle title)
- Kaggle URL: https://www.kaggle.com/datasets/luzrello/dyslexia
- Archived DOI: https://doi.org/10.34740/kaggle/dsv/1617514
- Uploader: luzrello (Luz Rello, first author of the paper)
- Version: 1 (last modified 2020-11-04)
- License: CC BY 4.0 (verified from the dataset page metadata; the
  PLOS ONE article is also CC BY)
- Download size: 399,262 bytes (~0.4 MB) — verified from page metadata
- Paper: Rello L., Baeza-Yates R., et al. "Predicting risk of dyslexia
  with an online gamified test." PLOS ONE 15(12): e0241687, 2020.
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0241687

## What the paper states (verified from the open-access article)

- Test language: SPANISH (the Dytective gamified test, reviewed for
  neutrality across Spain, Chile and Argentina)
- Main dataset: 3,644 participants — 392 with dyslexia (10.7%),
  3,252 without
- Second dataset (tablet, age-customised versions): 1,395
  participants, 10.6% with dyslexia
- Ages: 7–17
- 196 features: 4 demographic (gender, native-language status,
  language-subject performance, age) + 192 performance features
  (32 questions × Clicks, Hits, Misses, Score, Accuracy, Missrate)
- Label: binary dyslexia diagnosis

## Verified from the downloaded files (2026-09-19)

`data/raw/rello/dyslexia.zip` — 399,262 bytes (matches page metadata
exactly), CRC clean. Contains two CSVs, extracted beside the zip:

| File | Bytes | Rows | Cols | Dyslexia = Yes | Matches paper |
|---|---|---|---|---|---|
| `Dyt-desktop.csv` | 2,034,159 | 3,644 | 197 | 392 (10.8%) | main dataset: 3,644 / 392 |
| `Dyt-tablet.csv` | 992,412 | 1,395 | 197 | 148 (10.6%) | second dataset: 1,395 / 10.6% |

Format: semicolon-delimited, CRLF, ASCII, header row, no ragged rows,
no empty cells.

Column order (identical in both files): `Gender`, `Nativelang`,
`Otherlang`, `Age`, then for q = 1..32 the six columns `Clicks{q}`,
`Hits{q}`, `Misses{q}`, `Score{q}`, `Accuracy{q}`, `Missrate{q}`
(192 performance features), then the label `Dyslexia`.

- `Gender`: `Male` / `Female`
- `Nativelang`, `Otherlang`, `Dyslexia`: `Yes` / `No` (strings, must be
  encoded)
- `Age`: integer string 7–17
- performance columns: numeric strings; `Clicks` 0–430, `Hits` 0–73,
  `Misses` 0–167, `Score` 0–378

### Data-quality findings (must be handled in preprocessing)

1. **`Accuracy` / `Missrate` have lost their leading `0.` in some
   cells.** Values like `875`, `25`, `125` appear (desktop: 1,841
   Accuracy + 1,967 Missrate cells in 1,593 rows; tablet: 680 + 602 in
   521 rows). Verified: where `Accuracy <= 1` it equals `Hits/Clicks`
   (111,485 of 112,249 desktop cells within 0.002; tablet 36,186/36,186),
   and every out-of-range value equals `Hits/Clicks` once `0.` or `0.0`
   is restored (e.g. `875` = 0.875, `25` = 0.25 or 0.025). Fix: recompute
   `Accuracy = Hits/Clicks` and `Missrate = Misses/Clicks` (0 when
   `Clicks = 0`) rather than trusting the stored columns.
2. **`Dyt-tablet.csv` uses the literal `NULL`** in 45,650 performance
   cells; every tablet row has at least one. Affected questions: 13,
   18–21, 24–32 (age-customised test versions omit items). Treat as
   missing (XGBoost handles NaN natively); never `NULL` in desktop.
3. **`Nativelang` is encoded inconsistently between files**: desktop
   is 73% `No`, tablet is 96% `Yes`. The paper does not explain this;
   do not pool the two files on that column without a caveat, and
   consider dropping it for the pooled experiment.
4. Class imbalance ~10.7% positive in both files — use stratified CV
   and report recall/precision for the positive class, as the paper does.

## Planned use (validation experiment only)

1. Train XGBoost on the real labelled features; evaluate with
   stratified cross-validation, reporting recall for the dyslexia
   class (the paper's primary metric) alongside precision/F1.
2. Run SHAP on the trained model to show that the explainability layer
   produces sensible, feature-level attributions on real diagnosed
   data.
3. Report the result in the project write-up as evidence that the
   XGBoost + SHAP methodology behaves reasonably on a genuine clinical
   dataset — explicitly separate from the Lexora screening indicator,
   which uses different features.

The experiment must be reported with the caveat that the feature
semantics (clicks/hits/misses in a Spanish game) do not map to
Lexora's spelling/reading/speech features, so no accuracy figure from
this experiment transfers to Lexora's own indicator.

## Reproduce

`python scripts/data/download_kaggle.py rello` then
`python scripts/data/inspect_rello.py`. Raw CSVs are never modified.
