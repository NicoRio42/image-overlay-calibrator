<script lang="ts">
	import type { Style } from './style.model.js';

	type Props = {
		selectedStyle: Style;
		styles: [Style, ...Style[]];
		setStyle: (style: Style) => void;
	};

	let { selectedStyle, styles, setStyle }: Props = $props();
</script>

<div class="styles-dropdown">
	<button type="button"> {selectedStyle.label} </button>

	<article>
		<ul>
			{#each styles as style}
				<li>
					<button onclick={() => setStyle(style)} type="button">
						{style.label}
					</button>
				</li>
			{/each}
		</ul>
	</article>
</div>

<style>
	.styles-dropdown {
		position: absolute;
		top: 1rem;
		right: 1rem;
	}
</style>
