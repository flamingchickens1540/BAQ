import { Elysia, status, t } from "elysia";
import { MatchCandidate, TeamQueue } from "./team_queue";
import Logger from "./logger";
import { ServerWebSocket } from "bun";
import jwt from "@elysiajs/jwt";
import dotenv from "dotenv";
import cors from "@elysiajs/cors";

dotenv.config({ path: ".env" });

type TeamData = {
    team: string;
    password: string;
};
type AdminData = {
    name: string;
    password: string;
};

const { teams, admins }: { teams: TeamData[]; admins: AdminData[] } =
    await Bun.file("secrets.json").json();
const admin_map = new Map(admins.map(({ name, password }) => [name, password]));
const team_list = teams.map(({ team, password: _ }) => team);
// For indirection ig
const last_match: MatchCandidate = { red: ["", "", ""], blue: ["", "", ""] };

const app = new Elysia()
    .use(
        jwt({
            name: "jwt",
            secret: process.env.JWT_SECRET!,
        }),
    )
    .use(
        cors({
            origin: "http://localhost:5173",
            credentials: true,
        }),
    )
    .decorate("teams", team_list)
    .decorate("admins", admin_map)
    .decorate("logger", new Logger())
    .decorate("sockets", new Set<ServerWebSocket<any>>())
    .decorate("queue", new TeamQueue(team_list))
    .decorate("match", last_match)
    .resolve(({ sockets }) => {
        return {
            broadcast: (message: { type: string; team: string }) => {
                for (const ws of sockets) {
                    ws.send(JSON.stringify(message));
                }
            },
        };
    })
    .post(
        "/login",
        async ({
            jwt,
            body: { team: name, password },
            admins,
            cookie: { auth },
        }) => {
            const real_password = admins.get(name);
            if (!real_password) {
                return status(400);
            }

            if (real_password != password) {
                return status(400);
            }

            const value = await jwt.sign({ team: name });

            auth.set({
                value,
                httpOnly: true,
                secure: false,
                sameSite: "lax", // TODO set to 'none' in prod
                maxAge: 7 * 86400,
                path: "/",
            });
        },
        {
            body: t.Object({
                team: t.String(),
                password: t.String(),
            }),
            cookie: t.Cookie({
                auth: t.Optional(t.String()),
            }),
        },
    )
    .group("/api", (app) => {
        return app

            .get("/health", () => "Health")
            .post(
                "/join_queue/:team",
                async ({
                    body: { team },
                    queue,
                    teams,
                    logger,
                    broadcast,
                    jwt,
                    cookie: { auth },
                }) => {
                    console.log("Attecyting to join");
                    if (!teams.includes(team)) {
                        return status(204);
                    }
                    const token = await jwt.verify(auth.value as string);
                    if (!token) {
                        return status(401, "Invalid Auth");
                    }
                    // const team = token.team as string;

                    const added = queue.queue_team(team);
                    if (!added) {
                        logger.warn(`Team ${team} Attempted To Join`);
                        return status(204);
                    }

                    broadcast({ type: "joined_queue", team });
                    logger.info(`Team ${team} Joined`);
                    logger.info(`New Queue: ${queue.waiting_teams}`);

                    return status(200);
                },
                {
                    body: t.Object({
                        team: t.String(),
                    }),
                },
            )
            .post(
                "/leave_queue/:team",
                async ({
                    body: { team },
                    jwt,
                    cookie: { auth },
                    queue,
                    teams,
                    logger,
                    broadcast,
                }) => {
                    if (!teams.includes(team)) {
                        return status(204);
                    }

                    const token = await jwt.verify(auth.value as string);
                    if (!token) {
                        return status(401, "Invalid Auth");
                    }
                    // const team = token.team as string;
                    //

                    const removed = queue.remove_team(team);
                    if (!removed) {
                        logger.warn(`Team ${team} Attempted To Leave`);
                        return status(204);
                    }

                    broadcast({ type: "left_queue", team });
                    logger.info(`Team ${team} Left`);
                    return status(200);
                },
                {
                    body: t.Object({
                        team: t.String(),
                    }),
                },
            )
            .get("/get_queue", ({ queue }) => {
                return queue.waiting_teams;
            })
            .get("/new_match", ({ queue, logger, match }) => {
                const new_match = queue.new_match();
                if (!new_match) {
                    return status(204);
                }

                logger.info(`\x1b[31mNew Match Queued:\x1b`);
                logger.red(`Red: ${new_match?.red}`);
                logger.blue(`Blue: ${new_match?.blue}`);

                match.red = new_match.red;
                match.blue = new_match.blue;

                return new_match;
            })
            .get("/get_match", ({ match }) => {
                if (!match) {
                    return status(204);
                }

                return match;
            })
            .get(
                "/me",
                async ({ jwt, cookie: { auth } }) => {
                    const token = auth.value;
                    if (!token) {
                        return status(401, "No Auth Token Provided");
                    }
                    const payload = await jwt.verify(token as string);

                    if (!payload) {
                        return status(401, "Invalid Auth Token");
                    }

                    return {
                        team: payload.team,
                    };
                },
                {
                    cookie: t.Cookie({
                        auth: t.Optional(t.String()),
                    }),
                },
            );
    })
    .ws("/ws", {
        open(ws) {
            const { logger, broadcast: _, sockets } = ws.data;

            logger.info(`Team ${ws.id} Connected`);
            sockets.add(ws.raw as ServerWebSocket<any>);
        },

        async message(ws, message) {
            const {
                logger,
                broadcast,
                queue,
                teams,
                jwt,
                cookie: { auth },
            } = ws.data;

            if (message == "ping") {
                ws.send("pong");
                return;
            }

            const token = await jwt.verify(auth.value as string);
            if (!token) {
                return status(401, "Invalid Auth");
            }

            let { type, team } = message as {
                type: string;
                team: string;
            };
            if (!teams.includes(team)) {
                console.log(teams);

                return status(204);
            }

            if (type == "join") {
                let queued = queue.queue_team(team);
                if (queued) {
                    broadcast({ type: "joined_queue", team });
                    logger.info(`Team ${team} Joined Queue`);
                    return;
                }

                logger.warn(`Team ${team} Tried To Joined Queue`);
            } else if (type == "leave") {
                let removed = queue.remove_team(team);
                if (removed) {
                    broadcast({ type: "left_queue", team });
                    logger.warn(`Team ${team} Left Queue`);
                    return;
                }

                logger.error(`Team ${team} Tried To Leave Queue`);
            } else {
                ws.data.logger.error(
                    `Team ${team} Attempted to: ${type}. Unsure of message type.`,
                );
            }
        },
        close(ws) {
            ws.data.sockets.delete(ws.raw as ServerWebSocket<any>);
        },
    })
    // .use(staticPlugin({ assets: "frontend/queue/dist", prefix: "/app" }))
    .listen({ port: 3003, hostname: "0.0.0.0" });

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
