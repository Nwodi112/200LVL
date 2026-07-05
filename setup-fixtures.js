// Auto-setup fixtures - clears old state and creates proper weekly rotation
(function setupFixtures() {
    console.log('Initializing Elite League fixtures...');
    
    // ALWAYS regenerate fixtures to ensure proper rotation
    // Create 8 default teams
    const teams = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        p: 0, w: 0, d: 0, l: 0,
        gf: 0, ga: 0, gd: 0, pts: 0
    }));
    
    // Proper round-robin: 4 matches per week, each team plays once per week
    const fixtures = [];
    let fixtureId = 1;
    
    // Use standard round-robin algorithm
    // Week 1-7: First round
    for (let week = 1; week <= 7; week++) {
        // Pairing for 8 teams: (1,8), (2,7), (3,6), (4,5) then rotate
        for (let i = 0; i < 4; i++) {
            const home = ((i + week - 1) % 8) + 1;
            const away = (((7 - i) + week - 1) % 8) + 1;
            
            if (home !== away) {
                fixtures.push({
                    id: fixtureId++,
                    week: week,
                    homeTeamId: home,
                    awayTeamId: away,
                    homeScore: null,
                    awayScore: null,
                    scorers: [],
                    assisters: [],
                    played: false
                });
            }
        }
    }
    
    // Week 8-14: Return fixtures (away becomes home, home becomes away)
    const firstRound = fixtures.slice();
    for (let week = 8; week <= 14; week++) {
        const weekIndex = week - 8;
        const matchesThisWeek = firstRound.filter(f => f.week === weekIndex + 1);
        
        matchesThisWeek.forEach(match => {
            fixtures.push({
                id: fixtureId++,
                week: week,
                homeTeamId: match.awayTeamId,
                awayTeamId: match.homeTeamId,
                homeScore: null,
                awayScore: null,
                scorers: [],
                assisters: [],
                played: false
            });
        });
    }
    
    // Load existing state to preserve players, disciplinary, etc.
    let existingState = JSON.parse(localStorage.getItem('eliteLeagueState'));
    
    let state = {
        teams: existingState?.teams || teams,
        players: existingState?.players || [],
        fixtures: fixtures,  // ALWAYS update with new fixtures
        knockoutFixtures: existingState?.knockoutFixtures || [],
        disciplinary: existingState?.disciplinary || [],
        registrationRevenue: existingState?.registrationRevenue || 0,
        disciplinaryRevenue: existingState?.disciplinaryRevenue || 0,
        potw: existingState?.potw || 'TBD',
        accountNumber: existingState?.accountNumber || '0123456789',
        accountName: existingState?.accountName || 'Elite League',
        adminPassword: existingState?.adminPassword || 'admin123'
    };
    
    // Save to localStorage
    localStorage.setItem('eliteLeagueState', JSON.stringify(state));
    
    console.log(`✅ Fixtures regenerated!`);
    console.log(`📅 Total fixtures: ${state.fixtures.length}`);
    console.log(`📊 Format: 4 matches per week, each team plays once weekly`);
    console.log(`📋 Weeks 1-7: First round | Weeks 8-14: Return fixtures`);
})();
