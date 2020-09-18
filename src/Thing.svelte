<script>
  import { things } from './store'
  export let color = 'steelblue'
  export let label = ''
  export let value = 0

  import c from 'spencer-color'
  let colors = c.colors
  color = colors[color] || color

  $things.push({
    color: color,
    value: Number(value),
    label: label
  })
</script>

<div />
