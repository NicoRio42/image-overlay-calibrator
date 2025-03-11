<script lang="ts">
	import { type Snippet } from 'svelte';

	interface Props {
		isDrawingDisabled: boolean;
		canDraw: boolean;
		onDraw: () => void;
		onDelete: () => void;
		children?: Snippet;
	}

	let { isDrawingDisabled, canDraw, onDraw, onDelete, children }: Props = $props();
</script>

<li class="list-none flex items-center gap2">
	{@render children?.()}

	{#if canDraw}
		<button
			type="button"
			disabled={isDrawingDisabled}
			onclick={() => onDraw()}
			class="flex items-center p1.5 gap1 m0"
		>
			<i class="i-carbon-edit block w5 h5"></i>

			Dessiner
		</button>
	{:else}
		<button type="button" class="flex items-center p1.5 gap1 m0" onclick={() => onDelete()}>
			<i class="i-carbon-trash-can block w5 h5"></i>

			Supprimer
		</button>
	{/if}
</li>
