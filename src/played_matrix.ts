import { Alliance, MatchCandidate } from "./team_queue";

export class PlayedMatrix {
    map: Map<string, [number, number]>;

    constructor(teams: string[]) {
        this.map = new Map();
        teams.forEach((team) => {
            teams.forEach((other) => {
                this.map.set(this.make_pair(team, other), [0, 0]);
            });
        });
    }

    make_pair(team1: string, team2: string): string {
        return [team1, team2].sort().join("+");
    }

    new_team(team: string) {
        [...this.map.keys(), team].forEach((other_team) => {
            const pair = this.make_pair(team, other_team);
            this.map.set(pair, [0, 0]);
        });
    }

    get_matches_waited(team: string): number | undefined {
        const played = this.map.get(team);
        if (!played) return;

        return played[1];
    }

    get_matches_played(team: string): number | undefined {
        const played = this.map.get(team);
        if (!played) return;

        return played[0];
    }

    get_matches_played_together(
        team1: string,
        team2: string,
    ): number | undefined {
        const pair = this.make_pair(team1, team2);
        const played = this.map.get(pair);
        if (!played) {
            console.error("Two Teams Requested That Had No Joint Entry");
            return;
        }

        return played[0];
    }

    get_matches_played_against(
        team1: string,
        team2: string,
    ): number | undefined {
        const pair = this.make_pair(team1, team2);
        const played = this.map.get(pair);
        if (!played) {
            console.error("Two Teams Requested That Had No Joint Entry");
            return;
        }

        return played[1];
    }

    new_match_played(match: MatchCandidate) {
        const insert_alliance = (alliance: Alliance) => {
            alliance.forEach((team) => {
                alliance.forEach((other_team) => {
                    const pair = this.make_pair(team, other_team);
                    let current = this.map.get(pair);
                    if (!current) {
                        console.error(
                            "Two Teams Played That Had No Joint Entry",
                            team,
                            other_team,
                        );
                        return;
                    }
                    current[0] += 1;
                    this.map.set(pair, current);
                });
            });
        };
        insert_alliance(match.red);
        insert_alliance(match.blue);

        match.red.forEach((team) => {
            match.blue.forEach((other_team) => {
                const pair = this.make_pair(team, other_team);
                let current = this.map.get(pair);
                if (!current) {
                    console.error(
                        "Two Teams Played That Had No Joint Entry",
                        team,
                        other_team,
                    );
                    return;
                }
                current[1] += 1;
                this.map.set(pair, current);
            });
        });
    }

    new_match_spent_waiting(team: string) {
        const data = this.map.get(this.make_pair(team, team));
        if (!data) return;
        data[1]++;
    }

    contains_team(team: string): boolean {
        return this.map.has(team);
    }
}
