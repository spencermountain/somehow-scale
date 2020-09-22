<script>
  import { Scale, Thing } from './src'
  import { Horizontal } from '/Users/spencer/mountain/somehow-slider/src/index.mjs'
  let left = 120
  let right = 50
  let height = 500
  setTimeout(() => {
    left = 700
  }, 1500)
  let val = 300
</script>

<style>
  .container {
    height: 800px;
  }
</style>

<div class="main m4">
  <h2>somehow-scale</h2>
  <div>
    a svelte infographic component -
    <a href="https://github.com/spencermountain/somehow-scale" class="m4">github</a>
  </div>
  <div class="mt4 container">
    <Horizontal min={100} max={1700} bind:value={right} />
    <Scale height={val}>
      <Thing color="blue" bind:value={left} label="small blue" />
      <Thing color="green" value={right} label="medium green" />
    </Scale>
  </div>
</div>
