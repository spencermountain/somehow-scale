<div align="center">
  <div><b>somehow-scale</b></div>
  <img src="https://user-images.githubusercontent.com/399657/68222691-6597f180-ffb9-11e9-8a32-a7f38aa8bded.png"/>
  <div>— part of <a href="https://github.com/spencermountain/somehow">somehow</a> —</div>
  <div>svelte infographics</div>
  <div align="center">
    <sub>
      by
      <a href="https://spencermounta.in/">Spencer Kelly</a> 
    </sub>
  </div>
</div>
<div align="right">
  <a href="https://npmjs.org/package/somehow-scale">
    <img src="https://img.shields.io/npm/v/somehow-scale.svg?style=flat-square" />
  </a>
</div>
<img height="25px" src="https://user-images.githubusercontent.com/399657/68221862-17ceb980-ffb8-11e9-87d4-7b30b6488f16.png"/>

WIP responsive proportion infographic component

```html
<script>
  import { Scale, Thing } from 'somehow-scale'
</script>

<Scale>
  <Thing color="blue" value="200" label="small blue" />
  <Thing color="blue" value="2500" label="medium blue" />
  <Thing color="green" value="5000" label="big green" />
</Scale>
```

![image](https://user-images.githubusercontent.com/399657/93920751-99692c00-fcdd-11ea-9683-fbe47dbe6d54.png)

unlike in a bar-chart, small values will be sub-divided vertically, so they are properly visible.

MIT
