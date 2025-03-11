<script lang="ts">
	type Props = {
		mapUrl: string | undefined;
		imageInputName: string | undefined;
		formId: string | undefined;
		handleMapFileLoading: (
			event: Event & {
				currentTarget: EventTarget & HTMLInputElement;
			}
		) => void;
	};

	let { mapUrl, formId, imageInputName, handleMapFileLoading }: Props = $props();
</script>

<div style:display={mapUrl === undefined ? 'flex' : 'none'} class="load-image-section">
	<article>
		<label class="flex items-center gap-2">
			<i class="i-carbon-upload block w5 h5"></i>

			Charger une image

			<input
				type="file"
				name={imageInputName}
				form={formId}
				style="display: none;"
				accept="image/*"
				oninput={handleMapFileLoading}
			/>
		</label>
	</article>
</div>

<style>
	.load-image-section {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
