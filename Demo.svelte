<script>
  import { Scale, Thing } from './src'
</script>

<style>
  .container {
    /* border: 1px solid grey; */
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
    <Scale>
      <Thing color="blue" value="200" label="small blue" />
      <Thing color="blue" value="2500" label="medium blue" />
      <Thing color="green" value="5000" label="big green" />
    </Scale>
  </div>
</div>
