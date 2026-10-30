# Lyrics Lens

An interactive NLP research dashboard examining how two sentiment models interpret the same lyrics and how repeated-line removal changes their outputs.

This project extends a Digital Humanities coursework analysis. The website reads saved research outputs; it does not run a live model or analyse audio.

## Features

- Search and filter 927 analysed song records.
- Compare VADER and DistilBERT scores and labels.
- Switch between full text and repeated-line-removed outputs.
- Inspect per-record sensitivity and the 20 reviewed pilot cases.
- Download filtered scores without distributing full lyrics.
- Read methodology, provenance and limitations in expandable sections.

## Main findings

| Research diagnostic                                  | Result                                     |
| ---------------------------------------------------- | ------------------------------------------ |
| Score correlation                                    | Pearson r = 0.282                          |
| Same-polarity agreement                              | 512 / 912 VADER non-neutral records, 56.1% |
| VADER label changes after repeated-line removal      | 106 / 927, 11.4%                           |
| DistilBERT label changes after repeated-line removal | 104 / 927, 11.2%                           |

Model agreement is not accuracy. Repeated-line removal changes context and chunk boundaries as well as repetition. Clustering remained weakly separated; LSA improved K-means seed stability without establishing distinct lyric themes.

## Run locally

Python is needed only as a local static file server, not for model inference.

1. Open this project folder in VS Code.
2. Open **Terminal → New Terminal**. Confirm that `index.html` is in the terminal's current folder.
3. Run:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

4. Open http://127.0.0.1:8000 in a browser.
5. Stop the server with Ctrl+C when finished.

On Windows, use `py` instead of `python` if that is how Python is installed. If port 8000 is occupied, choose 8001 in both the command and browser address.

Do not double-click index.html: browsers can block the local `fetch('data.json')` request when using a file URL. VS Code Live Server is another option if already installed.

## Files

| File                              | Responsibility                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `index.html`                      | Page shell, navigation and detail drawer                                       |
| `styles.css`                      | Typography, colours, layout and responsive rules                               |
| `app.js`                          | Views, filters, SVG charts, details and CSV export                             |
| `data.json`                       | Saved metadata, model outputs, reviewed annotations and clustering diagnostics |
| `analysis/Lyrics_Lens_Main.ipynb` | Python research workflow; separate from website runtime                        |
| `LEARNING_GUIDE.md`               | Guided local edits and publishing milestones                                   |

All website paths are relative, so the app can run from a GitHub Pages project subdirectory. No JavaScript build step, API key or npm installation is needed. Fonts are requested from Google Fonts; system fonts are used as fallback.

## Analysis and provenance

The workflow uses pandas, NumPy, scikit-learn, NLTK/VADER, Hugging Face Transformers, PyTorch and langdetect. The model is `distilbert/distilbert-base-uncased-finetuned-sst-2-english`, revision `714eb0f`.

The supplied Spotify metadata file contains 9,999 rows. The original sample selected 50 records per album/version year from 2003–2022 using the dataset's Popularity field. The exact Kaggle dataset URL and original popularity snapshot date still need to be documented. Those dates do not establish historical popularity or original song release years.

Of 1,000 selected records, 988 contained retrieved lyrics. Deduplication, language screening and observed text-quality exclusions produced the 927-record analysis snapshot dated 2026-10-27. Every retained lyric has not been independently verified. Full lyrics and raw CSV files are intentionally excluded from this web source package pending source licence verification.

The notebook documents the analysis, but reproducing model inference requires the separately retained input CSV and a suitable Python environment. It does not require downloading the dataset to run the website. Exact dependency versions from the original user environment were not recorded.

Both sentiment models received the same decoded, uncased token blocks of up to 384 tokens; outputs were token-count weighted. Losing original capitalization and splitting context are methodological limitations. VADER compound and transformed DistilBERT probabilities are different score definitions.

The 20 pilot labels were drafted with AI assistance and reviewed by the project author. Their agreement proportions are not an independent blinded accuracy benchmark. AI also assisted with code development and documentation; the author executed the analysis and reviewed outputs.

## GitHub Pages

Publication is a separate milestone after local review. Intended repository name: `lyrics-lens-dashboard` (availability not yet confirmed).

For a simple branch-based Pages deployment, upload the project contents with `index.html` at the repository root, then select the appropriate branch and `/ (root)` folder under **Settings → Pages**. Hosting availability depends on the repository/account configuration. Do not upload the enclosing ZIP as a substitute for its contents.

## References

- [VADER documentation](https://github.com/cjhutto/vaderSentiment)
- [DistilBERT model card](https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english)
- [scikit-learn TruncatedSVD](https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.TruncatedSVD.html)

Code reuse licensing and raw dataset/lyric rights are separate matters. This repository currently makes no claim that raw lyrics are redistributable.

## Year explorer

The overview includes separate VADER and DistilBERT annual positive-share charts, a full/unique-line switch and a count table. Percentages use all retained records within each album/version metadata year. Lines connect observed annual values without smoothing.

## Exploration updates

- Filter songs by album/version metadata year, combined with search and model filters.
- Select an annual chart point or table year to open all records for that year using the selected lyric version.
- Share the current URL to restore filters, page, lab tab and open song. Use Copy link, including inside song details.
- Song detail summaries follow the selected text version and include a Full-to-Unique score change chart.
- CSV exports include album/version year.
- Summary indicators and sensitivity bars read the saved dataset statistics; score means are calculated from records.

Research reproduction gaps are tracked in [REPRODUCIBILITY.md](REPRODUCIBILITY.md). Browser acceptance steps are in [VERIFICATION.md](VERIFICATION.md).
