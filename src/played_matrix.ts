import { Alliance, MatchCandidate } from "./team_queue";

export class PlayedMatrix {
	map: Map<string, [number, number]>;

	constructor() {
		this.map = new Map();
	}

	make_pair(team1: string, team2: string): string {
		return [team1, team2].sort().join("+");
	}

	new_team(team: string) {
		[...this.map.keys()].forEach((other_team) => {
			const pair = this.make_pair(team, other_team);
			this.map.set(pair, [0, 0]);
		});
		this.map.set(team, [0, 0]);
	}

	get_matches_played(team: string): number | undefined {
		const played = this.map.get(team);
		if (!played) return;

		played[0];
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

	get_matches_played_against(team1: string, team2: string): number | undefined {
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
						console.error("Two Teams Played That Had No Joint Entry");
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
					console.error("Two Teams Played That Had No Joint Entry");
					return;
				}
				current[1] += 1;
				this.map.set(pair, current);
			});
		});
	}

	contains_team(team: string): boolean {
		return this.map.has(team);
	}
}
