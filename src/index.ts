import { Elysia, status } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { TeamQueue } from "./team_queue";
import Logger from "./logger";

const app = new Elysia()
    .decorate("logger", new Logger())
    .state("sockets", new Set<any>())
    .derive(({ store: { sockets } }) => {
        return {
            broadcast: (message: { type: string; team: string }) => {
                for (const ws of sockets) {
                    ws.send(JSON.stringify(message));
                }
            },
        };
    })
    .state("queue", new TeamQueue())
    .group("/api", (app) => {
        return app
            .get("/health", () => "Health")
            .post(
                "/join_queue/:team",
                ({ params: { team }, store: { queue }, logger, broadcast }) => {
                    const added = queue.queue_team(team);
                    if (!added) {
                        logger.warn(`Team ${team} Attempted To Join`);
                        return status(204);
                    }

                    broadcast({ type: "joined_queue", team });
                    logger.info(`Team ${team} Joined`);
                    return status(200);
                },
            )
            .post(
                "/leave_queue/:team",
                ({ params: { team }, store: { queue }, logger, broadcast }) => {
                    const removed = queue.remove_team(team);
                    if (!removed) {
                        logger.warn(`Team ${team} Attempted To Leave`);
                        return status(204);
                    }

                    broadcast({ type: "left_queue", team });
                    logger.info(`Team ${team} Left`);
                    return status(200);
                },
            )
            .get("/get_queue", ({ store: { queue } }) => {
                return queue.waiting_teams;
            })
            .get("/new_match", ({ store: { queue }, logger }) => {
                const new_match = queue.new_match();
                if (!new_match) {
                    return status(204);
                }

                logger.info(`\x1b[31mNew Match Queued:\x1b`);
                logger.red(`Red: ${new_match?.red}`);
                logger.blue(`Blue: ${new_match?.blue}`);

                return new_match;
            });
    })
    .ws("/ws", {
        open(ws) {
            const {
                logger,
                broadcast: _,
                store: { sockets },
            } = ws.data;

            logger.info(`Team ${ws.id} Connected`);
            console.log(`${JSON.stringify(sockets)}`);
            sockets.add(ws);
        },
        message(ws, message) {
            const {
                logger,
                broadcast,
                store: { sockets },
            } = ws.data;

            console.log(`message: ${JSON.stringify(message)}`);
            if (message == "ping") {
                ws.pong();
                return;
            }
            let { type, team } = message as {
                type: string;
                team: string;
            };

            if (type == "join") {
                let queued = ws.data.store.queue.queue_team(team);
                if (queued) {
                    ws.data.broadcast({ type: "joined_queue", team });
                    ws.data.logger.info(`Team ${team} Joined Queue`);
                    return;
                }

                ws.data.logger.warn(`Team ${team} Tried To Joined Queue`);
            } else if (type == "leave") {
                let removed = ws.data.store.queue.remove_team(team);
                if (removed) {
                    ws.data.broadcast({ type: "left_queue", team });
                    ws.data.logger.warn(`Team ${team} Left Queue`);
                    return;
                }

                ws.data.logger.error(`Team ${team} Tried To Leave Queue`);
            } else {
                ws.data.logger.error(
                    `Team ${team} Attempted to: ${type}. Unsure of message type.`,
                );
            }
        },
        close(ws) {
            ws.data.logger.warn(`Team ${ws.id} Left`);
            ws.data.store.sockets.delete(ws.raw);
        },
    })
    .use(staticPlugin({ assets: "frontend/dist", prefix: "/" }))
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
