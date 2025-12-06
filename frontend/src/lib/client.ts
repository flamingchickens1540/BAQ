import { treaty } from "@elysiajs/eden";
import { App } from "../../../src/index";
import { PUBLIC_API_ROUTE } from "$env/static/public";

export const backend = treaty<App>(`${BACKEND_ROUTE}`, {
    headers: () => {
        const token = localStorage.getItem("token") || "";
        return { authorization: `Bearer ${token}` };
    },
});

export const api = backend.api;
