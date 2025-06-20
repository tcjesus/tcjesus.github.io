import fetch from "node-fetch"
import fs from "fs/promises"
import path from "path"

// OpenAlex API configuration
const AUTHOR_IDS = [
    "a5040609024", // Alternative ID 1
    "a5107181246", // Alternative ID 2
    "a5113972525", // Alternative ID 3
]

const API_URL = `https://api.openalex.org/works?page=1&filter=authorships.author.id:${AUTHOR_IDS.join(
    "|",
)}&sort=publication_year:desc&per_page=200`

async function fetchPublications() {
    try {
        console.log("Fetching publications from OpenAlex API...")
        const response = await fetch(API_URL)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (!data.results || data.results.length === 0) {
            throw new Error("No publications found")
        }

        console.log(`Found ${data.results.length} publications`)

        // Load venue overrides
        let venueOverrides = {}
        try {
            const overridesData = await fs.readFile(
                "data/venue-overrides.json",
                "utf-8",
            )
            const overridesJson = JSON.parse(overridesData)
            venueOverrides = overridesJson.overrides || {}
            console.log(
                `Loaded ${Object.keys(venueOverrides).length} venue overrides`,
            )
        } catch (error) {
            console.warn("Could not load venue overrides:", error.message)
        }

        // Process and enhance the data with venue overrides
        const processedPublications = data.results.map((pub) => {
            const pubId = pub.id
            const override = venueOverrides[pubId]

            // Apply venue overrides if they exist
            if (override) {
                if (override.exclude) {
                    // Mark for exclusion
                    pub._venue_override = {
                        applied: true,
                        source: "manual",
                        exclude: true,
                        reason: override.reason || "excluded",
                        notes: override.notes || "Manually excluded",
                    }
                } else {
                    // Apply venue information overrides
                    pub._venue_override = {
                        applied: true,
                        source: "manual",
                        venue_name: override.venue_name,
                        venue_acronym: override.venue_acronym,
                        venue_location: override.venue_location,
                        notes: override.notes,
                    }

                    // Override venue display name if specified
                    if (override.venue_name && pub.primary_location?.source) {
                        pub.primary_location.source.display_name =
                            override.venue_name
                    }

                    // Override biblio information if specified
                    if (
                        override.volume ||
                        override.issue ||
                        override.first_page ||
                        override.last_page
                    ) {
                        if (!pub.biblio) pub.biblio = {}
                        if (override.volume) pub.biblio.volume = override.volume
                        if (override.issue) pub.biblio.issue = override.issue
                        if (override.first_page)
                            pub.biblio.first_page = override.first_page
                        if (override.last_page)
                            pub.biblio.last_page = override.last_page
                    }
                }
            }

            return {
                id: pub.id,
                title: pub.display_name || pub.title,
                authors:
                    pub.authorships?.map((a) => ({
                        name: a.author?.display_name,
                        orcid: a.author?.orcid,
                        isCorresponding: a.is_corresponding,
                        position: a.author_position,
                    })) || [],
                journal: pub.primary_location?.source?.display_name,
                year: pub.publication_year,
                month: pub.publication_date
                    ? new Date(pub.publication_date).getMonth() + 1
                    : null,
                date: pub.publication_date,
                doi: pub.doi,
                url: pub.primary_location?.landing_page_url || pub.doi,
                citations: pub.cited_by_count || 0,
                isOpenAccess: pub.open_access?.is_oa || false,
                oaUrl: pub.open_access?.oa_url,
                publicationType: pub.type_crossref,
                volume: pub.biblio?.volume,
                issue: pub.biblio?.issue,
                pages: {
                    first: pub.biblio?.first_page,
                    last: pub.biblio?.last_page,
                },
                keywords: pub.keywords?.map((k) => k.display_name) || [],
                topics:
                    pub.topics?.slice(0, 3).map((t) => t.display_name) || [],
                abstract: pub.abstract_inverted_index
                    ? reconstructAbstract(pub.abstract_inverted_index)
                    : null,
                venue: pub.primary_location?.source,
                language: pub.language,
                isRetracted: pub.is_retracted,
                citationsPerYear: pub.counts_by_year || [],
                lastUpdated: new Date().toISOString(),
                // Include the full OpenAlex data for the cached version
                ...pub,
            }
        })

        // Calculate additional metrics (excluding excluded publications)
        const filteredForStats = processedPublications.filter(
            (pub) => !pub._venue_override?.exclude,
        )
        const stats = calculateStats(filteredForStats)

        // Create the data structure to save
        const publicationsData = {
            publications: processedPublications,
            stats,
            lastFetched: new Date().toISOString(),
            totalCount: processedPublications.length,
            filteredCount: filteredForStats.length,
            excludedCount:
                processedPublications.length - filteredForStats.length,
        }

        // Ensure data and public/data directories exist
        await fs.mkdir("data", { recursive: true })
        await fs.mkdir("public/data", { recursive: true })
        await fs.mkdir("static/data", { recursive: true })

        // Save the processed data to multiple locations
        await fs.writeFile(
            "data/publications.json",
            JSON.stringify(publicationsData, null, 2),
        )

        // Save the raw data with overrides applied as cache
        const cacheData = {
            results: processedPublications,
            meta: {
                count: processedPublications.length,
                lastUpdated: new Date().toISOString(),
                venueOverridesApplied: Object.keys(venueOverrides).length,
            },
        }

        await fs.writeFile(
            "public/data/openalex-cache.json",
            JSON.stringify(cacheData, null, 2),
        )

        await fs.writeFile(
            "static/data/openalex-cache.json",
            JSON.stringify(cacheData, null, 2),
        )

        console.log(
            `Successfully saved ${processedPublications.length} publications (${filteredForStats.length} after filtering)`,
        )
        console.log(
            `Statistics: ${stats.totalCitations} citations, H-index: ${stats.hIndex}, ${stats.openAccessCount} open access papers`,
        )
        console.log(
            `Venue overrides applied: ${
                Object.keys(venueOverrides).length
            }, Excluded: ${publicationsData.excludedCount}`,
        )

        return publicationsData
    } catch (error) {
        console.error("Error fetching publications:", error)
        process.exit(1)
    }
}

function reconstructAbstract(invertedIndex) {
    if (!invertedIndex) return null

    const words = []
    for (const [word, positions] of Object.entries(invertedIndex)) {
        for (const pos of positions) {
            words[pos] = word
        }
    }

    return words.filter(Boolean).join(" ").substring(0, 500) + "..."
}

function calculateStats(publications) {
    const totalCitations = publications.reduce(
        (sum, pub) => sum + pub.citations,
        0,
    )
    const openAccessCount = publications.filter(
        (pub) => pub.isOpenAccess,
    ).length

    // Calculate H-index
    const citations = publications
        .map((pub) => pub.citations)
        .sort((a, b) => b - a)
    let hIndex = 0
    for (let i = 0; i < citations.length; i++) {
        if (citations[i] >= i + 1) {
            hIndex = i + 1
        } else {
            break
        }
    }

    // Calculate publications by year
    const byYear = {}
    publications.forEach((pub) => {
        const year = pub.year || "Forthcoming"
        byYear[year] = (byYear[year] || 0) + 1
    })

    // Calculate publications by type
    const byType = {}
    publications.forEach((pub) => {
        const type = pub.publicationType || "other"
        byType[type] = (byType[type] || 0) + 1
    })

    return {
        totalPapers: publications.length,
        totalCitations,
        hIndex,
        openAccessCount,
        averageCitations:
            Math.round((totalCitations / publications.length) * 10) / 10,
        publicationsByYear: byYear,
        publicationsByType: byType,
        mostCitedPaper: publications.reduce(
            (max, pub) => (pub.citations > max.citations ? pub : max),
            { citations: 0 },
        ),
        recentPapers: publications.filter(
            (pub) => pub.year >= new Date().getFullYear() - 2,
        ).length,
    }
}

// Run the script
fetchPublications()
