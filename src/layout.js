const ratio = 0.61803

const fmt = function (num) {
  const round = (x) => Math.round(x * 10) / 10
  if (num > 1000000) {
    return [round(num / 1000000), 'm']
  }
  if (num > 1000) {
    return [round(num / 1000), 'k']
  }
  return [num.toLocaleString(), '']
}

const layout = function (arr) {
  if (!arr.length) {
    return []
  }
  // find max
  let max = arr[0].value
  arr.forEach((o) => {
    if (o.value > max) {
      max = o.value
    }
  })
  // add percentage of max
  arr.forEach((o) => {
    let percentage = (o.value / max) * 100
    o.height = percentage
    o.width = percentage * ratio
    o.percentage = parseInt(percentage, 10)
    o.fmt = fmt(o.value)
  })
  return arr
}
export default layout
