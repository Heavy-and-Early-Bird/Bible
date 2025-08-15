// scripts/openbible_topics_importer.js
console.log("OpenBible Topics Importer script loaded (Extracts text references before sending to Extractor).");

document.addEventListener('DOMContentLoaded', () => {
    const openBibleTopicInput = document.getElementById('openBibleTopicInput');
    const fetchOpenBibleTopicBtn = document.getElementById('fetchOpenBibleTopicBtn');
    const openBibleStatusMessage = document.getElementById('openBibleStatusMessage');

    // Using a public CORS proxy. Replace if you have your own or a preferred one.
    // Remember: Public proxies are for development/testing ONLY due to unreliability & potential limits.
    const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=';

    function showOpenBibleStatus(message, isError = false, duration = 5000) {
        if (openBibleStatusMessage) {
            openBibleStatusMessage.textContent = message;
            openBibleStatusMessage.className = 'status-message-inline'; // Base class
            if (isError) {
                openBibleStatusMessage.classList.add('error-inline');
            } else {
                // You can add a .success-inline class if you style it in your CSS
                // openBibleStatusMessage.classList.add('success-inline'); 
            }
            if (duration > 0) {
                setTimeout(() => {
                    // Only clear if the message hasn't been overwritten by a newer one
                    if (openBibleStatusMessage.textContent === message) {
                        openBibleStatusMessage.textContent = '';
                        openBibleStatusMessage.className = 'status-message-inline';
                    }
                }, duration);
            }
        } else {
            // Fallback logging if the specific status element isn't found for some reason
            if (typeof window.localShowStatus === 'function') { // Attempt to use DataManager's status
                window.localShowStatus(`OpenBible Importer: ${message}`, isError, duration);
            } else {
                console.log(`OpenBible Status (${isError ? 'Error' : 'Info'}): ${message}`);
            }
        }
    }

    // --- Dependency Checks ---
    // These ensure that functions from other scripts, which this script relies on, are available.
    if (typeof initDB !== 'function' || typeof saveCollectionToDB !== 'function' || typeof getCollectionFromDB !== 'function') {
        showOpenBibleStatus("Critical Error: Core Database functions (from script.js) are missing. Importer cannot function.", true, 0);
        if (fetchOpenBibleTopicBtn) fetchOpenBibleTopicBtn.disabled = true;
        return;
    }
    if (typeof window.prefillExtractorModal !== 'function' ||
        typeof window.openExtractorModalGlobal !== 'function') {
        showOpenBibleStatus("Critical Error: Reference Extractor module functions (from extractor_script.js) are missing. Importer cannot function.", true, 0);
        if (fetchOpenBibleTopicBtn) fetchOpenBibleTopicBtn.disabled = true;
        return;
    }

    /**
     * Parses the fetched HTML from OpenBible.info to extract the displayed verse reference strings.
     * @param {string} htmlText The raw HTML content of the OpenBible topic page.
     * @param {string} topicName The topic name (for logging/status messages).
     * @returns {Array<string>|null} An array of extracted reference strings (e.g., "1 John 3:16", "Genesis 1:1-3"), or null if none found.
     */
    function parseHtmlForVerseReferenceStrings(htmlText, topicName) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const references = new Set(); // Use a Set to avoid duplicate reference strings if they appear multiple times
        let foundUsingPrimarySelector = false;

        // Primary CSS selectors for verse links on OpenBible.info topic pages.
        // This targets <a> tags inside <p> or <h2> elements within a 'verse' classed div,
        // where the <a> tag's href attribute contains 'biblegateway.com'.
        const verseLinkElements = doc.querySelectorAll(
            '.verse p a[href*="biblegateway.com"], .verse h2 a[href*="biblegateway.com"]'
        );
        
        if (verseLinkElements.length > 0) {
            foundUsingPrimarySelector = true;
            verseLinkElements.forEach(el => {
                let refText = el.textContent.trim();
                // Minimal cleanup: remove trailing Bible versions like "(NIV)", "(ESV)"
                refText = refText.replace(/\s*\([A-Z]{2,4}\)$/, '').trim();
                if (refText) {
                    references.add(refText); // Add to Set for automatic deduplication
                }
            });
        }
        
        // Fallback: If primary selectors failed, try a broader search for any link within '.verse'
        // This is more speculative and might pick up non-reference links,
        // but the robust extractor is designed to filter those out later.
        if (!foundUsingPrimarySelector && references.size === 0) {
            showOpenBibleStatus(`Primary selectors found no verse links for "${topicName}". Attempting a broader search within verse sections. Results may vary.`, false, 4000);
            const allLinksInVerseSections = doc.querySelectorAll('.verse a'); 
            allLinksInVerseSections.forEach(el => {
                let refText = el.textContent.trim();
                // Heuristic: Likely a reference if it contains a digit, a letter, and is not excessively long/short.
                if (refText && /\d/.test(refText) && /[a-zA-Z]/.test(refText)) {
                    refText = refText.replace(/\s*\([A-Z]{2,4}\)$/, '').trim(); // Remove (NIV)
                    if (refText.length > 2 && refText.length < 60) { // Avoid extremely short or long texts
                         references.add(refText);
                    }
                }
            });
        }
        
        if (references.size === 0) {
            showOpenBibleStatus(`No verse references could be extracted from the HTML for "${topicName}". The OpenBible.info page structure may have changed, the topic might be empty, or no parsable links were found.`, true);
            return null;
        }
        return Array.from(references); // Convert Set to Array
    }

    /**
     * Fetches HTML for a given topic from OpenBible.info (via a CORS proxy)
     * and then calls parseHtmlForVerseReferenceStrings to extract reference strings.
     * @param {string} topic The topic to search for.
     * @returns {Promise<string|null>} A promise that resolves to a newline-separated string of references, or null on failure.
     */
    async function fetchAndExtractTopicReferences(topic) {
        if (!topic || !topic.trim()) {
            showOpenBibleStatus("Please enter a topic name to fetch.", true);
            return null;
        }
        const userEnteredTopic = topic.trim();
        showOpenBibleStatus(`Fetching "${userEnteredTopic}" & extracting references via proxy... Please wait.`, false, 0); // Persistent status
        if (fetchOpenBibleTopicBtn) fetchOpenBibleTopicBtn.disabled = true;

        const sanitizedTopicForOpenBibleURL = userEnteredTopic.replace(/\s+/g, '_'); // OpenBible uses underscores in URL
        const targetUrl = `https://www.openbible.info/topics/${sanitizedTopicForOpenBibleURL}`;
        const fetchUrl = CORS_PROXY_URL + encodeURIComponent(targetUrl); // Target URL must be encoded for proxy query param
        console.log("Attempting OpenBible fetch via proxy:", fetchUrl);

        try {
            const response = await fetch(fetchUrl, { cache: "no-store" }); // no-store helps get fresh data
            if (!response.ok) {
                let errorDetails = `Proxy or target server returned status: ${response.status}.`;
                // Try to get more specific error details if the proxy returns them
                try { const errorText = await response.text(); console.warn("Proxy error response body:", errorText.substring(0,300)); /* Log part of error */ } catch(e) { /* ignore */ }
                throw new Error(`Failed to fetch topic "${userEnteredTopic}". ${errorDetails}`);
            }
            const htmlText = await response.text();

            // Sanity check the received HTML to ensure it's likely valid content
            if (!htmlText || htmlText.trim().length < 500 || htmlText.toLowerCase().includes("wayback machine has not archived that url") || htmlText.toLowerCase().includes("cannot find server") || htmlText.toLowerCase().includes("domain owner has blocked your access") ) {
                let reason = "it was unexpectedly small, empty, or indicated a proxy/target error (e.g., proxy blocked, target down, or returned an archive page).";
                showOpenBibleStatus(`Fetched page for "${userEnteredTopic}", but content was problematic: ${reason} Check if the topic exists on OpenBible.info or try a different CORS proxy if this issue persists.`, true, 0);
                return null;
            }
            
            // Parse the successfully fetched HTML to extract verse reference strings
            const extractedReferenceStringsArray = parseHtmlForVerseReferenceStrings(htmlText, userEnteredTopic);
            
            if (extractedReferenceStringsArray && extractedReferenceStringsArray.length > 0) {
                showOpenBibleStatus(`${extractedReferenceStringsArray.length} potential reference strings extracted for "${userEnteredTopic}". Sending to Reference Extractor for detailed parsing and user review.`, false, 5000);
                return extractedReferenceStringsArray.join('\n'); // Return as a single newline-separated string
            } else {
                // parseHtmlForVerseReferenceStrings would have shown its own status if no refs found in valid HTML
                return null; 
            }

        } catch (error) {
            console.error("OpenBible Fetch/Parse Exception:", error);
            showOpenBibleStatus(`Error during fetch or initial parse: ${error.message}. See console.`, true, 0);
            return null;
        } finally {
            if (fetchOpenBibleTopicBtn) fetchOpenBibleTopicBtn.disabled = false;
        }
    }

    /**
     * Callback function invoked by the Extractor Modal after the user has reviewed
     * the references and clicked the "Save Topic Collection" button.
     * @param {string} collectionName The proposed name for the collection.
     * @param {Array<Object>} parsedVerseObjectsForDB Array of verse objects in DB format.
     */
    async function autoSaveOpenBibleCollection(collectionName, parsedVerseObjectsForDB) {
        const cleanCollectionName = collectionName.trim();
        showOpenBibleStatus(`Received ${parsedVerseObjectsForDB.length} confirmed references for "${cleanCollectionName}". Attempting to save...`, false, 0);

        if (!cleanCollectionName || parsedVerseObjectsForDB.length === 0) {
            showOpenBibleStatus("Auto-save Canceled: Collection name is invalid or no references were provided by the extractor.", true);
            return;
        }
        try {
            const existingCollection = await getCollectionFromDB(cleanCollectionName); // from script.js
            if (existingCollection) {
                if (!confirm(`A collection named "${cleanCollectionName}" already exists. Overwrite with these ${parsedVerseObjectsForDB.length} new references?`)) {
                    showOpenBibleStatus("Auto-save canceled (user chose not to overwrite).", false);
                    if (typeof window.localShowStatus === 'function') {
                         window.localShowStatus(`Save of "${cleanCollectionName}" was canceled by user.`, false, 4000);
                    }
                    return;
                }
                showOpenBibleStatus(`Overwriting existing collection "${cleanCollectionName}"...`, false, 0);
            }

            const collectionToSave = {
                name: cleanCollectionName,
                collectionNote: `Verses related to the topic "${cleanCollectionName.replace(' (OpenBible)', '')}", sourced from OpenBible.info (via proxy). Extracted and reviewed on ${new Date().toLocaleDateString()}.`,
                verses: parsedVerseObjectsForDB, // Should be array of { _book, _chapter, _startVerse, _endVerse, reference }
                lastModified: new Date()
            };

            await saveCollectionToDB(collectionToSave); // from script.js
            const successMsg = `Collection "${cleanCollectionName}" ${existingCollection ? 'updated' : 'saved'} successfully with ${parsedVerseObjectsForDB.length} entries!`;
            showOpenBibleStatus(successMsg, false, 6000);
            if (typeof window.localShowStatus === 'function') { 
                window.localShowStatus(successMsg, false, 6000); // Also update DataManager's main status
            }
            
            if (typeof window.populateCollectionsListGlobal === 'function') { 
                await window.populateCollectionsListGlobal(); // Function needs to be exposed by datamanager_script.js
            } else {
                showOpenBibleStatus("Collection saved/updated. Data Manager's list may need a manual refresh if not updated automatically.", false, 8000);
            }
            if(openBibleTopicInput) openBibleTopicInput.value = ''; // Clear input on success

        } catch (error) {
            console.error("Error during auto-save of OpenBible collection:", error);
            const errorMsg = `Auto-save for "${cleanCollectionName}" failed: ${error.message || 'Unknown database error'}.`;
            showOpenBibleStatus(errorMsg, true, 0);
            if (typeof window.localShowStatus === 'function') {
                window.localShowStatus(errorMsg, true, 0);
            }
        }
    }
    window.autoSaveOpenBibleCollection = autoSaveOpenBibleCollection; // Expose this callback for extractor_script.js

    // Attach event listener to the "Fetch & Extract Verses" button
    if (fetchOpenBibleTopicBtn) {
        fetchOpenBibleTopicBtn.addEventListener('click', async () => {
            const topic = openBibleTopicInput.value;
            if (!topic.trim()) {
                showOpenBibleStatus("Please enter a topic name before fetching.", true);
                return;
            }
            
            const textReferencesForExtractor = await fetchAndExtractTopicReferences(topic);

            if (textReferencesForExtractor) { // This will be a newline-separated string of reference texts
                const proposedCollectionName = topic.trim().charAt(0).toUpperCase() + topic.trim().slice(1).toLowerCase() + " (OpenBible)";
                
                try {
                    // Pass the (now cleaner) text references and the autoSaveOpenBibleCollection callback
                    window.prefillExtractorModal(textReferencesForExtractor, proposedCollectionName, window.autoSaveOpenBibleCollection);
                    window.openExtractorModalGlobal(); // This will open the extractor modal
                    // User will review and click "Save Topic Collection" (or similar) in the modal
                } catch (e) {
                    console.error("Error invoking extractor modal with OpenBible data:", e);
                    showOpenBibleStatus("Critical Error: Could not open the Reference Extractor: " + e.message, true, 0);
                    alert("There was an issue opening the reference extractor modal. The references for the topic might have been fetched and parsed. Please check the developer console for detailed errors.");
                }
            }
            // If textReferencesForExtractor is null, fetchAndExtractTopicReferences has already shown an appropriate error.
        });
    } else {
        showOpenBibleStatus("Initialization Error: The 'Fetch Topic & Extract Verses' button (fetchOpenBibleTopicBtn) was not found in the HTML. UI may be incomplete.", true, 0);
        console.error("OpenBible Importer: fetchOpenBibleTopicBtn element is missing.");
    }
});