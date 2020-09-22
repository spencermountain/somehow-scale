<script>
  import { setContext, onMount } from 'svelte'
  import { things } from './store'
  import layout from './layout'
  export let height = 400

  let arr = []
  onMount(() => {
    arr = layout($things, height)
  })
</script>

<style>
  .container {
    height: 100%;
    font-size: 'Tajawal';
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    text-align: center;
    flex-wrap: wrap;
    align-self: stretch;
  }

  .bar {
    width: 100px;
    height: 100px;
    position: relative;
    border-radius: 2px;
    box-shadow: 2px 2px 8px 0px rgba(0, 0, 0, 0.2);
    align-self: center;
  }
  .bar:hover {
    box-shadow: 2px 2px 8px 0px steelblue;
  }
  .box {
    position: relative;
    box-sizing: border-box;
    padding: 2rem;
    display: flex;
    height: 100%;
    flex: 1;
    flex-direction: column;
    /* border: 1px solid grey; */
    justify-content: flex-end;
    align-items: center;
  }
  .label {
    position: relative;
    color: #b3b7ba;
    max-width: 200px;
    font-size: 12px;
  }
  .value {
    position: relative;
    color: #949a9e;
    font-size: 34px;
    justify-content: center;
    display: flex;
    align-items: first baseline;
  }
  .line {
    width: 1px;
    height: 100%;
    background-color: #b3b7ba;
    margin: 7px;
  }
  .side {
    flex: 1;
    color: #b3b7ba;
    max-width: 50px;
    font-size: 12px;
  }
  .row {
    margin-top: 10px;
    margin-bottom: 10px;
    display: flex;
    height: 20px;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    flex-wrap: nowrap;
  }
  .unit {
    font-size: 18px;
    color: #b3b7ba;
    /* color: steelblue; */
  }
</style>

<div class="container" style="min-height:{height}px;">

  {#each arr as bar}
    <div class="box">
      <div class="label">{bar.label}</div>
      <div class="value">
        <span>{bar.fmt[0]}</span>
        <span class="unit">{bar.fmt[1]}</span>
      </div>
      <div class="row">
        <div class="side" />
        <div class="line" />
        <div class="side">{bar.percentage !== 100 ? bar.percentage + '%' : ''}</div>
      </div>
      <div
        class="bar"
        style="background-color:{bar.color}; width:{bar.width}%; height:{bar.height}%;" />
    </div>
  {/each}

</div>
<slot />
