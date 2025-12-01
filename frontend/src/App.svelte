<script lang="ts">
    import { treaty } from "@elysiajs/eden"
    import type { App } from "../../src/index"
    import type { MatchCandidate } from "../../src/team_queue"

    const app = treaty<App>('localhost:3000/')

    const ws = new WebSocket('ws://localhost:3000/ws')

    ws.addEventListener("open", () => {
        console.log("CONNECTED")

        setInterval(() => {
            // console.log(`SENT: ping`);
            ws.send("ping");
          }, 1000);
    })

    ws.addEventListener("error", (e) => {
      console.error(`WS ERROR: ${e}`);
    });


    let queue: string[] = $state([])
    let team = $state("")
    let match: MatchCandidate | undefined = $state(undefined)

    ws.addEventListener("message", (message) => {
        console.log("Received")
        const {type, team} = message.data;
        if (type == "joined_queue") {
            queue.push(team)
        } else if (type == "left_queue") {
            const i = queue.indexOf(team);
            if (i == -1) {
                console.warn(`Attempted to remove: team ${team} who was not in queue`)
                return
            }
            queue.splice(i, 1)
        }
    })


    async function join_queue() {
        ws.send(JSON.stringify({type: "join", team }))
        console.log("sent");
        // await app.api.join_queue({team}).post()
        // await get_queue()
    }

    async function leave_queue() {
        ws.send(JSON.stringify({type: "leave", team }))

        // await app.api.leave_queue({team}).post()
        // await get_queue()
    }

    async function get_queue() {
        const response = await app.api.get_queue.get()
        const new_queue = response.data
        if (response.status != 200 || !new_queue) {
            console.warn("Get Queue Failed")
            return
        }
        queue = new_queue;
    }

    async function new_match() {
        const response = await app.api.new_match.get()
        if (response.status == 204) {
            return
        }

        const new_match = response.data as MatchCandidate
        const remove_team = (team: string) => {
            const i = queue.indexOf(team)
            if (i == -1) return
            queue.splice(i, 1)
        }
        new_match.red.forEach(remove_team)
        new_match.blue.forEach(remove_team)

        match = new_match
    }
</script>

<div class="grid outline gap-2 p-2 rounded">
    <div>{match?.red ?? ""}</div>
    <div>{match?.blue ?? ""}</div>
    <input type="text" bind:value={team} class="m-2 outline p-2">
    <div>
        <button onclick={join_queue}>Join Queue</button>
        <button onclick={leave_queue}>Leave Queue</button>
        <button onclick={new_match}>New Match</button>
    </div>

    <div class="flex flex-col m-2 gap-2">
        {#each queue as team}
            <div id="item">{team}</div>
        {/each}
    </div>
</div>





