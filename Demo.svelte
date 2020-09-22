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
  .mt4 {
    margin-top: 8rem;
  }
</style>

<div class="main m4">
  <h2>somehow-scale</h2>
  <div>
    a svelte infographic component -
    <a href="https://github.com/spencermountain/somehow-scale" class="m4">github</a>
  </div>
  <div class="mt4">
    <Horizontal min={100} max={1700} bind:value={right} />
    <Scale height={val}>
      <Thing color="blue" bind:value={left} label="small blue" />
      <Thing color="green" value={right} label="medium green" />
    </Scale>
  </div>

  <div class="mt4">
    <Horizontal min={100} max={1700} value={80} />
    <Scale height={val}>
      <Thing color="red" value={22} label="2nd red" />
      <Thing color="green" value={38} label="medium green" />
      <Thing color="mud" value={18} label="mud" />
    </Scale>
  </div>
</div>
