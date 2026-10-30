# Lyrics Lens — NLP Research Dashboard

**How differently can two sentiment models read the same song?**

Lyrics Lens is an interactive dashboard for exploring **927 English-screened song records**. It compares VADER and DistilBERT, examines sensitivity to repeated-line removal, and connects annual sentiment patterns to individual song records.

**[Open the dashboard](https://yun-1012.github.io/lyrics-lens-dashboard/)** · **[Explore the Python notebook](analysis/Lyrics_Lens_Main.ipynb)**

Built from a Digital Humanities coursework project, with further data auditing, full-text chunked inference and interactive exploration. The website displays saved analysis outputs; it does not run live NLP inference or analyse audio.

## Explore the dashboard

| View | What you can do |
| --- | --- |
| **Overview** | Inspect research indicators, the model-score scatter plot and selected disagreement cases. Compare annual positive shares for 2003–2022. |
| **Song explorer** | Search by song or artist; combine year and model-result filters; switch text versions; sort, paginate and export filtered results. |
| **Song details** | Compare full-text and unique-line scores, view processing sensitivity and pilot annotations, and copy a link to a record. |
| **Model lab** | Examine model agreement, repeated-line sensitivity and the reviewed annotation pilot. |
| **Methods** | Review sample construction, preprocessing, model definitions and exploratory clustering. |

Annual chart points and table years open the corresponding song records. URL parameters preserve exploration settings, including filters and the selected song.

### A quick walkthrough

1. Open **Everytime** from the overview to inspect a strong model disagreement.
2. Search for **Rather Be** and compare VADER's full-text and unique-line results: its label changes from negative to positive.
3. Switch the annual charts between **Full lyrics** and **Without repeated lines**, then select a year to inspect its records.
4. Export the filtered scores from **Song explorer**.

## Key findings

| Diagnostic | Result | Interpretation |
| --- | --- | --- |
| Score correlation | **Pearson r = 0.282** | A weak positive linear relationship between the two score series. |
| Same-polarity agreement | **512 / 912 = 56.1%** | Excludes 15 VADER-neutral records because DistilBERT has no neutral class. |
| Opposite polarity | **400 records** | One model assigns positive and the other negative. |
| VADER label changes after repeated-line removal | **106 / 927 = 11.4%** | Classification is sensitive to the text version for a subset of records. |
| DistilBERT label changes after repeated-line removal | **104 / 927 = 11.2%** | Sensitivity also occurs with the transformer model. |

Agreement measures whether predictions match, rather than whether they are correct. Removing repeated lines also changes text length, context and chunk boundaries.

The full-text results classify **680 records as positive with VADER**, compared with **408 with DistilBERT**. The model choice therefore substantially changes the apparent sentiment distribution in this dataset.

Annual charts show the **share labelled positive**, using all retained records in each year as the denominator. They use album/version metadata years and connect observed values without smoothing.

## Data and analysis

### Sample preparation

The supplied Kaggle-derived Spotify metadata contains **9,999 rows**. The original workflow selected up to 50 records per album/version year from 2003–2022, ranked by the dataset's **Popularity** field.

| Stage | Records |
| --- | ---: |
| Selected metadata records | 1,000 |
| Lyrics retrieved | 988 |
| After record deduplication and text-quality checks | 935 |
| After language screening | 928 |
| After a final identified lyric mismatch exclusion | **927** |

Checks included duplicate URIs, recording identifiers (ISRCs), same-artist identical texts, language screening and observed lyric-quality issues. The saved analysis snapshot is dated **27 October 2026**.

### Sentiment pipeline

- Preserve raw text and create separate cleaned and unique-line versions. Unique-line processing ignores case and keeps the first occurrence of each repeated line.
- Tokenize each version and split it into non-overlapping blocks of up to **384 tokens**.
- Give both models the same decoded blocks and aggregate block scores using token-count weights.
- **VADER:** weighted compound score; positive at ≥ 0.05, negative at ≤ −0.05, otherwise neutral.
- **DistilBERT:** `distilbert/distilbert-base-uncased-finetuned-sst-2-english`, revision `714eb0f`. Transform each block's positive output as `2 × P(positive) − 1`, then aggregate; non-negative song scores are positive.

The models were used for inference, not trained from scratch on these lyrics. Their score definitions differ, even though both displayed ranges are −1 to +1.

### Reviewed annotation pilot

A random pilot of **20 records** received AI-drafted labels and reasons, followed by author review: **10 positive, 5 negative and 5 mixed**. Among the 15 positive/negative cases, VADER matches 12 and DistilBERT matches 10. This is a small, AI-assisted reference comparison, not an independent accuracy benchmark. Mixed cases are excluded from the binary comparison.

### Exploratory clustering

TF-IDF and K-means were evaluated for **K = 2–8** across three K-means seeds. LSA with 50, 100 and 200 dimensions was also explored.

| K = 2 representation | Original-space cosine silhouette | K-means seed stability (ARI) |
| --- | ---: | ---: |
| TF-IDF | 0.00738 | 0.681 |
| LSA, 50 dimensions | 0.00746 | 0.920 |

LSA improved consistency across K-means initializations, while separation remained weak. The dashboard therefore does not present the clusters as distinct, verified lyric themes.

### Data scope and reproducibility

- Popularity reflects the supplied dataset field, not verified historical chart positions. Album/version year is not necessarily the original release year.
- The exact Kaggle source URL and popularity snapshot date remain undocumented; these are outstanding provenance tasks.
- Not every retained lyric has been independently verified. The uncased tokenizer removes capitalization cues, and chunking can split context.
- The notebook documents the research workflow, but rerunning inference requires the separately retained input CSV and a suitable Python environment. Exact dependency versions from the original environment were not recorded.
- Full lyrics and raw lyric CSVs are not included in this repository. The website and CSV exports contain metadata and analysis results.

## Technology

| Layer | Tools |
| --- | --- |
| Data preparation and analysis | Python, pandas, NumPy, langdetect |
| Sentiment inference | NLTK/VADER, Hugging Face Transformers, PyTorch |
| Text representation and clustering | scikit-learn: TF-IDF, K-means, TruncatedSVD/LSA |
| Interactive interface | HTML, CSS, JavaScript, SVG |
| Hosting | GitHub Pages |

The frontend needs no API key, npm installation or JavaScript build step. Paths are relative for GitHub Pages project hosting. Google Fonts are requested with system-font fallbacks.

## Run locally

Open the folder containing `index.html` and run:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000**. On Windows, use `py` instead of `python` if needed. Stop the server with **Ctrl+C**.

Python serves the static files only; it does not rerun the models. Opening `index.html` directly can block loading `data.json`, so use a local server.

## Repository structure

| Path | Purpose |
| --- | --- |
| `index.html` | Page shell, navigation and song-detail drawer |
| `styles.css` | Typography, responsive layout and record animation |
| `app.js` | Views, search, filters, SVG charts, shareable URLs and CSV export |
| `data.json` | Saved song metadata, predictions, pilot annotations and clustering diagnostics |
| `analysis/Lyrics_Lens_Main.ipynb` | Python analysis workflow |

For site updates, edit the local files, preview them, and commit the changed files to the repository's publishing branch. GitHub Pages then redeploys the site.

## Development and attribution

AI assisted with code development, documentation and initial pilot annotations. The author executed the analysis, reviewed outputs and annotations, and iterated on the dashboard design and behaviour.

- [VADER documentation](https://github.com/cjhutto/vaderSentiment)
- [DistilBERT model card](https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english)
- [scikit-learn TruncatedSVD documentation](https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.TruncatedSVD.html)

Code licensing and dataset/lyric rights are separate. This project does not claim redistribution rights over full lyrics.
