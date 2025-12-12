import { shuffleList, sum } from "./utils";
import { TopQueue } from "./top_queue";
import { PlayedMatrix } from "./played_matrix";

const HEURISTIC_ITERATION_COUNT = 100;

export type Alliance = [string, string, string];
export type MatchCandidate = {
    red: Alliance;
    blue: Alliance;
};

export class TeamQueue {
    waiting_teams: string[] = [];
    played_matrix: PlayedMatrix;

    constructor(teams: string[]) {
        this.played_matrix = new PlayedMatrix(teams);
    }

    /*
     * Generates a random match, removing the selected teams from the queue
     */
    generate_random_match(): MatchCandidate {
        shuffleList(this.waiting_teams);

        return {
            red: [
                this.waiting_teams.pop()!,
                this.waiting_teams.pop()!,
                this.waiting_teams.pop()!,
            ],
            blue: [
                this.waiting_teams.pop()!,
                this.waiting_teams.pop()!,
                this.waiting_teams.pop()!,
            ],
        };
    }

    /*
     * Returns an array representing how many times each team in the match has played in total throughout the event
     * For considering which matches are better, lower scores are preferred
     */
    has_played_scores(match: MatchCandidate): [string, number][] {
        const has_played_score = (alliance: Alliance) =>
            alliance.map(
                (team) =>
                    [team, this.played_matrix.get_matches_played(team)!] as [
                        string,
                        number,
                    ],
            );

        return [
            ...has_played_score(match.red),
            ...has_played_score(match.blue),
        ];
    }

    /*
     * Returns an array representing the number of matches each team has been waiting in the queue for
     * For considering which matches are better, higher scores are preferred
     */
    waiting_in_queue_scores(match: MatchCandidate): [string, number][] {
        const has_played_score = (alliance: Alliance) =>
            alliance.map(
                (team) =>
                    [team, this.played_matrix.get_matches_waited(team)!] as [
                        string,
                        number,
                    ],
            );

        return [
            ...has_played_score(match.red),
            ...has_played_score(match.blue),
        ];
    }

    /*
     * Returns an array representing the number of times each team has played with each other team on its own alliance
     * For considering which matches are better, lower scores are preferred
     */
    played_together_scores(match: MatchCandidate): [string, number][] {
        const count_together_scores = (alliance: Alliance) =>
            alliance.map(
                (team1) =>
                    [
                        team1,
                        alliance
                            .map((team2) => {
                                return this.played_matrix.get_matches_played_together(
                                    team1,
                                    team2,
                                )!;
                            })
                            .reduce((acc, val) => acc + val),
                    ] as [string, number],
            );

        let red = count_together_scores(match.red);
        let blue = count_together_scores(match.blue);

        return [...blue, ...red];
    }

    /*
     * Returns the sum of how many times each team has played with each other team on its own alliance
     * For considering which matches are better, lower scores are preferred
     */
    played_against_scores(match: MatchCandidate): [string, number][] {
        const count_against_scores = (alliance: Alliance, other: Alliance) =>
            alliance.map(
                (team1) =>
                    [
                        team1,
                        other
                            .map((team2) => {
                                return this.played_matrix.get_matches_played_against(
                                    team1,
                                    team2,
                                )!;
                            })
                            .reduce((acc, val) => acc + val),
                    ] as [string, number],
            );

        const red = count_against_scores(match.red, match.blue);
        const blue = count_against_scores(match.blue, match.red);

        return [...blue, ...red];
    }

    compare_matches(one: MatchCandidate, two: MatchCandidate): number {
        return this.match_score(one) - this.match_score(two);
    }

    /*
     * Calculates the score for a given match; a lower score being less more desirable
     * It uses the following factors in the following order:
     * 1. The number of matches each team has been waiting in the queue for
     * 2. The number of times each team has played (more times -> higherscore)
     *  - However, if a team hasn't played at all, them playing is greatly prioritized
     * 3. The number times each team has played with other teams on its alliance
     * 4. The number times each team has played against other teams on the opposing alliance
     */
    match_score(match: MatchCandidate): number {
        const has_played = sum(
            this.has_played_scores(match).map(([_team, score]) => score),
        );
        const together = sum(
            this.played_together_scores(match).map(([_team, score]) => score),
        );
        const against = sum(
            this.played_against_scores(match).map(([_team, score]) => score),
        );
        const been_waiting = -sum(
            this.waiting_in_queue_scores(match).map(([_team, score]) => score),
        );

        return has_played + together + against + been_waiting;
    }

    /*
     * Finds the team in the match that brings the match's score up the most
     */
    find_worst_team(match: MatchCandidate): string | undefined {
        const has_played_scores = this.has_played_scores(match);
        const been_waiting_scores = this.waiting_in_queue_scores(match);
        const played_against_scores = this.played_against_scores(match);
        const played_together_scores = this.played_together_scores(match);

        let worst = 0;
        let worst_team;

        for (let i = 0; i < played_against_scores.length; i++) {
            const [team, has] = has_played_scores[i];
            const [_, waiting] = been_waiting_scores[i];
            const [__, against] = played_against_scores[i];
            const [___, together] = played_together_scores[i];

            const total = against + together + has - waiting;
            if (total > worst) {
                worst_team = team;
                worst = total;
            }
        }

        return worst_team;
    }

    /*
     * Finds the worst team in a match, then returns a new match with that team replaced with a random other team
     *
     * If there is no valid replacement (eg. if the queue is empty), then undefined is returned
     */
    adjust_match(
        match: MatchCandidate,
        matches: TopQueue<MatchCandidate>,
    ): MatchCandidate | undefined {
        const cloned_match = JSON.parse(
            JSON.stringify(match),
        ) as MatchCandidate;
        const worst_team = this.find_worst_team(cloned_match);
        if (!worst_team) return;

        let count = 0;
        let new_team;
        // Loop until we find a match we haven't used before
        // Or we run out if there was a bug or something
        while (true) {
            count++;
            // Remove the worst team
            shuffleList(this.waiting_teams);
            new_team = this.waiting_teams.pop()!;

            // Puts the worst team back in the queue for later (before we could early return)
            this.queue_team(worst_team);

            if (new_team == undefined || count > 10) {
                // We have no other options for matches here
                return;
            }

            if (!matches.queue.includes(match)) {
                // Pops the `worst_team` off again
                this.waiting_teams.pop();
                this.queue_team(new_team);
                break;
            }
        }

        const red_i = cloned_match.red.indexOf(worst_team);
        if (red_i != -1) {
            // The order here shouldn't matter since we're only removing one element and pushing, not inserting
            cloned_match.red.push(new_team);
            cloned_match.red.splice(red_i, 1);
        } else {
            const blue_i = cloned_match.blue.indexOf(worst_team);
            if (blue_i == -1) {
                cloned_match.blue.push(new_team);
                cloned_match.blue.splice(blue_i, 1);
            }
        }

        return cloned_match;
    }

    /*
     * Finds and returns the best possible match in the list, capped after `HEURISTIC_ITERATION_COUNT` iterations
     */
    determine_best_match(): MatchCandidate {
        const initial = this.generate_random_match();
        if (this.waiting_teams.length === 0) return initial;

        const matches = new TopQueue([initial], this.compare_matches);

        for (let i = 0; i < HEURISTIC_ITERATION_COUNT; i++) {
            const new_match = this.adjust_match(matches.top, matches);
            if (new_match == undefined) {
                break;
            }
            matches.push(new_match);
        }

        return matches.top;
    }

    /*
     * Creates a new match, removing all participating teams from the waiting queue adjusting data on which teams have/haven't played
     */
    new_match(): MatchCandidate | undefined {
        if (this.waiting_teams.length < 6) {
            return;
        }

        const best_match = this.determine_best_match();

        this.played_matrix.new_match_played(best_match);
        this.waiting_teams.forEach((team) => {
            this.played_matrix.new_match_spent_waiting(team);
        });

        return best_match;
    }

    /*
     * Adds a team to the queue if it isn't already present.
     *
     * If the team isn't present in the team matrix, it is inserted there as well.
     *
     * Returns whether the team was inserted into the queue.
     */
    queue_team(team: string): boolean {
        if (this.waiting_teams.includes(team)) return false;

        if (!this.played_matrix.contains_team(team)) {
            this.played_matrix.new_team(team);
        }
        this.waiting_teams.push(team);

        return true;
    }

    /*
     * Removes a team from the queue if it isn't already present.
     *
     *Returns whether the team was removed from the queue.
     */
    remove_team(team: string): boolean {
        const i = this.waiting_teams.indexOf(team);
        if (i == -1) {
            return false;
        }

        this.waiting_teams.splice(i, 1);

        return true;
    }
}
