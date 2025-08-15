// scripts/cross_ref_manager.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Dependency Checks ---
    if (typeof tippy !== 'function') {
        console.error("Tippy.js library not found. Cross-reference tooltips will not work.");
        return;
    }
    if (typeof initDB !== 'function' || typeof getCrossRefById !== 'function' || typeof parseBibleReferenceWithNote !== 'function') {
        console.error("Critical functions from script.js are missing for Cross-Ref Manager.");
        return;
    }

    // --- DOM Elements ---
    const crossRefPanel = document.getElementById('crossRefPanel');
    const crossRefOverlay = document.getElementById('crossRefOverlay');
    const panelCloseBtnCrossRef = document.getElementById('panelCloseBtnCrossRef');
    const crossRefPanelTitle = document.getElementById('crossRefPanelTitle');
    const crossRefListContainer = document.getElementById('crossRefListContainer');
    const crossRefPaginationControls = document.getElementById('crossRefPaginationControls');
    const dynamicBrandArea = document.getElementById('dynamicBrandArea');

    // --- State ---
    let tippyInstances = [];
    let allFetchedRefs = [];
    let currentPage = 1;
    const ITEMS_PER_PAGE = 15;

    function formatRefToKey(fullRefString) {
        const parsed = parseBibleReferenceWithNote(fullRefString);
        if (!parsed) return null;
        const bookAbbr = parsed.book.split(' ')[0].substring(0, 3);
        return `${bookAbbr}${parsed.chapter}.${parsed.startVerse}`;
    }

    // --- NEW & CORRECTED PARSING LOGIC ---
    /**
     * Parses the compact, space-less reference format from the cross-reference JSON.
     * Handles formats like "Isa65.17" and complex ranges like "Col1.16-Col.1.17".
     * @param {string} compactStr The compact reference string.
     * @returns {object|null} A parsed reference object, or null if parsing fails.
     */
    function parseCompactRefString(compactStr) {
        // For complex ranges like "Col1.16-Col.1.17", we simplify by parsing only the starting reference.
        let processableStr = compactStr.split('-')[0];

        // Regex to find the boundary between the book name (letters) and chapter/verse (numbers).
        const match = processableStr.match(/^([a-zA-Z]+)(\d+.*)$/);

        if (match && match[1] && match[2]) {
            const bookPart = match[1];
            const numbersPart = match[2];

            // Reconstruct the string into a format our main parser can understand.
            // "Isa65.17" becomes "Isa 65.17"
            const readableRef = `${bookPart} ${numbersPart.replace('.', ':')}`;
            
            // Now, use the robust, app-wide parser.
            return parseBibleReferenceWithNote(readableRef);
        }

        // As a fallback, try the original parser directly, though it's unlikely to succeed.
        return parseBibleReferenceWithNote(compactStr);
    }

    function getVerseTextForTooltip(refObject) {
        if (!window.fullBibleVerses || window.fullBibleVerses.length === 0) {
            return "Active Bible translation not loaded.";
        }
        const bookKey = refObject.book.toLowerCase().replace(/\s+/g, ' ');
        const relevantVerses = window.fullBibleVerses
            .filter(v => 
                v._book.toLowerCase().startsWith(bookKey) && // Use startsWith for abbreviations (e.g., "Gen" matches "genesis")
                v._chapter === refObject.chapter && 
                v._verse >= refObject.startVerse && 
                v._verse <= refObject.endVerse
            )
            .sort((a, b) => a._verse - b._verse)
            .map(v => v.text.trim());
        return relevantVerses.length > 0 ? relevantVerses.join(' ') : "(Text not found in current translation)";
    }

    function renderPaginationControls() {
        crossRefPaginationControls.innerHTML = '';
        const totalPages = Math.ceil(allFetchedRefs.length / ITEMS_PER_PAGE);

        if (totalPages <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.textContent = '‹ Prev';
        prevButton.className = 'dm-button-small';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCurrentPageOfRefs();
            }
        });

        const pageInfo = document.createElement('span');
        pageInfo.id = 'crossRefPageInfo';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next ›';
        nextButton.className = 'dm-button-small';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderCurrentPageOfRefs();
            }
        });

        crossRefPaginationControls.append(prevButton, pageInfo, nextButton);
    }
    
    function renderCurrentPageOfRefs() {
        crossRefListContainer.innerHTML = '';
        tippyInstances.forEach(instance => instance.destroy());
        tippyInstances = [];

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedRefs = allFetchedRefs.slice(startIndex, endIndex);

        if (paginatedRefs.length === 0) {
             crossRefListContainer.innerHTML = '<li>No references to display on this page.</li>';
        } else {
            paginatedRefs.forEach(refData => {
                const link = document.createElement('a');
                link.href = "#";
                link.className = 'cross-ref-link';
                link.textContent = refData.t.replace(/-/g, '–');
                link.dataset.tippyRef = refData.t;
                crossRefListContainer.appendChild(link);
            });
    
            tippyInstances = tippy(crossRefListContainer.querySelectorAll('.cross-ref-link'), {
                theme: 'divine-words',
                allowHTML: false,
                content: 'Loading...',
                placement: 'top',
                onShow(instance) {
                    const compactRefString = instance.reference.dataset.tippyRef;
                    // *** THIS IS THE FIX: Use the new compact parser ***
                    const parsed = parseCompactRefString(compactRefString);
                    
                    instance.setContent(parsed ? getVerseTextForTooltip(parsed) : `Invalid Ref: ${compactRefString}`);
                },
            });
        }
        
        renderPaginationControls();
    }

    async function openCrossRefPanel() {
        if (typeof window.getCurrentVerseData !== 'function') return;
        const currentVerseData = await window.getCurrentVerseData();
        if (!currentVerseData || !currentVerseData.reference) {
            window.appShowStatus("No active verse to show references for.", true, 2000);
            return;
        }

        const refKey = formatRefToKey(currentVerseData.reference);
        if (!refKey) {
            window.appShowStatus("Could not format current verse reference.", true, 2000);
            return;
        }

        crossRefPanelTitle.textContent = `For ${currentVerseData.reference}`;
        crossRefListContainer.innerHTML = '<li>Loading references...</li>';
        crossRefPaginationControls.innerHTML = '';
        
        crossRefOverlay.classList.add('active');
        crossRefPanel.classList.add('active');

        try {
            const result = await getCrossRefById(refKey);
            
            if (!result || !result.refs || result.refs.length === 0) {
                crossRefListContainer.innerHTML = '<li>No cross-references found for this verse.</li>';
                allFetchedRefs = [];
                return;
            }

            allFetchedRefs = result.refs.sort((a, b) => b.v - a.v);
            currentPage = 1;
            renderCurrentPageOfRefs();

        } catch (error) {
            console.error("Error fetching cross-references:", error);
            crossRefListContainer.innerHTML = '<li>Error loading references. See console.</li>';
        }
    }

    function closeCrossRefPanel() {
        crossRefPanel.classList.remove('active');
        crossRefOverlay.classList.remove('active');
        tippyInstances.forEach(instance => instance.destroy());
        tippyInstances = [];
    }
    window.closeCrossRefPanel = closeCrossRefPanel;

    function initCrossRefManager() {
        if (dynamicBrandArea) {
            dynamicBrandArea.addEventListener('click', openCrossRefPanel);
            dynamicBrandArea.style.cursor = 'pointer';
            dynamicBrandArea.title = 'View Cross-References';
        }

        if (panelCloseBtnCrossRef) {
            panelCloseBtnCrossRef.addEventListener('click', closeCrossRefPanel);
        }
        if (crossRefOverlay) {
            crossRefOverlay.addEventListener('click', closeCrossRefPanel);
        }
    }
    
    window.initCrossRefManager = initCrossRefManager;
});