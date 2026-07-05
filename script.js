const STORAGE_KEY = 'eliteLeagueState';
const ENTRY_FEE = 3000;
const YELLOW_CARD_FEE = 500;
const RED_CARD_FEE = 1000;
const ADMIN_PASSWORD = 'admin123';

let state = loadState();
let isAdmin = false;
let selectedWeek = 1;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    bindEvents();
    ensureFixtures();
    selectedWeek = 1;
    renderAll();
    console.log('Page initialization complete, selectedWeek:', selectedWeek);
});

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return createInitialState();
    }

    try {
        const data = JSON.parse(raw);
        return {
            teams: Array.isArray(data.teams) && data.teams.length
                ? data.teams.map((team, index) => ({
                    id: team.id || index + 1,
                    name: team.name || `Team ${index + 1}`,
                    p: Number(team.p) || 0,
                    w: Number(team.w) || 0,
                    d: Number(team.d) || 0,
                    l: Number(team.l) || 0,
                    gf: Number(team.gf) || 0,
                    ga: Number(team.ga) || 0,
                    gd: Number(team.gd) || 0,
                    pts: Number(team.pts) || 0
                }))
                : createDefaultTeams(),
            players: Array.isArray(data.players) ? data.players : [],
            fixtures: Array.isArray(data.fixtures) ? data.fixtures : [],
            disciplinary: Array.isArray(data.disciplinary) ? data.disciplinary : [],
            registrationRevenue: Number(data.registrationRevenue) || 0,
            disciplinaryRevenue: Number(data.disciplinaryRevenue) || 0,
            potw: data.potw || 'TBD',
            accountNumber: data.accountNumber || '0123456789',
            accountName: data.accountName || 'Elite League',
            adminPassword: data.adminPassword || ADMIN_PASSWORD
        };
    } catch (error) {
        console.error('Could not load saved state:', error);
        return createInitialState();
    }
}

function createInitialState() {
    return {
        teams: createDefaultTeams(),
        players: [],
        fixtures: [],
        knockoutFixtures: [],
        disciplinary: [],
        registrationRevenue: 0,
        disciplinaryRevenue: 0,
        potw: 'TBD',
        accountNumber: '0123456789',
        accountName: 'Elite League',
        adminPassword: ADMIN_PASSWORD
    };
}

function createDefaultTeams() {
    return Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        name: `Team ${index + 1}`,
        p: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0
    }));
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
    const adminButton = document.getElementById('admin-login-btn');
    if (adminButton) {
        adminButton.addEventListener('click', handleAdminLogin);
    }
    const playerForm = document.getElementById('player-form');
    if (playerForm) {
        playerForm.addEventListener('submit', handlePlayerRegistration);
    }
    const potwForm = document.getElementById('potw-form');
    if (potwForm) {
        potwForm.addEventListener('submit', handlePotwUpdate);
    }
    const renameForm = document.getElementById('team-rename-form');
    if (renameForm) {
        renameForm.addEventListener('submit', handleTeamRename);
    }
    const fixturesButton = document.getElementById('generate-fixtures-btn');
    if (fixturesButton) {
        fixturesButton.addEventListener('click', () => {
            state.fixtures = generateFixtures(state.teams);
            saveState();
            renderAll();
            alert('Fixtures regenerated.');
        });
    }
    const cardForm = document.getElementById('card-form');
    if (cardForm) {
        cardForm.addEventListener('submit', handleCardSubmit);
    }
    const weekSelect = document.getElementById('week-select');
    if (weekSelect) {
        weekSelect.addEventListener('change', handleWeekChange);
    }
    document.addEventListener('click', (event) => {
        if (event.target.classList && event.target.classList.contains('fixture-save-btn')) {
            handleFixtureSave(event);
        }
    });
}

function ensureFixtures() {
    console.log('ensureFixtures called, current fixtures count:', state.fixtures.length);
    if (!state.fixtures || state.fixtures.length === 0) {
        console.log('No fixtures found, generating new ones from 8 teams...');
        state.fixtures = generateFixtures(state.teams);
        console.log('Generated', state.fixtures.length, 'fixtures');
        state.fixtures.forEach(f => {
            if (!f.week) console.warn('Fixture missing week:', f);
        });
        saveState();
        console.log('Fixtures saved to localStorage');
    } else {
        console.log('Fixtures already exist:', state.fixtures.length);
    }
}

function generateFixtures(teams) {
    const teamIds = teams.map(team => team.id);
    const rounds = [];
    const rotating = [...teamIds];
    const fixed = rotating.shift();

    for (let round = 1; round < teamIds.length; round += 1) {
        const current = [fixed, ...rotating];
        const pairings = [];

        for (let pairIndex = 0; pairIndex < current.length / 2; pairIndex += 1) {
            const home = current[pairIndex];
            const away = current[current.length - 1 - pairIndex];
            if (home !== away) {
                pairings.push([home, away]);
            }
        }

        rounds.push(pairings);
        rotating.unshift(rotating.pop());
    }

    const fixtures = [];

    rounds.forEach((pairings, index) => {
        const week = index + 1;
        pairings.forEach((pair, pairIndex) => {
            const [homeId, awayId] = pair;
            fixtures.push({
                id: `W${week}-${homeId}-${awayId}-${pairIndex + 1}`,
                week,
                homeTeamId: homeId,
                awayTeamId: awayId,
                homeScore: null,
                awayScore: null,
                scorers: [],
                assisters: [],
                played: false
            });
        });
    });

    rounds.forEach((pairings, index) => {
        const week = index + 1 + rounds.length;
        pairings.forEach((pair, pairIndex) => {
            const [homeId, awayId] = pair;
            fixtures.push({
                id: `W${week}-${awayId}-${homeId}-${pairIndex + 1}`,
                week,
                homeTeamId: awayId,
                awayTeamId: homeId,
                homeScore: null,
                awayScore: null,
                scorers: [],
                assisters: [],
                played: false
            });
        });
    });

    return fixtures;
}

function renderAll() {
    try {
        renderLeagueTable();
        renderTeamList();
        renderTopScorers();
        renderTopAssisters();
        renderDisciplinary();
        renderWeekSelect();
        renderFixtures();        renderKnockoutSection();        renderFinance();
        renderAccountInfo();
        renderAdminSelects();
        const adminControls = document.getElementById('admin-controls');
        if (adminControls) {
            adminControls.hidden = !isAdmin;
        }
    } catch (error) {
        console.error('Error in renderAll:', error);
    }
}

function renderLeagueTable() {
    const tbody = document.getElementById('league-table');
    const sorted = [...state.teams].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    tbody.innerHTML = sorted.map(team => `
        <tr>
            <td>${team.name}</td>
            <td>${team.p}</td>
            <td>${team.w}</td>
            <td>${team.d}</td>
            <td>${team.l}</td>
            <td>${team.gf}</td>
            <td>${team.ga}</td>
            <td>${team.gd}</td>
            <td>${team.pts}</td>
        </tr>
    `).join('');
}

function renderTeamList() {
    const container = document.getElementById('team-list');
    container.innerHTML = state.teams.map(team => {
        const players = state.players.filter(player => player.teamId === team.id);
        return `
            <article class="team-card">
                <h3>${team.name}</h3>
                <p>${players.length}/10 players</p>
                <ul>
                    ${players.length ? players.map(player => `<li>${player.name}</li>`).join('') : '<li>No players assigned yet</li>'}
                </ul>
            </article>
        `;
    }).join('');
}

function renderTopScorers() {
    const tbody = document.getElementById('scorers-table');
    const ranked = [...state.players].filter(player => player.goals > 0).sort((a, b) => b.goals - a.goals);

    tbody.innerHTML = ranked.length
        ? ranked.map(player => `<tr><td>${player.name}</td><td>${player.goals}</td></tr>`).join('')
        : '<tr><td colspan="2">No goals yet</td></tr>';
}

function renderTopAssisters() {
    const tbody = document.getElementById('assists-table');
    const ranked = [...state.players].filter(player => player.assists > 0).sort((a, b) => b.assists - a.assists);

    tbody.innerHTML = ranked.length
        ? ranked.map(player => `<tr><td>${player.name}</td><td>${player.assists}</td></tr>`).join('')
        : '<tr><td colspan="2">No assists yet</td></tr>';
}

function renderDisciplinary() {
    const tbody = document.getElementById('disciplinary-table');
    tbody.innerHTML = state.disciplinary.length
        ? state.disciplinary.map(record => {
            const player = state.players.find(item => item.name === record.playerName);
            const paidStatus = player?.paidRegistration ? 'Paid' : 'Unpaid';
            return `<tr><td>${record.playerName}</td><td>${record.type === 'yellow' ? 'Yellow' : 'Red'}</td><td>${record.amount}</td><td>${paidStatus}</td></tr>`;
        }).join('')
        : '<tr><td colspan="4">No disciplinary records yet</td></tr>';
}

function renderFixtures() {
    const container = document.getElementById('fixtures-list');
    if (!container) {
        console.error('Fixtures container not found');
        return;
    }

    const selected = selectedWeek || 1;
    console.log('renderFixtures: selectedWeek =', selectedWeek, ', selected =', selected);
    console.log('renderFixtures: Total fixtures:', state.fixtures.length);

    const filtered = state.fixtures.filter(fixture => fixture.week === selected);
    console.log('Fixtures for week', selected, ':', filtered.length);

    if (!filtered || filtered.length === 0) {
        if (!state.fixtures || state.fixtures.length === 0) {
            container.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No fixtures yet. Fixtures will be auto-generated.</td></tr>`;
        } else {
            container.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No fixtures for Week ${selected}</td></tr>`;
        }
        return;
    }

    container.innerHTML = filtered.map(fixture => {
        const homeTeam = getTeamById(fixture.homeTeamId);
        const awayTeam = getTeamById(fixture.awayTeamId);
        return `
            <tr data-fixture-id="${fixture.id}" class="fixture-row ${fixture.played ? 'played' : ''}">
                <td>${homeTeam.name} vs ${awayTeam.name}</td>
                <td>
                    <div class="score-row">
                        <input class="fixture-input" type="number" name="homeScore" min="0" value="${fixture.homeScore ?? ''}" ${fixture.played ? 'disabled' : ''}>
                        <span class="fixture-vs">-</span>
                        <input class="fixture-input" type="number" name="awayScore" min="0" value="${fixture.awayScore ?? ''}" ${fixture.played ? 'disabled' : ''}>
                    </div>
                </td>
                <td><input class="fixture-input" type="text" name="scorers" placeholder="Example: John, Mike" value="${(fixture.scorers || []).join(', ')}" ${fixture.played ? 'disabled' : ''}></td>
                <td><input class="fixture-input" type="text" name="assisters" placeholder="Example: Ray" value="${(fixture.assisters || []).join(', ')}" ${fixture.played ? 'disabled' : ''}></td>
                <td><button type="button" class="fixture-save-btn" data-fixture-id="${fixture.id}" ${fixture.played ? 'disabled' : ''}>Save</button></td>
            </tr>
        `;
    }).join('');
}

function renderFinance() {
    document.getElementById('registration-revenue').textContent = `₦${state.registrationRevenue.toLocaleString()}`;
    document.getElementById('disciplinary-revenue').textContent = `₦${state.disciplinaryRevenue.toLocaleString()}`;
    document.getElementById('league-balance').textContent = `₦${(state.registrationRevenue + state.disciplinaryRevenue).toLocaleString()}`;
    document.getElementById('header-balance').textContent = `₦${(state.registrationRevenue + state.disciplinaryRevenue).toLocaleString()}`;
}

function renderAccountInfo() {
    document.getElementById('account-display').textContent = `Transfer fees to: ${state.accountNumber} (${state.accountName})`;
    document.getElementById('potw-display').textContent = state.potw;
    document.getElementById('header-balance').textContent = `₦${(state.registrationRevenue + state.disciplinaryRevenue).toLocaleString()}`;
}

function renderWeekSelect() {
    const select = document.getElementById('week-select');
    if (!select) {
        console.error('Week select element not found');
        return;
    }

    const weeks = [...new Set(state.fixtures.map(fixture => fixture.week))].sort((a, b) => a - b);
    console.log('Available weeks:', weeks);

    if (!weeks.length) {
        select.innerHTML = '<option value="1">Week 1</option>';
        selectedWeek = 1;
        console.log('No weeks found, defaulting to Week 1');
        return;
    }

    if (!weeks.includes(selectedWeek)) {
        selectedWeek = weeks[0];
    }

    select.innerHTML = weeks.map(week => `<option value="${week}" ${week === selectedWeek ? 'selected' : ''}>Week ${week}</option>`).join('');
    select.disabled = !isAdmin;
}

function handleWeekChange(event) {
    selectedWeek = Number(event.target.value);
    renderFixtures();
}

function renderAdminSelects() {
    const potwSelect = document.getElementById('potw-player');
    const cardPlayerSelect = document.getElementById('card-player');
    const teamRenameSelect = document.getElementById('team-rename-select');

    if (!potwSelect || !cardPlayerSelect || !teamRenameSelect) {
        return;
    }

    const options = state.players.length
        ? state.players.map(player => `<option value="${player.name}">${player.name}</option>`).join('')
        : '<option value="">No players registered yet</option>';

    potwSelect.innerHTML = options;
    cardPlayerSelect.innerHTML = options;

    const teamOptions = state.teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
    teamRenameSelect.innerHTML = teamOptions;

    if (state.players.length) {
        if (!state.players.some(player => player.name === potwSelect.value)) {
            potwSelect.value = state.players[0].name;
        }
        if (!state.players.some(player => player.name === cardPlayerSelect.value)) {
            cardPlayerSelect.value = state.players[0].name;
        }
    }
}

function handleTeamRename(event) {
    event.preventDefault();
    if (!isAdmin) {
        alert('Unlock admin mode first.');
        return;
    }

    const teamId = Number(document.getElementById('team-rename-select').value);
    const newName = document.getElementById('team-new-name').value.trim();

    if (!newName) {
        alert('Enter a new team name.');
        return;
    }

    const team = state.teams.find(item => item.id === teamId);
    if (!team) {
        alert('Select a valid team to rename.');
        return;
    }

    team.name = newName;
    saveState();
    renderAll();
    document.getElementById('team-new-name').value = '';
    alert(`Team renamed to ${newName}.`);
}

function handleAdminLogin() {
    const passInput = document.getElementById('admin-pass');
    const enteredPassword = passInput ? passInput.value : '';
    const storedPassword = state.adminPassword || ADMIN_PASSWORD;

    console.log('Login attempt:', { enteredPassword, storedPassword });

    if (enteredPassword === storedPassword) {
        isAdmin = true;
        console.log('Admin login successful, isAdmin is now:', isAdmin);
        passInput.value = '';
        renderAll();
        console.log('After renderAll, admin-controls hidden should be false');
        alert('Admin unlocked.');
    } else {
        console.log('Wrong password entered');
        alert('Wrong password.');
    }
}

function handlePlayerRegistration(event) {
    event.preventDefault();
    if (!isAdmin) {
        alert('Unlock admin mode first.');
        return;
    }

    const playerName = document.getElementById('player-name').value.trim();
    const paid = document.getElementById('paid-fee').checked;

    if (!playerName) {
        alert('Enter a player name.');
        return;
    }

    if (state.players.some(player => player.name.toLowerCase() === playerName.toLowerCase())) {
        alert('That player is already registered.');
        return;
    }

    let teamId = null;
    if (paid) {
        teamId = pickRandomTeamId();
        if (!teamId) {
            alert('All teams are full.');
            return;
        }
        state.registrationRevenue += ENTRY_FEE;
    }

    state.players.push({
        id: Date.now(),
        name: playerName,
        teamId,
        paidRegistration: paid,
        goals: 0,
        assists: 0
    });

    saveState();
    renderAll();
    event.target.reset();
    alert(paid ? `Registered ${playerName} to a random team.` : `${playerName} added as an unpaid player.`);
}

function pickRandomTeamId() {
    const eligibleTeams = state.teams.filter(team => getTeamRoster(team.id).length < 10);
    if (!eligibleTeams.length) {
        return null;
    }
    return eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)].id;
}

function getTeamRoster(teamId) {
    return state.players.filter(player => player.teamId === teamId);
}

function handlePotwUpdate(event) {
    event.preventDefault();
    if (!isAdmin) {
        alert('Unlock admin mode first.');
        return;
    }

    const selected = document.getElementById('potw-player').value;
    state.potw = selected || 'TBD';
    saveState();
    renderAccountInfo();
}

function handleCardSubmit(event) {
    event.preventDefault();
    if (!isAdmin) {
        alert('Unlock admin mode first.');
        return;
    }

    const playerName = document.getElementById('card-player').value;
    const type = document.getElementById('card-type').value;
    const player = state.players.find(item => item.name === playerName);

    if (!player) {
        alert('Register a player before recording cards.');
        return;
    }

    const amount = type === 'yellow' ? YELLOW_CARD_FEE : RED_CARD_FEE;
    state.disciplinary.push({
        id: Date.now(),
        playerName: player.name,
        type,
        amount,
        paid: player.paidRegistration
    });
    state.disciplinaryRevenue += amount;

    saveState();
    renderAll();
    alert(`${player.name} has a ${type === 'yellow' ? 'yellow' : 'red'} card recorded.`);
}

function handleFixtureSave(event) {
    if (!isAdmin) {
        alert('Unlock admin mode first.');
        return;
    }

    const button = event.target;
    const row = button.closest('tr');
    if (!row) {
        return;
    }

    const fixtureId = button.dataset.fixtureId;
    const fixture = state.fixtures.find(item => item.id === fixtureId);
    if (!fixture) {
        return;
    }
    if (fixture.played) {
        alert('This fixture has already been recorded.');
        return;
    }

    const homeScore = Number(row.querySelector('input[name="homeScore"]').value);
    const awayScore = Number(row.querySelector('input[name="awayScore"]').value);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
        alert('Both scores are required.');
        return;
    }

    const scorers = parseList(row.querySelector('input[name="scorers"]').value);
    const assisters = parseList(row.querySelector('input[name="assisters"]').value);

    fixture.homeScore = homeScore;
    fixture.awayScore = awayScore;
    fixture.scorers = scorers;
    fixture.assisters = assisters;
    fixture.played = true;

    updateTableForFixture(fixture);
    updatePlayerStats(scorers, assisters);
    saveState();
    renderAll();
    alert('Fixture result saved.');
}

function parseList(value) {
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

function updateTableForFixture(fixture) {
    const home = getTeamById(fixture.homeTeamId);
    const away = getTeamById(fixture.awayTeamId);

    home.p += 1;
    away.p += 1;
    home.gf += fixture.homeScore;
    home.ga += fixture.awayScore;
    away.gf += fixture.awayScore;
    away.ga += fixture.homeScore;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (fixture.homeScore > fixture.awayScore) {
        home.w += 1;
        away.l += 1;
        home.pts += 3;
    } else if (fixture.homeScore < fixture.awayScore) {
        away.w += 1;
        home.l += 1;
        away.pts += 3;
    } else {
        home.d += 1;
        away.d += 1;
        home.pts += 1;
        away.pts += 1;
    }
}

function updatePlayerStats(scorers, assisters) {
    scorers.forEach(name => {
        const player = state.players.find(item => item.name.toLowerCase() === name.toLowerCase());
        if (player) {
            player.goals += 1;
        }
    });

    assisters.forEach(name => {
        const player = state.players.find(item => item.name.toLowerCase() === name.toLowerCase());
        if (player) {
            player.assists += 1;
        }
    });
}

function getTeamById(teamId) {
    return state.teams.find(team => team.id === teamId);
}

function isRegularSeasonComplete() {
    const maxWeek = Math.max(...state.fixtures.map(f => f.week || 0), 0);
    return maxWeek >= 14;
}

function getTop6Teams() {
    const sorted = [...state.teams].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return sorted.slice(0, 6);
}

function generateKnockoutFixtures() {
    const top6 = getTop6Teams();
    if (top6.length < 6) return [];

    const knockout = [];
    const [first, second, third, fourth, fifth, sixth] = top6.map(t => t.id);

    knockout.push({
        id: 'KO-QF1',
        round: 'Quarter-Final 1',
        homeTeamId: sixth,
        awayTeamId: third,
        homeScore: null,
        awayScore: null,
        scorers: [],
        assisters: [],
        played: false
    });

    knockout.push({
        id: 'KO-QF2',
        round: 'Quarter-Final 2',
        homeTeamId: fifth,
        awayTeamId: fourth,
        homeScore: null,
        awayScore: null,
        scorers: [],
        assisters: [],
        played: false
    });

    knockout.push({
        id: 'KO-SF1',
        round: 'Semi-Final 1',
        homeTeamId: first,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        scorers: [],
        assisters: [],
        played: false,
        pending: 'Awaits QF1 winner'
    });

    knockout.push({
        id: 'KO-SF2',
        round: 'Semi-Final 2',
        homeTeamId: second,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        scorers: [],
        assisters: [],
        played: false,
        pending: 'Awaits QF2 winner'
    });

    knockout.push({
        id: 'KO-F',
        round: 'Final',
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        scorers: [],
        assisters: [],
        played: false,
        pending: 'Awaits SF winners'
    });

    return knockout;
}

function renderKnockoutSection() {
    const section = document.getElementById('knockout-section');
    if (!section) {
        console.log('Knockout section not found in DOM');
        return;
    }

    if (!isRegularSeasonComplete()) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (state.knockoutFixtures.length === 0) {
        console.log('Generating knockout fixtures...');
        state.knockoutFixtures = generateKnockoutFixtures();
        saveState();
    }

    const container = section.querySelector('#knockout-list');
    if (!container) {
        console.error('Knockout list container not found');
        return;
    }

    const top6 = getTop6Teams();
    const roundsDisplay = ['Quarter-Final 1', 'Quarter-Final 2', 'Semi-Final 1', 'Semi-Final 2', 'Final'];

    container.innerHTML = state.knockoutFixtures.map(fixture => {
        let homeTeam = fixture.homeTeamId ? getTeamById(fixture.homeTeamId) : null;
        let awayTeam = fixture.awayTeamId ? getTeamById(fixture.awayTeamId) : null;

        const homeTeamName = homeTeam ? homeTeam.name : (fixture.pending || 'TBD');
        const awayTeamName = awayTeam ? awayTeam.name : (fixture.pending || 'TBD');
        const disabled = !fixture.played && (!fixture.awayTeamId || !fixture.homeTeamId);

        return `
            <tr data-fixture-id="${fixture.id}" class="fixture-row knockout-row ${fixture.played ? 'played' : ''}">
                <td><strong>${fixture.round}</strong></td>
                <td>${homeTeamName} vs ${awayTeamName}</td>
                <td>
                    <div class="score-row">
                        <input class="fixture-input" type="number" name="homeScore" min="0" value="${fixture.homeScore ?? ''}" ${fixture.played || disabled ? 'disabled' : ''}>
                        <span class="fixture-vs">-</span>
                        <input class="fixture-input" type="number" name="awayScore" min="0" value="${fixture.awayScore ?? ''}" ${fixture.played || disabled ? 'disabled' : ''}>
                    </div>
                </td>
                <td><input class="fixture-input" type="text" name="scorers" placeholder="Scorers" value="${(fixture.scorers || []).join(', ')}" ${fixture.played || disabled ? 'disabled' : ''}></td>
                <td><button type="button" class="fixture-save-btn knockout-save-btn" data-fixture-id="${fixture.id}" ${fixture.played || disabled ? 'disabled' : ''}>Save</button></td>
            </tr>
        `;
    }).join('');
}