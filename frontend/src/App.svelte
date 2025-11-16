<script lang="ts">
    import { treaty } from "@elysiajs/eden"
    import type { App } from "../../src/index.ts"

    const app = treaty<App>('localhost:3000')

    let queue: string[] = $state([])
    let team = $state("")

    async function join_queue() {
        await app.api.join_queue({team}).post()
        await get_queue()
    }
    async function leave_queue() {
        await app.api.leave_queue({team}).post()
        await get_queue()
    }
    async function get_queue() {
        console.log("get_queue")
        const response = await app.api.get_queue.get()
        const new_queue = response.data
        if (response.status != 200 || !new_queue) {
            console.warn("Get Queue Failed")
            return
        }
        queue = new_queue;
    }

    // const loop = async () => {setTimeout(get_queue, 500); loop()}
    // loop()
</script>

<div class="grid outline gap-2 p-2 rounded">
    <input type="text" bind:value={team} class="m-2 outline p-2">
    <div>
        <button onclick={join_queue}>Join Queue</button>
        <button onclick={leave_queue}>Leave Queue</button>
    </div>

    <div class="flex flex-col m-2 gap-2">
        {#each queue as team}
            <div id="item">{team}</div>
        {/each}
    </div>
</div>





