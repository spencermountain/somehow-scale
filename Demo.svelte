<script>
  import { Scale, Thing } from './src'
</script>

<style>

</style>

<div class="main m4">
  <h2>somehow-scale</h2>
  <div>
    a svelte infographic component -
    <a href="https://github.com/spencermountain/somehow-scale" class="m4">github</a>
  </div>
  <div class="mt4">
    <Scale>
      <Thing color="blue" value="19" />
      <Thing color="green" value="10" label="green label" />
    </Scale>
  </div>
</div>
