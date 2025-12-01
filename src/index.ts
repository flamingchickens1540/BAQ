import { Elysia, status } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { TeamQueue } from "./team_queue";
import Logger from "./logger";
import { ServerWebSocket } from "bun";

const app = new Elysia()
    .decorate("logger", new Logger())
    .decorate("sockets", new Set<ServerWebSocket<any>>())
    .decorate("queue", new TeamQueue())
    .resolve(({ sockets, queue }) => {
        return {
            broadcast: (message: { type: string; team: string }) => {
                for (const ws of sockets) {
                    console.log(`Message: ${JSON.stringify(message)}`);
                    ws.send(JSON.stringify(message));
                }
            },
        };
    })
    .group("/api", (app) => {
        return app
            .get("/health", () => "Health")
            .post(
                "/join_queue/:team",
                ({ params: { team }, queue, logger, broadcast }) => {
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
                ({ params: { team }, queue, logger, broadcast }) => {
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
            .get("/get_queue", ({ queue, sockets }) => {
                console.log(sockets);
                return queue.waiting_teams;
            })
            .get("/new_match", ({ queue, logger }) => {
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
            const { logger, broadcast: _, sockets } = ws.data;

            logger.info(`Team ${ws.id} Connected`);
            console.log(`${JSON.stringify(sockets)}`);
            sockets.add(ws.raw as ServerWebSocket<any>);
        },
        message(ws, message) {
            const { logger, broadcast, queue } = ws.data;

            if (message == "ping") {
                ws.send("pong");
                return;
            }
            let { type, team } = message as {
                type: string;
                team: string;
            };

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
            ws.data.logger.warn(`Team ${ws.id} Left`);
            ws.data.sockets.delete(ws.raw as ServerWebSocket<any>);
        },
    })
    .use(staticPlugin({ assets: "frontend/dist", prefix: "/" }))
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
