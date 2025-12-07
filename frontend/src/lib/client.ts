import { treaty } from "@elysiajs/eden";
import type { App } from "../../../src/index";
import dotenv from "dotenv";

export const backend = treaty<App>(`${import.meta.env.VITE_API_ROUTE}`, {
    headers: () => {
        const token = localStorage.getItem("token") || "";
        return { authorization: `Bearer ${token}` };
    },
    fetch: {
        credentials: "include",
    },
});

export const api = backend.api;
