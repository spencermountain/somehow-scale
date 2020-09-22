<script>
  import { things } from './store'
  import { afterUpdate } from 'svelte'
  import c from 'spencer-color'
  import uuid from './uuid'

  export let color = 'steelblue'
  export let label = ''
  export let value = 0
  export let aspect = ''
  export let id = uuid()

  let colors = c.colors
  color = colors[color] || color
  $things.push({
    color: color,
    id: id,
    aspect: aspect,
    value: Number(value),
    label: label
  })

  afterUpdate(() => {
    things.update(arr => {
      let o = arr.find(o => o.id === id)
      o.value = value
      return arr
    })
  })
</script>
