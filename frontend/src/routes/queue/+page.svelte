<script lang="ts">
    import type { MatchCandidate } from "../../../../src/team_queue"
    import {api } from "$lib/client"
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";

    let team = $state("")
    let queue: string[] = $state([])
    let match: MatchCandidate | undefined = $state(undefined)
    let match_key = $state("")

    onMount(async () => {
        const res = await api.me.get()
        if (res.status == 200) {
            team = res.data?.team?.toString() ?? ""
        } else {
            console.error(`Not Logged In ${res}`)
        }
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
        if (message.data == "pong") {
            return
        }

        if (message.data.type == "new_match") {
            const { alliances, key}: {alliances: MatchCandidate, key: string} = JSON.parse(message.data)
            alliances.red.forEach(remove_team)
            alliances.blue.forEach(remove_team)
            match = alliances
            match_key = key

            return
        }


        const { type, team } = JSON.parse(message.data);
        console.log(`Received ${type} ${team}`)
        if (type == "joined_queue") {
            queue.push(team)
        } else if (type == "left_queue") {
            remove_team(team)
                    }     })

    function remove_team(team: string) {
            const i = queue.indexOf(team);
            if (i == -1) {
                console.warn(`Attempted to remove: team ${team} who was not in queue`)
                return
            }
            queue.splice(i, 1)

    }


    async function join_queue() {
        ws.send(JSON.stringify({type: "join"}))
        console.log("sent");
        // await app.api.join_queue({team}).post()
        // await get_queue()
    }

    async function leave_queue() {
        ws.send(JSON.stringify({type: "leave"}))

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

<div class="flex-2 m-2 place-items-center">
<div class="">
    {#if team === ""}
        <button onclick={() => goto("/login")}>Login</button>
    {:else}
        <div>Welcome captain of team {team}</div>
    {/if}
</div>

<div class="grid outline gap-2 p-2 rounded">
    <div>{match?.red ?? ""}</div>
    <div>{match?.blue ?? ""}</div>
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





</div>

