import { Elysia, status, file } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { TeamQueue } from "./team_queue";
import { Server, Socket } from "socket.io";

const Log = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	underscore: "\x1b[4m",
	blink: "\x1b[5m",
	reverse: "\x1b[7m",
	hidden: "\x1b[8m",
	// Foreground (text) colors
	fg: {
		black: "\x1b[30m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		blue: "\x1b[34m",
		magenta: "\x1b[35m",
		cyan: "\x1b[36m",
		white: "\x1b[37m",
		crimson: "\x1b[38m",
	},
	// Background colors
	bg: {
		black: "\x1b[40m",
		red: "\x1b[41m",
		green: "\x1b[42m",
		yellow: "\x1b[43m",
		blue: "\x1b[44m",
		magenta: "\x1b[45m",
		cyan: "\x1b[46m",
		white: "\x1b[47m",
		crimson: "\x1b[48m",
	},
};

function log(color: string, text: string) {
	console.log(`${color}%s${Log.reset}`, text);
}

function info(text: string) {
	log(Log.fg.green, text);
}

function warn(text: string) {
	log(Log.fg.yellow, text);
}

const api = new Elysia({ prefix: "/api" })
	.state("queue", new TeamQueue())
	.get("/health", () => "Health")
	.post("/join_queue/:team", ({ params: { team }, store: { queue } }) => {
		const added = queue.queue_team(team);
		if (!added) {
			warn(`Team ${team} Attempted To Join`);
			return status(204);
		}

		info(`Team ${team} Joined`);
		return status(200);
	})
	.post("/leave_queue/:team", ({ params: { team }, store: { queue } }) => {
		const removed = queue.remove_team(team);
		if (!removed) {
			warn(`Team ${team} Attempted To Leave`);
			return status(204);
		}

		info(`Team ${team} Left`);
		return status(200);
	})
	.get("/get_queue", ({ store: { queue } }) => {
		return queue.waiting_teams;
	})
	.get("/new_match", ({ store: { queue } }) => {
		const new_match = queue.new_match();
		if (!new_match) {
			return status(204);
		}

		info(`\x1b[31mNew Match Queued:\x1b`);
		log(Log.fg.red, `Red: ${new_match?.red}`);
		log(Log.fg.red, `Blue: ${new_match?.blue}`);

		return new_match;
	});

const app = new Elysia()
	.use(api)
	.ws("/ws", {
		open(ws) {
			info(`Team ${ws.id} Connected`);
			ws.subscribe("join_queue");
			ws.subscribe("leave_queue");
		},
		message(ws, message) {
			ws.send(message);
		},
		close(ws) {
			warn(`Team ${ws.id} Left`);
		},
	})
	.use(staticPlugin({ assets: "frontend/dist", prefix: "/" }))
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
