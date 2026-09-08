# Strategy Similarity Interactive Violin Site

This is an offline static website for comparing semantic similarity scores across models and Strategies 0-3.

## How to View

1. Download or copy the entire `strategy_similarity_interactive_violin_site` folder.
2. Keep `index.html` and the `details/` directory in their relative locations.
3. Open `index.html` in a browser, or drag it into Chrome, Edge, or Firefox.
4. Select a model on the page. Click a point in a chart to open the corresponding molecule-experiment detail page.

No Python, web server, or additional dependency is required.

## Directory Layout

```text
strategy_similarity_interactive_violin_site/
├─ index.html       # Main page and interactive violin charts
├─ details/         # Detail pages linked from chart points
└─ README.md        # This guide
```

## Chart Meaning

- Horizontal axis: semantic similarity score.
- Vertical axis: Strategy 0, 1, 2, or 3.
- Each violin: the score distribution for one model and strategy.
- Each point: one molecule-experiment sample.
- Point connections: the change for the same sample across strategies.

The detail pages contain model outputs, reference information, predictions, experimental conditions, and scoring information for individual samples.

## Important Sharing Note

Share the complete folder rather than `index.html` alone. The `details/` directory currently contains 650 pages, all of which are referenced by the main page. Removing them will make the corresponding chart links unusable.
