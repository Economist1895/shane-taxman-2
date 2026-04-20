// ============================================================
// MAIN — bootstrap: wire modules, preload assets, start the render loop
// ============================================================





let lastFrame = 0;
function gameLoop(now) {
    const dt = lastFrame ? (now - lastFrame) : 16;
    lastFrame = now;
    render(dt);
    requestAnimationFrame(gameLoop);
}

async function init() {
    setupCanvas();
    setupInput();
    setupSelectionScreen();
    setupDeployScreen(beginBattleFromDeploy, backFromDeploy);
    setupMapScreen(onMapSelected);
    buildTerrainTextures();
    updateUI();

    try {
        await loadAssets();
    } catch (err) {
        console.error('Asset load failed:', err);
    }

    state.units = [];
    requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
