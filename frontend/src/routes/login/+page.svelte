<script lang="ts">
	import { goto } from "$app/navigation";
	import { backend } from "$lib/client";


    let team = $state("")
    let password = $state("")

    async function login() {
        const res = await backend.login.post({team, password})
        if (res.status != 200) {
            console.error("Failed to login", res)
            return
        }
        res.data.
        goto("/queue")
    }
</script>


<div>
    <h1>Login</h1>

    <span>Team Number</span>
    <input type="text" bind:value={team}>
    <span>Password</span>
    <input type="text" bind:value={password}>

    <button onclick={login}>Login</button>
</div>
