import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params: _ }) => {
    return redirect(301, "/queue");
};
