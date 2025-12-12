<script lang="ts">
    import type { MatchCandidate } from "../../../../src/team_queue"
    import {api } from "$lib/client"
    import {LocalStore, localStore} from "$lib/localStore.svelte"
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";

    let team = $state("")
    let name = $state("")
    let queue: string[] = $state([])
    let match: LocalStore<MatchCandidate | undefined> = $state(localStore("queue_match", undefined))
    let match_key = $state("")

    onMount(async () => {
        const res = await api.me.get()
        if (res.status == 200) {
            name = res.data?.team?.toString() ?? ""
        } else {
            console.error(`Not Logged In ${res}`)
        }
        //
        const queue_res = await api.get_queue.get()
        if (queue_res.status != 200) {
            console.error("Failed to get current queue")
            return
        }

        queue = queue_res.data ?? []
    })

    const ws = new WebSocket('ws://localhost:3000/ws')

    ws.addEventListener("open", () => {
        console.log("CONNECTED")

        setInterval(() => {
            ws.send("ping");
          }, 1000);
    })

    ws.addEventListener("error", (e) => {
      console.error(`WS ERROR: ${e}`);
    });

    ws.addEventListener("message", (message) => {
        if(!message) {
            return
        }
        if (message.data == "pong") {
            return
        }

        if (message.data.type == "new_match") {
            const { alliances, key}: {alliances: MatchCandidate, key: string} = JSON.parse(message.data)
            alliances.red.forEach(remove_team)
            alliances.blue.forEach(remove_team)
            match.value = alliances
            match_key = key

            return
        }


        const { type, team: new_team } = JSON.parse(message.data);
        console.log(`Received ${type} ${new_team}`)
        if (type == undefined) {
            alert("Team not at event");
            return
        }
        if (type == "joined_queue") {
            queue.push(new_team)
            team = ""
        } else if (type == "left_queue") {
            remove_team(new_team)
            team = ""
        }
    })

        function remove_team(team: string) {
            const i = queue.indexOf(team);
            if (i == -1) {
                console.warn(`Attempted to remove: team ${team} who was not in queue`)
                return
            }
            queue.splice(i, 1)

    }


    async function join_queue() {
        ws.send(JSON.stringify({ type: "join", team }))
        // await app.api.join_queue({team}).post()
        // await get_queue()
    }

    async function leave_queue() {
        ws.send(JSON.stringify({ type: "leave", team }))

        // await app.api.leave_queue({team}).post()
        // await get_queue()
    }

    async function get_queue() {
        const response = await api.get_queue.get()
        const new_queue = response.data
        if (response.status != 200 || !new_queue) {
            console.warn("Get Queue Failed")
            return
        }
        queue = new_queue;
    }

    async function new_match() {
        const response = await api.new_match.get()
        if (response.status == 204 || response.error) {
            console.error(`Response ${JSON.stringify(response)}`)
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

        match.value = new_match
    }
</script>

<div class="flex-2 m-2 place-content-center">
    <div class="font-bold text-center">
        {#if name === ""}
            <button onclick={() => goto("/login")}>Login</button>
        {:else}
            <div>Welcome {name}</div>
        {/if}
    </div>

    <div class="grid outline gap-2 p-2 rounded">
        <h2 class="text-center">Current Match</h2>
        <div class="grid grid-cols-2 grid-rows-3 grid-flow-col gap-2">
            {#each match?.value?.red ?? [] as team}
                <div class="item bg-red-400 rounded p-2">{team}</div>
            {/each}
            {#each match?.value?.blue ?? [] as team}
                <div class="item bg-blue-400 rounded p-2">{team}</div>
            {/each}
        </div>
                <input type="text" bind:value={team}/>
        <div class="grid place-content-center gap-2 grid-cols-3">
            <button onclick={join_queue} disabled={team === ""} class="disabled:pointer-events-none disabled:opacity-30">Join Queue</button>
            <button onclick={leave_queue} disabled={team === ""} class="disabled:pointer-events-none disabled:opacity-30">Leave Queue</button>
            <button onclick={new_match} disabled={queue.length < 6} class="disabled:pointer-events-none disabled:opacity-30">New Match</button>
        </div>

        <div class="flex flex-col m-2 gap-2">
            {#each queue as team}
                <div id="item">{team}</div>
            {/each}
        </div>
    </div>
</div>

