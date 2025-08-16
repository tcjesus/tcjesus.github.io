// Publications loading script - Clean and reliable version
console.log("📚 Publications script initializing...")

let allPublications = []
let isLoading = false
let currentFilter = "all"

// Main initialization
document.addEventListener("DOMContentLoaded", function () {
    console.log("📋 DOM ready, starting publications load...")
    setTimeout(loadPublications, 100)
})

// Main function to load publications
async function loadPublications() {
    if (isLoading) {
        console.log("⏳ Already loading, skipping...")
        return
    }

    isLoading = true
    console.log("🚀 Loading publications...")

    try {
        // Show loading state
        const loadingEl = document.getElementById("loading-message")
        const errorEl = document.getElementById("error-message")

        if (loadingEl) loadingEl.style.display = "flex"
        if (errorEl) errorEl.style.display = "none"

        // Load from cache (includes venue overrides)
        console.log("💾 Fetching cached publications...")

        // Try multiple potential paths for the cache file
        const cachePaths = [
            "/data/openalex-cache.json", // Hugo processed static files
            "/static/data/openalex-cache.json", // Alternative local path
            "./data/openalex-cache.json", // Relative fallback
        ]

        let response = null
        let lastError = null

        for (const path of cachePaths) {
            try {
                console.log(`🔍 Trying cache path: ${path}`)
                response = await fetch(path)
                if (response.ok) {
                    console.log(`✅ Found cache at: ${path}`)
                    break
                } else {
                    console.log(
                        `❌ Cache not found at: ${path} (${response.status})`,
                    )
                    lastError = new Error(`HTTP ${response.status} at ${path}`)
                }
            } catch (error) {
                console.log(
                    `❌ Error fetching from: ${path} - ${error.message}`,
                )
                lastError = error
            }
        }

        if (!response || !response.ok) {
            throw (
                lastError ||
                new Error("Failed to load publications from any cache path")
            )
        }

        const data = await response.json()
        let publications = data.results || []

        console.log(`✅ Loaded ${publications.length} publications`)

        // Filter out thesis and excluded publications
        const originalCount = publications.length
        publications = publications.filter((pub) => {
            // Check if marked for exclusion in venue overrides
            if (pub._venue_override?.exclude) {
                console.log(
                    `🚫 Excluding: ${pub.title || pub.display_name} (${
                        pub._venue_override.reason || "marked for exclusion"
                    })`,
                )
                return false
            }

            // Check for thesis type
            if (
                pub.type_crossref === "dissertation" ||
                pub.type === "dissertation" ||
                pub.type_crossref === "thesis" ||
                pub.type === "thesis"
            ) {
                console.log(
                    `🚫 Excluding thesis: ${pub.title || pub.display_name}`,
                )
                return false
            }

            // Check venue for thesis indicators
            const venue = pub.primary_location?.source?.display_name || ""
            if (
                venue.toLowerCase().includes("dissertation") ||
                venue.toLowerCase().includes("thesis") ||
                (venue.toLowerCase().includes("university") &&
                    (pub.type_crossref === "book" || pub.type === "book"))
            ) {
                console.log(
                    `🚫 Excluding thesis by venue: ${
                        pub.title || pub.display_name
                    }`,
                )
                return false
            }

            return true
        })

        console.log(
            `📊 Filtered: ${originalCount} → ${
                publications.length
            } publications (excluded ${
                originalCount - publications.length
            } thesis/excluded items)`,
        )

        if (publications.length === 0) {
            throw new Error("No publications found after filtering")
        }

        // Store globally for filtering
        allPublications = publications

        // Hide loading
        if (loadingEl) loadingEl.style.display = "none"

        // Display publications
        displayPublications(publications)
        updateStats(publications)
        setupFilters()

        // Show stats and filters
        if (document.getElementById("publications-stats")) {
            document.getElementById("publications-stats").style.display = "flex"
        }
        if (document.getElementById("publications-filters")) {
            document.getElementById("publications-filters").style.display =
                "flex"
        }

        console.log("🎉 Publications loaded successfully!")
        isLoading = false
    } catch (error) {
        console.error("❌ Error loading publications from cache:", error)

        // Try fallback to publications.json
        try {
            console.log("🔄 Trying fallback to publications.json...")
            const fallbackResponse = await fetch("/data/publications.json")

            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json()
                console.log("✅ Loaded from fallback publications.json")

                // Convert the old format to the new format if needed
                let publications =
                    fallbackData.publications || fallbackData.results || []

                if (publications.length > 0) {
                    console.log(
                        `📊 Fallback loaded ${publications.length} publications`,
                    )

                    // Store globally for filtering
                    allPublications = publications

                    // Hide loading
                    if (loadingEl) loadingEl.style.display = "none"

                    // Display publications
                    displayPublications(publications)
                    updateStats(publications)
                    setupFilters()

                    // Show stats and filters
                    if (document.getElementById("publications-stats")) {
                        document.getElementById(
                            "publications-stats",
                        ).style.display = "flex"
                    }
                    if (document.getElementById("publications-filters")) {
                        document.getElementById(
                            "publications-filters",
                        ).style.display = "flex"
                    }

                    console.log(
                        "🎉 Publications loaded from fallback successfully!",
                    )
                    isLoading = false
                    return
                }
            }
        } catch (fallbackError) {
            console.error("❌ Fallback also failed:", fallbackError)
        }

        // If both methods fail, show error
        isLoading = false

        // Hide loading
        if (loadingEl) loadingEl.style.display = "none"

        // Show error
        const errorEl = document.getElementById("error-message")
        if (errorEl) {
            errorEl.style.display = "block"
            errorEl.innerHTML = `<p>Error loading publications: ${error.message}</p><p>Fallback attempt also failed. Please try again later.</p><button onclick="loadPublications()" style="margin-top: 10px; padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>`
        }
    }
}

// Display publications grouped by year
function displayPublications(publications) {
    console.log(`📊 Displaying ${publications.length} publications...`)

    const contentEl = document.getElementById("publications-content")
    if (!contentEl) {
        console.error("❌ Publications content element not found")
        return
    }

    // Group by year
    const groupedByYear = {}
    publications.forEach((pub) => {
        const year = pub.publication_year || "Unknown"
        if (!groupedByYear[year]) {
            groupedByYear[year] = []
        }
        groupedByYear[year].push(pub)
    })

    // Sort years descending
    const years = Object.keys(groupedByYear).sort((a, b) => {
        if (a === "Unknown") return 1
        if (b === "Unknown") return -1
        return parseInt(b) - parseInt(a)
    })

    // Generate HTML
    let html = ""
    years.forEach((year) => {
        html += `<div class="year-group" data-year="${year}"><h2 class="year-heading">${year}</h2><div class="publications-list">`

        groupedByYear[year].forEach((pub) => {
            const title = pub.title || "Untitled"

            // Process authors with proper capitalization and highlighting
            const processedAuthors = pub.authorships?.map((a) => {
                let authorName = a.author?.display_name || "Unknown Author"

                // Capitalize author name properly
                authorName = authorName
                    .split(" ")
                    .map((word) => {
                        // Handle special cases for Portuguese/Brazilian names
                        if (
                            word.toLowerCase() === "de" ||
                            word.toLowerCase() === "da" ||
                            word.toLowerCase() === "do" ||
                            word.toLowerCase() === "dos" ||
                            word.toLowerCase() === "das" ||
                            word.toLowerCase() === "e"
                        ) {
                            return word.toLowerCase()
                        }
                        // Handle initials (single letters followed by period)
                        if (word.length <= 2 && word.includes(".")) {
                            return word.toUpperCase()
                        }
                        // Regular capitalization
                        return (
                            word.charAt(0).toUpperCase() +
                            word.slice(1).toLowerCase()
                        )
                    })
                    .join(" ")

                // Bold Thiago C. Jesus (check for variations)
                if (
                    authorName.includes("Thiago") &&
                    authorName.includes("C. Jesus")
                ) {
                    // Normalize to consistent format
                    authorName = "Thiago C. Jesus"
                    return `<strong>${authorName}</strong>`
                }

                return authorName
            }) || ["Unknown authors"]

            const authors = processedAuthors.join(", ")

            const venue =
                pub._venue_override?.venue_name ||
                pub.primary_location?.source?.display_name ||
                pub.host_venue?.display_name ||
                "Unknown venue"
            const doi = pub.doi
            const url =
                pub.landing_page_url ||
                (doi
                    ? `https://doi.org/${doi.replace("https://doi.org/", "")}`
                    : "#")
            const citations = pub.cited_by_count || 0
            const isOpenAccess = pub.open_access?.is_oa || false
            const type = pub.type_crossref || pub.type || "article"

            // Extract volume, issue, pages for journals
            const biblio = pub.biblio || {}
            const volume = biblio.volume
            const issue = biblio.issue
            const firstPage = biblio.first_page
            const lastPage = biblio.last_page

            // Extract conference location if available
            const venueLocation = pub._venue_override?.venue_location

            // Format venue with additional information
            let formattedVenue = `<strong>${venue}</strong>`

            // For journal articles, add volume, issue, pages
            if (
                type.toLowerCase().includes("journal") ||
                venue.toLowerCase().includes("journal")
            ) {
                const volumeInfo = []
                if (volume) volumeInfo.push(`v. ${volume}`)
                if (issue) volumeInfo.push(`no. ${issue}`)
                if (firstPage) {
                    if (lastPage && firstPage !== lastPage) {
                        volumeInfo.push(`pp. ${firstPage}-${lastPage}`)
                    } else {
                        volumeInfo.push(`p. ${firstPage}`)
                    }
                }
                if (volumeInfo.length > 0) {
                    formattedVenue += `, ${volumeInfo.join(", ")}`
                }
            }

            // For conference papers, add location
            if (
                (type.toLowerCase().includes("proceedings") ||
                    type.toLowerCase().includes("conference")) &&
                venueLocation
            ) {
                formattedVenue += `, ${venueLocation}`
            }

            // Determine publication type with enhanced detection
            const isSpringerProceedings = doi && doi.includes("10.1007/978-")
            const isLectureNotes = venue.toLowerCase().includes("lecture notes")
            const isProceedingsVenue =
                venue.toLowerCase().includes("proceedings") ||
                venue.toLowerCase().includes("conference") ||
                venue.toLowerCase().includes("symposium") ||
                venue.toLowerCase().includes("workshop")

            // Book chapter detection
            const isBookChapter =
                type.toLowerCase().includes("book-chapter") &&
                !isSpringerProceedings &&
                !isLectureNotes &&
                !isProceedingsVenue

            const isJournal =
                !isSpringerProceedings &&
                !isLectureNotes &&
                !isProceedingsVenue &&
                !isBookChapter &&
                (type.toLowerCase().includes("journal") ||
                    venue.toLowerCase().includes("journal"))

            const isConference =
                isSpringerProceedings ||
                isLectureNotes ||
                isProceedingsVenue ||
                ((type.toLowerCase().includes("conference") ||
                    type.toLowerCase().includes("proceedings")) &&
                    !isBookChapter)

            // Generate badges
            let badges = ""
            if (isJournal) {
                badges += '<span class="badge badge-journal">Journal</span>'
            } else if (isConference) {
                badges +=
                    '<span class="badge badge-conference">Conference</span>'
            } else if (isBookChapter) {
                badges += '<span class="badge badge-book">Book Chapter</span>'
            }

            if (citations > 30) {
                badges +=
                    '<span class="badge badge-highly-cited">Highly Cited</span>'
            }

            html += `
        <div class="publication-item" data-type="${
            isJournal
                ? "journal"
                : isConference
                ? "conference"
                : isBookChapter
                ? "book"
                : "other"
        }" data-open-access="${isOpenAccess}" data-citations="${citations}">
          ${badges ? `<div class="publication-badges">${badges}</div>` : ""}
          <div class="publication-title">
            ${title}${
                isOpenAccess
                    ? '<i class="ai ai-open-access open-access-icon" title="Open Access"></i>'
                    : ""
            }
          </div>
          <div class="publication-authors">${authors}</div>
          <div class="publication-journal">${formattedVenue}</div>
          <div class="publication-meta">
            <span class="publication-year-badge">${year}</span>
            ${
                citations > 0
                    ? `<span class="citation-count">${citations} citation${
                          citations !== 1 ? "s" : ""
                      }</span>`
                    : ""
            }
            ${
                doi
                    ? `<span class="publication-doi">DOI: <a href="${
                          doi.startsWith("http")
                              ? doi
                              : `https://doi.org/${doi}`
                      }" target="_blank" rel="noopener">${
                          doi.startsWith("http")
                              ? doi.replace("https://doi.org/", "")
                              : doi
                      }<svg class="external-link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></span>`
                    : ""
            }
          </div>
        </div>
      `
        })

        html += "</div></div>"
    })

    contentEl.innerHTML = html
    console.log("✅ Publications displayed")
}

// Update statistics
function updateStats(publications) {
    const totalPapers = publications.length
    const totalCitations = publications.reduce(
        (sum, pub) => sum + (pub.cited_by_count || 0),
        0,
    )
    const openAccessCount = publications.filter(
        (pub) => pub.open_access?.is_oa,
    ).length

    // Calculate h-index
    const citations = publications
        .map((pub) => pub.cited_by_count || 0)
        .sort((a, b) => b - a)
    let hIndex = 0
    for (let i = 0; i < citations.length; i++) {
        if (citations[i] >= i + 1) {
            hIndex = i + 1
        } else {
            break
        }
    }

    // Update DOM
    const totalPapersEl = document.getElementById("total-papers")
    const totalCitationsEl = document.getElementById("total-citations")
    const hIndexEl = document.getElementById("h-index")
    const openAccessEl = document.getElementById("open-access-count")

    if (totalPapersEl) totalPapersEl.textContent = totalPapers
    if (totalCitationsEl) totalCitationsEl.textContent = totalCitations
    if (hIndexEl) hIndexEl.textContent = hIndex
    if (openAccessEl) openAccessEl.textContent = openAccessCount
}

// Setup filter functionality
function setupFilters() {
    const filterButtons = document.querySelectorAll(".filter-button")

    filterButtons.forEach((button) => {
        button.addEventListener("click", function () {
            // Update active state
            filterButtons.forEach((btn) => btn.classList.remove("active"))
            this.classList.add("active")

            // Get filter value
            currentFilter = this.dataset.filter

            // Apply filter
            filterPublications()
        })
    })
}

// Filter publications based on current filter
function filterPublications() {
    const publicationItems = document.querySelectorAll(".publication-item")
    const yearGroups = document.querySelectorAll(".year-group")

    // Track which years have visible publications
    const yearsWithVisiblePublications = new Set()

    // First pass: determine visibility of items and track their years
    publicationItems.forEach((item) => {
        const type = item.dataset.type
        const isOpenAccess = item.dataset.openAccess === "true"
        const citations = parseInt(item.dataset.citations) || 0
        const yearGroup = item.closest(".year-group")
        const yearHeading = yearGroup
            ? yearGroup.querySelector(".year-heading").textContent
            : ""

        let show = true

        switch (currentFilter) {
            case "journal":
                show = type === "journal"
                break
            case "conference":
                show = type === "conference"
                break
            case "book":
                show = type === "book"
                break
            case "open-access":
                show = isOpenAccess
                break
            case "highly-cited":
                show = citations > 30
                break
            default: // 'all'
                show = true
        }

        item.style.display = show ? "block" : "none"

        // If this item is visible, mark its year
        if (show && yearHeading) {
            yearsWithVisiblePublications.add(yearHeading)
        }
    })

    // Second pass: hide/show year groups based on whether they have visible publications
    yearGroups.forEach((yearGroup) => {
        const yearHeading = yearGroup.querySelector(".year-heading").textContent
        const hasVisiblePublications =
            yearsWithVisiblePublications.has(yearHeading)

        // Hide year groups with no visible publications
        yearGroup.style.display = hasVisiblePublications ? "block" : "none"
    })
}

// Expose to global scope for retry button
window.loadPublications = loadPublications

console.log("📚 Publications script ready")
