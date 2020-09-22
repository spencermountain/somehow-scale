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
      <Thing color="blue" value="84" label="some blue" />
      <Thing color="green" value="10123" label="green and blue and red and yellow label" />
      <Thing color="red" value="2904" label="red guy" />
    </Scale>
  </div>
</div>
