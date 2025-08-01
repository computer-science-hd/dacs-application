<script lang="ts">
	import { P } from 'flowbite-svelte';
	import PositiveNumberInput from './PositiveNumberInput.svelte';

	import { data } from '$lib/store/store';

</script>

<div class="flex gap-4 flex-col">
	<P>
		As the admission regulations require subject-specific knowledge of at least 56 ECTS credit points in computer science and 16 ECTS credit points in mathematics, your credits (as listed in your transcript and entered in this form) are converted automatically to ECTS. For this conversion, you have to enter the <b>standard period</b> of study in months (not the time that you needed to finish your individual study) of your bachelor and the <b>standard number</b> of credits points that have to be earned for your bachelor. <b>If your transcript already declares credits in ECTS, set the standard period to 36 months and standard number of credit points to 180.</b>
	</P>
	<div class="flex gap-8 items-center">
		<div class="w-120"><P class="font-bold">Standard period of your study program in months (not the time it took you to finish your studies)</P></div>
		<PositiveNumberInput bind:value={$data["extentDetails"]["duration"]} class="w-20 text-2xs text-center" />
	</div>
	<div class="flex gap-8 items-center">
		<div class="w-120"><P class="font-bold">Standard number of credit points required in your study program (no grades, no grade point averages etc., and no additional points)</P></div>
		<PositiveNumberInput bind:value={$data["extentDetails"]["points"]} class="w-20 text-2xs text-center" />
	</div>
</div>
