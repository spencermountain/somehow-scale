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
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    text-align: center;
    flex-wrap: nowrap;
    align-self: stretch;
  }

  .box {
    position: relative;
    box-sizing: border-box;
    padding: 10px;
    display: flex;
    height: 100%;
    flex: 1;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
  }
  .label {
    position: relative;
    color: #b3b7ba;
    max-width: 200px;
    font-size: 11px;
    margin-top: 4px;
    text-align: right;
    margin-right: 45px;
  }
  .value {
    position: relative;
    color: #949a9e;
    font-size: 20px;
    margin: 7px;
    opacity: 0.8;
    margin-right: 45px;
    justify-content: center;
    display: flex;
    align-items: first baseline;
  }
  .num {
    opacity: 1;
  }
  .unit {
    font-size: 12px;
    margin-left: 1px;
    color: #949a9e;
  }
  /* .dec {
    position: relative;
    font-size: 14px;
    color: #949a9e;
    margin-left: 1px;
    color: #b3b7ba;
    top: 3px;
  } */
  /* the actual bar */
  .sized {
    position: relative;
    width: 100%;
    align-self: center;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    flex-wrap: nowrap;
    /* border-bottom: 1px dashed lightgrey; */
  }
  .axis {
    width: 6px;
    margin-left: 7px;
    border-left: 1px dashed lightgrey;
    border-top: 1px dashed lightgrey;
    border-bottom: 1px dashed lightgrey;
    height: 100%;
  }
  .beside {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-start;
    position: relative;
    margin-left: 5px;
    box-sizing: border-box;
    padding-top: 12px;
    padding-bottom: 12px;
    height: 100%;
    width: 45px;
  }
  .percent {
    color: #b3b7ba;
    font-size: 12px;
    width: 40px;
  }
  .inside {
    color: #fbfbfb;
  }
  .bar {
    /* min-width: 100px; */
    /* flex: 1; */
    display: flex;
    box-sizing: border-box;
    padding: 2%;
    justify-content: flex-end;
    align-items: flex-end;
    border-radius: 2px;
    box-shadow: 2px 2px 8px 0px rgba(0, 0, 0, 0.2);
  }
  .bar:hover {
    box-shadow: 2px 2px 8px 0px steelblue;
  }
  .ghost {
    height: 100%;
    width: 25%;
    /* border-radius: 3px; */
    /* border: 1px dotted lightgrey; */
  }
</style>

<div class="container" style="min-height:{height}px;">

  {#each arr as bar}
    <div class="box">
      <!-- top number -->
      <div class="value" style="border-bottom: 2px solid {bar.color};">
        <span class="num">{bar.fmt[0]}</span>
        <span class="unit">{bar.fmt[2] || ''}</span>
      </div>
      <div class="sized" style="height:{bar.height}%; ">
        {#if bar.rescaled}
          <div class="ghost" />
          <div class="ghost" />
          <div class="ghost" />
        {/if}
        <div
          class="bar"
          style="background-color:{bar.color}; width:{bar.width}; max-width:{bar.width};
          height:100%;">
          {#if bar.rescaled}
            <div class="inside">{bar.percentage !== 100 ? bar.percentage + '%' : ''}</div>
          {/if}
        </div>

        <div class="beside">
          {#if bar.percentage !== 100 && bar.rescaled !== true}
            <div class="axis" />
            <div class="percent">{bar.percentage !== 100 ? bar.percentage + '%' : ''}</div>
          {/if}
        </div>
      </div>
      <!-- bottom label -->
      <div class="label">{bar.label}</div>
    </div>
  {/each}

</div>
<slot />
