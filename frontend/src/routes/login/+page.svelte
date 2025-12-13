<script lang="ts">
	import { goto } from "$app/navigation";
	import { backend } from "$lib/client";


    let team = $state("")
    let password = $state("")

    async function login() {
        const res = await backend.login.post({ team: team.toLowerCase(), password })
        if (res.status != 200) {
            console.error("Failed to login", res)
            return
        }
        goto("/queue")
    }
</script>


<div class="grid place-items-center rounded outline p-2 m-56 w-screen gap-2">
    <h1>Login</h1>

    <div class="grid grid-rows-2 place-items-center">
        <span>Name</span>
        <input type="text" bind:value={team}>
    </div>
    <div class="grid grid-rows-2 place-items-center">
        <span>Password</span>
        <input type="password" bind:value={password}>
    </div>
    <button onclick={login}>Login</button>
</div>
