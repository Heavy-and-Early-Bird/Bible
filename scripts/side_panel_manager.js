// scripts/side_panel_manager.js
console.log("Side Panel Manager loaded.");

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const sidePanel = document.getElementById('sidePanel');
    const sidePanelOverlay = document.getElementById('sidePanelOverlay');
    const panelCloseBtn = document.getElementById('panelCloseBtn');
    const tabs = document.querySelectorAll('.side-panel-tab-button');
    const panes = document.querySelectorAll('.side-panel-pane');
    
    /**
     * Opens the side panel and shows the specified tab.
     * @param {string} tabToActivate The ID of the pane to activate (e.g., 'crossRefPane').
     */
    function openSidePanel(tabToActivate = 'crossRefPane') {
        if (!sidePanel) return;

        // Tab switching logic
        tabs.forEach(tab => {
            const isTargetTab = tab.dataset.tabTarget === `#${tabToActivate}`;
            tab.classList.toggle('active', isTargetTab);
        });
        panes.forEach(pane => {
            pane.classList.toggle('active', pane.id === tabToActivate);
        });

        // Show/hide footer based on the active tab (notes pane doesn't use it)
        sidePanel.classList.toggle('footer-hidden', tabToActivate === 'notesPane');

        // Open panel
        sidePanelOverlay.classList.add('active');
        sidePanel.classList.add('active');
    }
    window.openSidePanel = openSidePanel;

    /**
     * Closes the side panel.
     */
    function closeSidePanel() {
        if (!sidePanel) return;
        sidePanelOverlay.classList.remove('active');
        sidePanel.classList.remove('active');
        
        // Let the individual managers know they should clean up
        if (typeof window.onCrossRefPanelClosed === 'function') {
            window.onCrossRefPanelClosed();
        }
        if (typeof window.onNotesPanelClosed === 'function') {
            window.onNotesPanelClosed();
        }
    }
    window.closeSidePanel = closeSidePanel;

    /**
     * Initializes the panel's internal event listeners.
     */
    function initSidePanelManager() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPaneId = tab.dataset.tabTarget.substring(1);
                openSidePanel(targetPaneId);
            });
        });
        
        panelCloseBtn.addEventListener('click', closeSidePanel);
        sidePanelOverlay.addEventListener('click', closeSidePanel);
    }
    window.initSidePanelManager = initSidePanelManager;
});