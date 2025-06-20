---
title: "Publications"
# description: "Research publications and academic articles organized by year with citation metrics and open access indicators."
---

<div class="publications-container">
<div class="publications-header">
<div id="loading-message" class="loading-message">
<div class="loading-spinner"></div>
<span>Loading publications...</span>
</div>

<div id="publications-stats" class="publications-stats" style="display: none;">
<div class="stat-item">
<span class="stat-number" id="total-papers">0</span>
<span class="stat-label">Papers</span>
</div>
<div class="stat-item">
<span class="stat-number" id="total-citations">0</span>
<span class="stat-label">Citations</span>
</div>
<div class="stat-item">
<span class="stat-number" id="h-index">0</span>
<span class="stat-label">H-Index</span>
</div>
<div class="stat-item">
<span class="stat-number" id="open-access-count">0</span>
<span class="stat-label">Open Access</span>
</div>
</div>

<div id="publications-filters" class="publications-filters" style="display: none;">
<button class="filter-button active" data-filter="all">All</button>
<button class="filter-button" data-filter="journal">Journal Articles</button>
<button class="filter-button" data-filter="conference">Conference Papers</button>
<!-- <button class="filter-button" data-filter="book">Book Chapters</button> -->
<button class="filter-button" data-filter="open-access">Open Access</button>
<!-- <button class="filter-button" data-filter="highly-cited">Highly Cited</button> -->
</div>
</div>

<div id="disclaimer" class="disclaimer">
<p><strong>Data Attribution:</strong> Publication metrics and bibliographic data are sourced from the <a href="https://help.openalex.org/hc/en-us/articles/24396686889751-About-us" target="_blank">OpenAlex</a> open scientific knowledge base. For the most complete and current publication record, please refer to my <a href="https://orcid.org/0000-0002-4540-512X" target="_blank">ORCID profile</a>.</p>
</div>

<div id="publications-content"></div>

<div id="error-message" class="error-message" style="display: none;">
<p>Error loading publications. Please try again later.</p>
<button onclick="loadPublications()" style="margin-top: 10px; padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
Retry
</button>
</div>
</div>
