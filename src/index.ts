import { Elysia, status, file } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { TeamQueue } from "./team_queue";

const api = new Elysia({ prefix: "/api" })
	.state("queue", new TeamQueue())
	.get("/health", () => "Health")
	.post("/join_queue/:team", ({ params: { team }, store: { queue } }) => {
		console.log(`joined: ${team}`);
		queue.queue_team(team);

		return status(200);
	})
	.post("/leave_queue/:team", ({ params: { team }, store: { queue } }) => {
		console.log(`leave: ${team}`);
		queue.remove_team(team);

		return status(200);
	})
	.get("/get_queue", ({ store: { queue } }) => {
		return queue.waiting_teams;
	})
	.get("/request_team", ({ store: { queue } }) => {
		const new_match = queue.new_match();
		if (new_match == undefined) {
			return status(204);
		}

		return new_match;
	});

const app = new Elysia()
	.use(api)
	.use(staticPlugin({ assets: "frontend/dist", prefix: "/" }))
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
