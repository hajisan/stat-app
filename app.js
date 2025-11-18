const STORAGE_KEY = 'stat-app-v1';

let state = {
    nextGameId: 1,
    currentGame: null,
    games: []
};

/* ===== Utils: haptics & animation ===== */

function haptic(type = 'light') {
    if (!('vibrate' in navigator)) return; // iOS ignorerer alligevel
    if (type === 'light') {
        navigator.vibrate(10);
    } else if (type === 'medium') {
        navigator.vibrate([0, 15, 5, 15]);
    }
}

function animatePress(el) {
    if (!el) return;
    el.classList.add('btn-press');
    setTimeout(() => el.classList.remove('btn-press'), 120);
}

/* ===== State-håndtering ===== */

function createEmptyGame() {
    const now = new Date();
    return {
        id: state.nextGameId++,
        createdAt: now.toISOString(),
        teamAName: document.getElementById('teamAName')?.value || 'Hold A',
        teamBName: document.getElementById('teamBName')?.value || 'Hold B',
        stats: {
            A: { screens: 0, turnovers: 0, offRebounds: 0 },
            B: { screens: 0, turnovers: 0, offRebounds: 0 }
        }
    };
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                state = {
                    nextGameId: parsed.nextGameId || 1,
                    currentGame: parsed.currentGame || null,
                    games: parsed.games || []
                };
            }
        }
    } catch (e) {
        console.error('Kunne ikke læse state:', e);
    }

    if (!state.currentGame) {
        state.currentGame = createEmptyGame();
    }

    applyStateToUI();
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Kunne ikke gemme state:', e);
    }
}

function applyStateToUI() {
    const g = state.currentGame;

    document.getElementById('teamAName').value = g.teamAName;
    document.getElementById('teamBName').value = g.teamBName;

    ['A', 'B'].forEach(team => {
        ['screens', 'turnovers', 'offRebounds'].forEach(statKey => {
            const id = `${team}-${statKey}`;
            const el = document.getElementById(id);
            if (el) {
                el.textContent = g.stats[team][statKey];
            }
        });
    });

    renderHistory();
}

function changeStat(team, statKey, delta, triggerElement) {
    const current = state.currentGame.stats[team][statKey];
    const next = current + delta;
    state.currentGame.stats[team][statKey] = Math.max(0, next);
    saveState();
    applyStateToUI();

    // feedback
    animatePress(triggerElement);
    haptic(delta > 0 ? 'light' : 'medium');
}

/* ===== Game handling ===== */

function resetCurrentGame() {
    if (!confirm('Nulstil stats for denne kamp?')) return;
    state.currentGame.stats = {
        A: { screens: 0, turnovers: 0, offRebounds: 0 },
        B: { screens: 0, turnovers: 0, offRebounds: 0 }
    };
    saveState();
    applyStateToUI();
}

function hasAnyStats(game) {
    const g = game.stats;
    const sum =
        g.A.screens + g.A.turnovers + g.A.offRebounds +
        g.B.screens + g.B.turnovers + g.B.offRebounds;
    return sum > 0;
}

function saveGameAndNew() {
    const g = state.currentGame;

    g.teamAName = document.getElementById('teamAName').value || 'Hold A';
    g.teamBName = document.getElementById('teamBName').value || 'Hold B';

    if (hasAnyStats(g)) {
        state.games.unshift(g);
    }

    state.currentGame = createEmptyGame();
    saveState();
    applyStateToUI();
}

/* ===== Copy stats ===== */

function copyStats() {
    const g = state.currentGame;

    g.teamAName = document.getElementById('teamAName').value || 'Hold A';
    g.teamBName = document.getElementById('teamBName').value || 'Hold B';

    const textLines = [
        'Aktuel kamp',
        '',
        `${g.teamAName}:`,
        `- Screens: ${g.stats.A.screens}`,
        `- Turnovers: ${g.stats.A.turnovers}`,
        `- Off. Rebounds: ${g.stats.A.offRebounds}`,
        '',
        `${g.teamBName}:`,
        `- Screens: ${g.stats.B.screens}`,
        `- Turnovers: ${g.stats.B.turnovers}`,
        `- Off. Rebounds: ${g.stats.B.offRebounds}`,
        '',
        `Gemte kampe i historik: ${state.games.length}`
    ];

    const text = textLines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => alert('Stats kopieret ✔'))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
        document.execCommand('copy');
        alert('Stats kopieret ✔');
    } catch (e) {
        alert('Kunne ikke kopiere automatisk. Marker og kopier manuelt:\n\n' + text);
    }
    document.body.removeChild(ta);
}

/* ===== History ===== */

function formatDateTime(isoString) {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} kl. ${hours}:${minutes}`;
}

function renderHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = '';

    if (!state.games.length) {
        const p = document.createElement('p');
        p.textContent = 'Ingen gemte kampe endnu.';
        p.className = 'empty-history';
        container.appendChild(p);
        return;
    }

    state.games.forEach(game => {
        const item = document.createElement('article');
        item.className = 'history-item';

        const header = document.createElement('div');
        header.className = 'history-item-header';
        header.innerHTML = `
            <span>Kamp #${game.id}</span>
            <span>${formatDateTime(game.createdAt)}</span>
        `;

        const teams = document.createElement('div');
        teams.className = 'history-item-teams';
        teams.textContent = `${game.teamAName} vs ${game.teamBName}`;

        const stats = document.createElement('div');
        stats.className = 'history-item-stats';
        stats.innerHTML = `
            ${game.teamAName}: S ${game.stats.A.screens}, TO ${game.stats.A.turnovers}, OR ${game.stats.A.offRebounds}<br>
            ${game.teamBName}: S ${game.stats.B.screens}, TO ${game.stats.B.turnovers}, OR ${game.stats.B.offRebounds}
        `;

        item.appendChild(header);
        item.appendChild(teams);
        item.appendChild(stats);
        container.appendChild(item);
    });
}

function clearHistory() {
    if (!state.games.length) return;
    if (!confirm('Slet AL kamp-historik på denne enhed?')) return;
    state.games = [];
    saveState();
    renderHistory();
}

/* ===== Event listeners ===== */

function setupEventListeners() {
    // store knapper + minus
    document.querySelectorAll('.stat-row-block').forEach(row => {
        const team = row.getAttribute('data-team');
        const stat = row.getAttribute('data-stat');
        const mainBtn = row.querySelector('.stat-main-btn');
        const minusBtn = row.querySelector('.stat-minus-btn');

        mainBtn.addEventListener('click', () => changeStat(team, stat, +1, mainBtn));
        minusBtn.addEventListener('click', () => changeStat(team, stat, -1, minusBtn));
    });

    document.getElementById('teamAName').addEventListener('change', e => {
        state.currentGame.teamAName = e.target.value || 'Hold A';
        saveState();
    });
    document.getElementById('teamBName').addEventListener('change', e => {
        state.currentGame.teamBName = e.target.value || 'Hold B';
        saveState();
    });

    document.getElementById('resetGameBtn').addEventListener('click', resetCurrentGame);
    document.getElementById('saveGameBtn').addEventListener('click', saveGameAndNew);
    document.getElementById('copyStatsBtn').addEventListener('click', copyStats);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
}

window.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadState();
});